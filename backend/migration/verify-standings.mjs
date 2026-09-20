// Offline verification of aggregateStandings() against the live gists -
// no D1 needed at all, so this can (and should) run before the endpoint
// ever touches the deployed Worker. Two kinds of checks:
//
// 1. A known-good ground-truth row: Arsenal FC's full-history Premier
//    League standings, read directly off the live site earlier in this
//    migration effort as W:2044 D:1113 L:1247(+) GF:7364 GA:5459(+)
//    Pts:7243 (post point-deduction). W/D and GF are exact and won't
//    drift; L/GA/played are lower bounds since more matches land via the
//    daily sync over time. Pts is checked against the RAW total
//    (won*3+drawn) plus the known Arsenal FC 1990-91 E0 deduction
//    (pointDeductions in DomesticEurope.html: -2), since this endpoint
//    deliberately returns undeducted points - deductions stay
//    client-side (see backend/README.md's Data integrity section).
// 2. Structural invariants that must hold for ANY filter combination:
//    sum(played) relates to match count and venue filters in a fixed way,
//    won+drawn+lost === played per team, etc.
//
// Usage: npm install && node verify-standings.mjs

import { collectAllMatches } from './lib.mjs';
import { aggregateStandings } from './standings-aggregate.mjs';

function toAggInput(matches) {
    return matches.map(m => ({
        div: m.div, date: m.date, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
    }));
}

function checkInvariants(label, matchCount, result, { homeFilter, awayFilter }) {
    const failures = [];
    const sumPlayed = result.standings.reduce((s, r) => s + r.played, 0);
    const expectedSumPlayed = (homeFilter ? matchCount : 0) + (awayFilter ? matchCount : 0);
    if (sumPlayed !== expectedSumPlayed) {
        failures.push(`sum(played)=${sumPlayed}, expected ${expectedSumPlayed}`);
    }
    for (const row of result.standings) {
        if (row.won + row.drawn + row.lost !== row.played) {
            failures.push(`${row.team}: won+drawn+lost (${row.won + row.drawn + row.lost}) != played (${row.played})`);
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
    const e0 = toAggInput(all.filter(m => m.div === 'E0'));

    let allPassed = true;

    // Check 1: known-good Arsenal FC row (full history, default filters:
    // threePointSystem on, both venues on - matches what the live site
    // shows by default). See the file header comment for why some fields
    // are exact-match and others are lower-bound/deduction-adjusted.
    const fullResult = aggregateStandings(e0, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenal = fullResult.standings.find(r => r.team === 'Arsenal FC');
    const ARSENAL_1990_91_DEDUCTION = 2;
    const rawPointsFromWD = arsenal ? arsenal.won * 3 + arsenal.drawn : null;
    console.log('Arsenal FC computed:', arsenal);
    const arsenalChecks = arsenal && [
        ['won', arsenal.won === 2044],
        ['drawn', arsenal.drawn === 1113],
        ['goalsFor', arsenal.goalsFor === 7364],
        ['played >= 4404', arsenal.played >= 4404],
        ['lost >= 1247', arsenal.lost >= 1247],
        ['goalsAgainst >= 5459', arsenal.goalsAgainst >= 5459],
        ['won+drawn+lost === played', arsenal.won + arsenal.drawn + arsenal.lost === arsenal.played],
        ['raw points === won*3+drawn', arsenal.points === rawPointsFromWD],
        ['raw points - deduction === 7243 (the displayed, post-deduction value)', arsenal.points - ARSENAL_1990_91_DEDUCTION === 7243],
    ];
    const arsenalMatches = !!arsenal && arsenalChecks.every(([, ok]) => ok);
    if (!arsenalMatches) {
        console.log('Arsenal FC failing checks:', (arsenalChecks || []).filter(([, ok]) => !ok).map(([name]) => name));
    }
    console.log(arsenalMatches ? 'PASS [Arsenal FC ground truth]' : 'FAIL [Arsenal FC ground truth]');
    allPassed = allPassed && arsenalMatches;

    // Check 2: structural invariants across several filter combinations.
    allPassed = checkInvariants('E0 full history, both venues', e0.length, fullResult, { homeFilter: true, awayFilter: true }) && allPassed;

    const homeOnly = aggregateStandings(e0, { threePointSystem: true, homeFilter: true, awayFilter: false });
    allPassed = checkInvariants('E0 full history, home only', e0.length, homeOnly, { homeFilter: true, awayFilter: false }) && allPassed;

    const awayOnly = aggregateStandings(e0, { threePointSystem: true, homeFilter: false, awayFilter: true });
    allPassed = checkInvariants('E0 full history, away only', e0.length, awayOnly, { homeFilter: false, awayFilter: true }) && allPassed;

    // Check 3: a real season-shaped date range (2025-26 Premier League),
    // both point systems (should be identical for a modern season - the
    // 2-point eras are all pre-1982).
    const season2526 = e0.filter(m => m.date >= '2025-08-01' && m.date <= '2026-06-30');
    const seasonResult3pt = aggregateStandings(season2526, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const seasonResult2pt = aggregateStandings(season2526, { threePointSystem: false, homeFilter: true, awayFilter: true });
    const modernSeasonUnaffected = JSON.stringify(seasonResult3pt.standings) === JSON.stringify(seasonResult2pt.standings);
    console.log(modernSeasonUnaffected
        ? 'PASS [modern season identical under both point systems]'
        : 'FAIL [modern season differs between point systems - should be identical, all matches post-1982]');
    allPassed = allPassed && modernSeasonUnaffected;
    allPassed = checkInvariants('E0 2025-26 season', season2526.length, seasonResult3pt, { homeFilter: true, awayFilter: true }) && allPassed;

    // Check 4: a historical 2-point-era match window should actually
    // differ between point systems.
    const preModern = e0.filter(m => m.date >= '1975-08-01' && m.date <= '1976-06-30');
    if (preModern.length > 0) {
        const pre3pt = aggregateStandings(preModern, { threePointSystem: true, homeFilter: true, awayFilter: true });
        const pre2pt = aggregateStandings(preModern, { threePointSystem: false, homeFilter: true, awayFilter: true });
        const totalPoints3 = pre3pt.standings.reduce((s, r) => s + r.points, 0);
        const totalPoints2 = pre2pt.standings.reduce((s, r) => s + r.points, 0);
        const historicalEraDiffers = totalPoints3 !== totalPoints2;
        console.log(historicalEraDiffers
            ? `PASS [1975-76 season differs between point systems: 3pt total=${totalPoints3}, 2pt total=${totalPoints2}]`
            : 'FAIL [1975-76 season should differ between point systems but does not]');
        allPassed = allPassed && historicalEraDiffers;
    }

    console.log(allPassed ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
