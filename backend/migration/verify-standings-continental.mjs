// Offline verification of the Continental (flat/non-grouped) standings
// aggregation - no D1 needed. Covers only the branch calculateTable() in
// ContinentalEurope.html takes when no specific season is selected (no
// season, or an era filter) - the grouped-by-competition-phase branch
// (a specific season selected) isn't replicated here; see
// standings-aggregate.mjs's header comment.
//
// Ground truth: Arsenal FC's full Champions League match count (241
// total, 227 non-qualifier + 14 qualifier) was already verified earlier
// in this migration directly against the live team-history API - reused
// here as an independent check that aggregation-from-scratch agrees with
// that already-proven number.
//
// Usage: npm install && node verify-standings-continental.mjs

import { collectAllMatches } from './lib.mjs';
import { aggregateStandings, filterContinentalMatches } from './standings-aggregate.mjs';

function toAggInput(matches) {
    return matches.map(m => ({
        div: m.div, date: m.date, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        isQualifier: m.isQualifier, competitionPhase: m.competitionPhase,
    }));
}

function checkInvariants(label, matchCount, result) {
    const failures = [];
    const sumPlayed = result.standings.reduce((s, r) => s + r.played, 0);
    if (sumPlayed !== matchCount * 2) {
        failures.push(`sum(played)=${sumPlayed}, expected ${matchCount * 2}`);
    }
    for (const row of result.standings) {
        if (row.won + row.drawn + row.lost !== row.played) {
            failures.push(`${row.team}: won+drawn+lost != played`);
        }
        if (row.goalsFor < 0 || row.goalsAgainst < 0 || row.points < 0) {
            failures.push(`${row.team}: negative stat`);
        }
    }
    if (failures.length > 0) {
        console.log(`FAIL [${label}]:`);
        failures.forEach(f => console.log(`  ${f}`));
        return false;
    }
    console.log(`PASS [${label}] - ${result.standings.length} teams, ${matchCount} matches`);
    return true;
}

async function main() {
    console.error('Fetching all gist data (ground truth)...');
    const all = await collectAllMatches({ log: m => console.error(`  ${m}`) });
    const c1 = toAggInput(all.filter(m => m.div === 'C1'));

    let allPassed = true;

    // Check 1: Arsenal FC's total C1 match count, with and without
    // qualifiers, against the already-proven team-history numbers.
    const allC1 = aggregateStandings(c1, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenalAll = allC1.standings.find(r => r.team === 'Arsenal FC');
    console.log('Arsenal FC (all C1, incl. qualifiers):', arsenalAll?.played, 'expected >= 241');
    const check1 = !!arsenalAll && arsenalAll.played >= 241;
    console.log(check1 ? 'PASS [Arsenal FC total >= known 241]' : 'FAIL [Arsenal FC total]');
    allPassed = allPassed && check1;

    const nonQualifiers = filterContinentalMatches(c1, { excludeQualifiers: true });
    const nonQualResult = aggregateStandings(nonQualifiers, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenalNonQual = nonQualResult.standings.find(r => r.team === 'Arsenal FC');
    console.log('Arsenal FC (non-qualifier only):', arsenalNonQual?.played, 'expected >= 227');
    const check2 = !!arsenalNonQual && arsenalNonQual.played >= 227;
    console.log(check2 ? 'PASS [Arsenal FC non-qualifier >= known 227]' : 'FAIL [Arsenal FC non-qualifier]');
    allPassed = allPassed && check2;

    const qualifiersOnly = filterContinentalMatches(c1, { excludeMainStage: true });
    const qualResult = aggregateStandings(qualifiersOnly, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenalQual = qualResult.standings.find(r => r.team === 'Arsenal FC');
    console.log('Arsenal FC (qualifiers only):', arsenalQual?.played, 'expected == 14 (fixed historical seasons, no drift)');
    const check3 = !!arsenalQual && arsenalQual.played === 14;
    console.log(check3 ? 'PASS [Arsenal FC qualifiers-only == known 14]' : 'FAIL [Arsenal FC qualifiers-only]');
    allPassed = allPassed && check3;

    // Sanity: non-qualifier + qualifier-only should equal the unfiltered total exactly.
    const check4 = arsenalAll && arsenalNonQual && arsenalQual && (arsenalNonQual.played + arsenalQual.played === arsenalAll.played);
    console.log(check4 ? 'PASS [non-qualifier + qualifier-only == total]' : 'FAIL [non-qualifier + qualifier-only != total]');
    allPassed = allPassed && check4;

    // Check 2: structural invariants.
    allPassed = checkInvariants('C1 full history, all matches', c1.length, allC1) && allPassed;
    allPassed = checkInvariants('C1 non-qualifier only', nonQualifiers.length, nonQualResult) && allPassed;
    allPassed = checkInvariants('C1 qualifiers only', qualifiersOnly.length, qualResult) && allPassed;

    // Check 3: competition-stage filter (Final) - Arsenal's known 2 Champions League finals.
    const finalsOnly = filterContinentalMatches(c1, { competitionStage: 'Final' });
    const finalsResult = aggregateStandings(finalsOnly, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenalFinals = finalsResult.standings.find(r => r.team === 'Arsenal FC');
    console.log('Arsenal FC (Finals only):', arsenalFinals?.played, 'expected 2');
    const check5 = !!arsenalFinals && arsenalFinals.played === 2;
    console.log(check5 ? 'PASS [Arsenal FC Finals == 2]' : 'FAIL [Arsenal FC Finals]');
    allPassed = allPassed && check5;

    // Check 4: historical point system - pre-1995-07-01 matches should
    // differ in total points between the two systems; post should not.
    const preModern = c1.filter(m => m.date < '1995-07-01');
    const postModern = c1.filter(m => m.date >= '1995-07-01' && m.date < '2000-07-01');
    if (preModern.length > 0) {
        const pre3 = aggregateStandings(preModern, { threePointSystem: true, homeFilter: true, awayFilter: true });
        const pre2 = aggregateStandings(preModern, { threePointSystem: false, homeFilter: true, awayFilter: true });
        const t3 = pre3.standings.reduce((s, r) => s + r.points, 0);
        const t2 = pre2.standings.reduce((s, r) => s + r.points, 0);
        const check6 = t3 !== t2;
        console.log(check6 ? `PASS [pre-1995 differs: 3pt=${t3}, 2pt=${t2}]` : 'FAIL [pre-1995 should differ between point systems]');
        allPassed = allPassed && check6;
    }
    if (postModern.length > 0) {
        const post3 = aggregateStandings(postModern, { threePointSystem: true, homeFilter: true, awayFilter: true });
        const post2 = aggregateStandings(postModern, { threePointSystem: false, homeFilter: true, awayFilter: true });
        const check7 = JSON.stringify(post3.standings) === JSON.stringify(post2.standings);
        console.log(check7 ? 'PASS [post-1995 identical under both point systems]' : 'FAIL [post-1995 should be identical]');
        allPassed = allPassed && check7;
    }

    console.log(allPassed ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
