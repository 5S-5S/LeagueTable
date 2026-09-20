// Parity check for /api/head-to-head. verify-parity.mjs already confirms
// every match for every team is correct in D1 - what's new here is the
// head-to-head query logic itself (the two-sided WHERE clause, and the
// multi-opponent IN-list used for Big 6 / country groupings), so this
// samples team pairs per division rather than trying every possible pair
// (567 teams in C1 alone makes the full N^2 infeasible).
//
// Usage: npm install && node verify-head-to-head.mjs

import { collectAllMatches } from './lib.mjs';

const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
const DIVS_TO_CHECK = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];
const PAIRS_PER_DIV = 40;

function matchKey(m) {
    return [
        m.date, m.homeTeam, m.awayTeam, m.homeGoals, m.awayGoals,
        m.competitionPhase || '', m.isQualifier ? 1 : 0, m.additionalInfo || '',
    ].join('|');
}

function expectedH2H(all, div, team1, opponents) {
    const oppSet = new Set(opponents);
    return all.filter(m =>
        m.div === div &&
        ((m.homeTeam === team1 && oppSet.has(m.awayTeam)) ||
         (m.awayTeam === team1 && oppSet.has(m.homeTeam)))
    );
}

async function fetchApiH2H(div, team1, opponents) {
    const url = `${API_BASE}/api/head-to-head?div=${encodeURIComponent(div)}&team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(opponents.join(','))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.matches;
}

function checkPair(all, div, team1, opponents, mismatches, label) {
    return (async () => {
        const expected = expectedH2H(all, div, team1, opponents);
        const expectedKeys = new Set(expected.map(matchKey));

        let actual;
        try {
            actual = await fetchApiH2H(div, team1, opponents);
        } catch (err) {
            mismatches.push({ div, team1, opponents, error: err.message });
            return;
        }
        const actualKeys = new Set(actual.map(matchKey));

        const missingInApi = [...expectedKeys].filter(k => !actualKeys.has(k));
        const extraInApi = [...actualKeys].filter(k => !expectedKeys.has(k));
        if (missingInApi.length > 0 || extraInApi.length > 0) {
            mismatches.push({
                div, team1, opponents, label,
                expectedCount: expectedKeys.size,
                actualCount: actualKeys.size,
                missingInApi: missingInApi.slice(0, 5),
                extraInApi: extraInApi.slice(0, 5),
            });
        }
    })();
}

async function main() {
    console.error('Fetching all gist data (ground truth)...');
    const all = await collectAllMatches({ log: m => console.error(`  ${m}`) });

    const byDiv = new Map();
    for (const m of all) {
        if (!DIVS_TO_CHECK.includes(m.div)) continue;
        if (!byDiv.has(m.div)) byDiv.set(m.div, new Set());
        byDiv.get(m.div).add(m.homeTeam);
        byDiv.get(m.div).add(m.awayTeam);
    }

    const mismatches = [];
    let totalChecked = 0;

    for (const div of DIVS_TO_CHECK) {
        const teams = [...(byDiv.get(div) || [])].sort();
        if (teams.length < 2) continue;

        console.error(`${div}: sampling ${Math.min(PAIRS_PER_DIV, teams.length)} single-opponent pairs...`);
        const step = Math.max(1, Math.floor(teams.length / PAIRS_PER_DIV));
        for (let i = 0; i + step < teams.length && totalChecked < PAIRS_PER_DIV * DIVS_TO_CHECK.length; i += step) {
            const team1 = teams[i];
            const team2 = teams[i + step];
            totalChecked++;
            await checkPair(all, div, team1, [team2], mismatches, 'single');
        }

        // One grouped-opponent case per division (5 opponents, like Big 6
        // minus the selected team) to exercise the multi-team IN-list path.
        if (teams.length >= 6) {
            const team1 = teams[0];
            const opponents = teams.slice(1, 6);
            totalChecked++;
            await checkPair(all, div, team1, opponents, mismatches, 'grouped');
        }

        // One "teams that (probably) never met" edge case - just confirms
        // an empty result comes back cleanly, not an error.
        if (teams.length >= 2) {
            const team1 = teams[0];
            const team2 = teams[teams.length - 1];
            totalChecked++;
            await checkPair(all, div, team1, [team2], mismatches, 'edge');
        }
    }

    console.error(`\nChecked ${totalChecked} head-to-head queries across ${DIVS_TO_CHECK.length} divisions.`);
    if (mismatches.length === 0) {
        console.log('PASS: head-to-head API matches gist data exactly for every sampled pair.');
    } else {
        console.log(`FAIL: ${mismatches.length} mismatches found:\n`);
        console.log(JSON.stringify(mismatches, null, 2));
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
