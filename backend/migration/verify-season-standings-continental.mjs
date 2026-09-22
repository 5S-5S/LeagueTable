// Offline verification of the Continental-only lastMatch-per-team logic
// added to POST /api/season-standings (used by Team Seasons' tournament
// progression display and showAllTeamsAtProgression()) - no D1 needed.
// Mirrors lastMatchPerTeam()/bucketMatchesBySeason() from
// backend/worker/src/index.js exactly.
//
// Ground truth: Arsenal FC reached the 2005-06 Champions League Final and
// lost 2-1 to FC Barcelona on 2006-05-17 - a well-known, independently
// checkable fact. Their season's lastMatch should be exactly that game,
// and the frontend's calculateTournamentProgression() should therefore
// report "Final" (not "Champions", since they lost).
//
// Usage: npm install && node verify-season-standings-continental.mjs

import { collectAllMatches } from './lib.mjs';
import { aggregateStandings } from './standings-aggregate.mjs';

function bucketMatchesBySeason(matches, seasons) {
    const sorted = [...seasons].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    const buckets = sorted.map(() => []);
    let i = 0;

    for (const m of matches) {
        while (i < sorted.length - 1 && m.date > sorted[i].end && m.date >= sorted[i + 1].start) {
            i++;
        }
        for (const j of [i - 1, i, i + 1]) {
            if (j < 0 || j >= sorted.length) continue;
            if (m.date >= sorted[j].start && m.date <= sorted[j].end) {
                buckets[j].push(m);
            }
        }
    }

    return sorted.map((s, idx) => ({ season: s.season, matches: buckets[idx] }));
}

function lastMatchPerTeam(seasonMatches) {
    const last = new Map();
    for (const m of seasonMatches) {
        last.set(m.homeTeam, m);
        last.set(m.awayTeam, m);
    }
    return last;
}

// Verbatim port of calculateTournamentProgression() from
// ContinentalEurope.html, adapted to this script's {homeTeam, awayTeam,
// homeGoals, awayGoals, competitionPhase, additionalInfo} shape (the
// frontend uses HomeTeam/AwayTeam/FTHG/FTAG/CompetitionPhase/AdditionalInfo
// - same fields, different casing, from mapping the API response).
function calculateTournamentProgression(teamName, lastMatch) {
    if (!lastMatch) return 'Group Stage';
    const lastPhase = lastMatch.competitionPhase || '';

    let stageName = 'Group Stage';
    if (lastPhase.includes('Quarter')) {
        stageName = 'Quarter-Finals';
    } else if (lastPhase.includes('Semi')) {
        stageName = 'Semi-Finals';
    } else if (lastPhase.includes('Final') && !lastPhase.includes('Semi') && !lastPhase.includes('Quarter')) {
        let teamWonFinal = false;
        const additionalInfo = lastMatch.additionalInfo || '';
        if (additionalInfo.includes('pso')) {
            const penaltyMatch = additionalInfo.match(/pso\s+(\d+):(\d+)/);
            if (penaltyMatch) {
                const homePenalties = parseInt(penaltyMatch[1]);
                const awayPenalties = parseInt(penaltyMatch[2]);
                teamWonFinal = (lastMatch.homeTeam === teamName && homePenalties > awayPenalties) ||
                              (lastMatch.awayTeam === teamName && awayPenalties > homePenalties);
            }
        } else {
            teamWonFinal = (lastMatch.homeTeam === teamName && lastMatch.homeGoals > lastMatch.awayGoals) ||
                          (lastMatch.awayTeam === teamName && lastMatch.awayGoals > lastMatch.homeGoals);
        }
        stageName = teamWonFinal ? 'Champions' : 'Final';
    } else if (lastPhase.includes('Round Of 16') || lastPhase.includes('16')) {
        stageName = 'Round Of 16';
    } else if (lastPhase.includes('Play-Off')) {
        stageName = 'Play-Offs';
    } else if (lastPhase.includes('2. Round')) {
        stageName = '2. Round';
    } else if (lastPhase.includes('1. Round')) {
        stageName = '1. Round';
    }
    return stageName;
}

async function main() {
    console.error('Fetching all gist data (ground truth)...');
    const all = await collectAllMatches({ log: m => console.error(`  ${m}`) });
    const c1 = all.filter(m => m.div === 'C1').map(m => ({
        div: m.div, date: m.date, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
        competitionPhase: m.competitionPhase, additionalInfo: m.additionalInfo,
    }));

    let allPassed = true;

    const seasons = [{ season: '2005-06', start: '2005-08-01', end: '2006-06-30' }];
    const buckets = bucketMatchesBySeason(c1, seasons);
    const bucket = buckets[0];

    const lastByTeam = lastMatchPerTeam(bucket.matches);
    const arsenalLast = lastByTeam.get('Arsenal FC');

    console.log('Arsenal FC 2005-06 last match:', arsenalLast);
    const check1 = !!arsenalLast && arsenalLast.date === '2006-05-17' &&
        (arsenalLast.homeTeam === 'FC Barcelona' || arsenalLast.awayTeam === 'FC Barcelona') &&
        (arsenalLast.competitionPhase || '').toLowerCase() === 'final';
    console.log(check1 ? 'PASS [Arsenal FC 2005-06 last match is the 2006-05-17 Final vs FC Barcelona]' : 'FAIL [Arsenal FC last match]');
    allPassed = allPassed && check1;

    const progression = calculateTournamentProgression('Arsenal FC', arsenalLast);
    console.log('Arsenal FC 2005-06 tournament progression:', progression, '(expected "Final" - they lost 2-1)');
    const check2 = progression === 'Final';
    console.log(check2 ? 'PASS [Arsenal FC 2005-06 progression == Final]' : 'FAIL [Arsenal FC 2005-06 progression]');
    allPassed = allPassed && check2;

    // Sanity: the winner that season (Barcelona) should show "Champions".
    const barcaLast = lastByTeam.get('FC Barcelona');
    const barcaProgression = calculateTournamentProgression('FC Barcelona', barcaLast);
    console.log('FC Barcelona 2005-06 tournament progression:', barcaProgression, '(expected "Champions")');
    const check3 = barcaProgression === 'Champions';
    console.log(check3 ? 'PASS [FC Barcelona 2005-06 progression == Champions]' : 'FAIL [FC Barcelona 2005-06 progression]');
    allPassed = allPassed && check3;

    // Structural check: aggregateStandings should still agree on Arsenal's
    // played count for that season regardless of the lastMatch addition.
    const { standings } = aggregateStandings(bucket.matches, { threePointSystem: false, homeFilter: true, awayFilter: true });
    const arsenalRow = standings.find(r => r.team === 'Arsenal FC');
    console.log('Arsenal FC 2005-06 standings row:', arsenalRow);
    const check4 = !!arsenalRow && arsenalRow.played > 0;
    allPassed = allPassed && check4;

    console.log(allPassed ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
