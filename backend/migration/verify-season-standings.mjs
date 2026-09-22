// Offline verification of the season-standings bucketing logic used by
// POST /api/season-standings (Team Seasons cutover) - no D1 needed.
// Mirrors bucketMatchesBySeason() from backend/worker/src/index.js
// exactly (duplicated here since it's a small pure function, same
// approach as verify-standings.mjs did for aggregateStandings before it
// existed as a shared import) and checks it against gist ground truth.
//
// Ground truth: Arsenal FC's 2003-04 "Invincibles" Premier League season
// is a widely-known exact record (P38 W26 D12 L0 GD+47 Pts90, champions,
// position 1) - a strong independent check that bucketing + aggregation
// together reproduce a real season exactly.
//
// Usage: npm install && node verify-season-standings.mjs

import { collectAllMatches } from './lib.mjs';
import { aggregateStandings } from './standings-aggregate.mjs';

// Verbatim copy of bucketMatchesBySeason() from the Worker - see that
// file's comment for why the neighbor-overlap check is needed.
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

function toAggInput(matches) {
    return matches.map(m => ({
        div: m.div, date: m.date, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
        homeGoals: m.homeGoals, awayGoals: m.awayGoals,
    }));
}

async function main() {
    console.error('Fetching all gist data (ground truth)...');
    const all = await collectAllMatches({ log: m => console.error(`  ${m}`) });
    const e0 = toAggInput(all.filter(m => m.div === 'E0'));

    let allPassed = true;

    // Check 1: bucket a handful of seasons (including two adjacent ones,
    // to exercise the pointer-advance logic) and verify the 2003-04
    // Invincibles season exactly.
    const seasons = [
        { season: '2001-02', start: '2001-08-01', end: '2002-06-30' },
        { season: '2002-03', start: '2002-08-01', end: '2003-06-30' },
        { season: '2003-04', start: '2003-08-01', end: '2004-06-30' },
        { season: '2004-05', start: '2004-08-01', end: '2005-06-30' },
    ];
    const buckets = bucketMatchesBySeason(e0, seasons);

    const invinciblesBucket = buckets.find(b => b.season === '2003-04');
    const { standings } = aggregateStandings(invinciblesBucket.matches, { threePointSystem: true, homeFilter: true, awayFilter: true });
    const arsenal = standings.find(r => r.team === 'Arsenal FC');

    console.log('2003-04 bucket matchCount:', invinciblesBucket.matches.length, 'expected 380 (20 teams, 38 games each)');
    const check1 = invinciblesBucket.matches.length === 380;
    console.log(check1 ? 'PASS [2003-04 matchCount == 380]' : 'FAIL [2003-04 matchCount]');
    allPassed = allPassed && check1;

    console.log('Arsenal FC 2003-04:', arsenal);
    const check2 = arsenal && arsenal.played === 38 && arsenal.won === 26 && arsenal.drawn === 12 &&
        arsenal.lost === 0 && arsenal.points === 90 && (arsenal.goalsFor - arsenal.goalsAgainst) === 47;
    console.log(check2 ? 'PASS [Arsenal FC 2003-04 Invincibles record exact: P38 W26 D12 L0 GD+47 Pts90]' : 'FAIL [Arsenal FC 2003-04 record]');
    allPassed = allPassed && check2;

    // Check 2: no season should leak matches into a neighbor - every
    // match assigned to 2002-03 or 2004-05 should fall strictly outside
    // 2003-04's own date range (no date should appear in two adjacent
    // full-season buckets, since these leagues don't have the rare
    // extended/overlapping ranges used for COVID/post-war seasons).
    const b0203 = buckets.find(b => b.season === '2002-03');
    const b0405 = buckets.find(b => b.season === '2004-05');
    const leaked = [...b0203.matches, ...b0405.matches].filter(
        m => m.date >= '2003-08-01' && m.date <= '2004-06-30'
    );
    console.log(leaked.length === 0 ? 'PASS [no cross-season leakage for non-overlapping seasons]' : `FAIL [${leaked.length} matches leaked into neighbor buckets]`);
    allPassed = allPassed && leaked.length === 0;

    // Check 3: overlapping/extended ranges (mirrors the real COVID-era
    // quirk) - two seasons sharing a few days should both receive any
    // match date that falls in the overlap.
    const overlapSeasons = [
        { season: 'A', start: '2010-01-01', end: '2010-06-10' },
        { season: 'B', start: '2010-06-05', end: '2010-12-31' },
    ];
    const overlapMatches = [
        { div: 'E0', date: '2010-06-07', homeTeam: 'X', awayTeam: 'Y', homeGoals: 1, awayGoals: 0 },
    ];
    const overlapBuckets = bucketMatchesBySeason(overlapMatches, overlapSeasons);
    const inBoth = overlapBuckets.every(b => b.matches.length === 1);
    console.log(inBoth ? 'PASS [overlapping ranges both receive the shared-date match]' : 'FAIL [overlap handling]');
    allPassed = allPassed && inBoth;

    // Check 4: structural invariant across all requested seasons -
    // sum(played) == matchCount * 2 for every bucket with matches.
    for (const b of buckets) {
        if (b.matches.length === 0) continue;
        const { standings: s } = aggregateStandings(b.matches, { threePointSystem: true, homeFilter: true, awayFilter: true });
        const sumPlayed = s.reduce((sum, r) => sum + r.played, 0);
        const ok = sumPlayed === b.matches.length * 2;
        console.log(ok ? `PASS [${b.season} sum(played) == matchCount*2]` : `FAIL [${b.season} sum(played)=${sumPlayed}, expected ${b.matches.length * 2}]`);
        allPassed = allPassed && ok;
    }

    console.log(allPassed ? '\nALL CHECKS PASSED' : '\nSOME CHECKS FAILED');
    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
