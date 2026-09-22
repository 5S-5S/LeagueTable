// Parity check: confirms /api/team-history returns exactly the same matches
// as the live gists, for every team in every division the frontend cutover
// covers. This is the automated version of what we were spot-checking by
// hand in the browser (Arsenal FC match counts, most recent date, etc.) -
// run it any time to check the D1-backed API hasn't drifted from the gists
// (e.g. a sync failure, a bad backfill, a schema change that dropped data).
//
// Usage: npm install && node verify-parity.mjs

import { collectAllMatches } from './lib.mjs';
import { fetchApiJson, QuotaExceededError } from './api-client.mjs';

const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';

// Every div the frontend cutover actually queries. Europa League (E1) and
// Conference League (C2) are excluded - the UI has no way to select them
// (see ContinentalEurope.html's commented-out league buttons), so there's
// no gist data or D1 rows for them at all.
const DIVS_TO_CHECK = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];

function matchKey(m) {
    return [
        m.date, m.homeTeam, m.awayTeam, m.homeGoals, m.awayGoals,
        m.competitionPhase || '', m.isQualifier ? 1 : 0, m.additionalInfo || '',
    ].join('|');
}

async function fetchApiHistory(div, team) {
    const url = `${API_BASE}/api/team-history?div=${encodeURIComponent(div)}&team=${encodeURIComponent(team)}`;
    const data = await fetchApiJson(url);
    return data.matches;
}

async function main() {
    console.error('Fetching all gist data (ground truth)...');
    const all = await collectAllMatches({ log: m => console.error(`  ${m}`) });

    // div -> team -> matches[] (a team appears under every div/team pair it
    // played in - home or away)
    const byDivTeam = new Map();
    for (const m of all) {
        if (!DIVS_TO_CHECK.includes(m.div)) continue;
        if (!byDivTeam.has(m.div)) byDivTeam.set(m.div, new Map());
        const teamMap = byDivTeam.get(m.div);
        for (const team of [m.homeTeam, m.awayTeam]) {
            if (!teamMap.has(team)) teamMap.set(team, []);
            teamMap.get(team).push(m);
        }
    }

    let totalChecked = 0;
    const mismatches = [];

    for (const div of DIVS_TO_CHECK) {
        const teamMap = byDivTeam.get(div);
        if (!teamMap) {
            console.error(`${div}: no gist data found, skipping`);
            continue;
        }
        const teams = [...teamMap.keys()].sort();
        console.error(`${div}: checking ${teams.length} teams...`);

        for (const team of teams) {
            totalChecked++;
            const expected = teamMap.get(team);
            const expectedKeys = new Set(expected.map(matchKey));

            let actual;
            try {
                actual = await fetchApiHistory(div, team);
            } catch (err) {
                if (err instanceof QuotaExceededError) {
                    console.error(`\nD1 read quota exhausted after ${totalChecked} checks - stopping early ` +
                        `(every remaining request would just fail the same way):\n${err.message}`);
                    console.log(`INCOMPLETE: quota exhausted after ${totalChecked} checks. ` +
                        `${mismatches.length} mismatches found before stopping.`);
                    if (mismatches.length > 0) console.log(JSON.stringify(mismatches, null, 2));
                    process.exit(2);
                }
                mismatches.push({ div, team, error: err.message });
                continue;
            }
            const actualKeys = new Set(actual.map(matchKey));

            const missingInApi = [...expectedKeys].filter(k => !actualKeys.has(k));
            const extraInApi = [...actualKeys].filter(k => !expectedKeys.has(k));

            if (missingInApi.length > 0 || extraInApi.length > 0) {
                mismatches.push({
                    div, team,
                    expectedCount: expectedKeys.size,
                    actualCount: actualKeys.size,
                    missingInApi: missingInApi.slice(0, 5),
                    extraInApi: extraInApi.slice(0, 5),
                });
            }
        }
    }

    console.error(`\nChecked ${totalChecked} team/division combinations across ${DIVS_TO_CHECK.length} divisions.`);
    if (mismatches.length === 0) {
        console.log('PASS: API data matches gist data exactly for every team.');
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
