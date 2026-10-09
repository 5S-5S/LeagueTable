// Rebuilds the home page's snapped streaks list (the "Streaks snapped"
// card, snapped.js): every significant streak that ended in the last 365
// days, worked out from each competition's full match history by
// findSnappedStreaks() (snapped-lib.mjs), stored as one JSON value in the
// Worker's KV namespace under 'snapped-streaks', which /api/snapped-streaks
// serves as-is.
//
// Run by .github/workflows/snapped-streaks.yml after each daily D1 sync
// and after the Worker records live results. The whole history is needed
// for the significance bars (how a run compares with every run of its kind
// since 1995), which is far past a Worker's CPU limit - hence a job.
//
// Reads the matches from the live API (/api/season-matches, the same rows
// the pages see).
//
// Usage:
//   node snapped-streaks.mjs                 # compute and write to KV
//   node snapped-streaks.mjs --dry-run       # compute, print a summary, write nothing
//   node snapped-streaks.mjs --out list.json # also save the list to a file
//   node snapped-streaks.mjs --to 2026-09-20 # window ending on another date (testing)
//
// Writing needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (the same
// token sync.mjs uses for the cache-version key).

import fs from 'node:fs';
import { findSnappedStreaks } from './snapped-lib.mjs';

const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
const DIVS = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];
const WINDOW_DAYS = 365;
// Same namespace as sync.mjs's CACHE_KV_NAMESPACE_ID (not a secret)
const CACHE_KV_NAMESPACE_ID = 'b2fa8b93e59540749923768aaf1fc08d';
const KV_KEY = 'snapped-streaks';

function argValue(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
}

async function fetchDivision(div) {
    const url = `${API_BASE}/api/season-matches?div=${div}&dateFrom=1850-01-01&dateTo=2100-12-31`;
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return (await res.json()).matches;
        } catch (err) {
            if (attempt >= 3) throw new Error(`Fetching ${div} failed: ${err.message}`);
            await new Promise(r => setTimeout(r, 5000 * attempt));
        }
    }
}

async function writeToKv(body) {
    const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error('Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN (use --dry-run to compute without writing)');
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CACHE_KV_NAMESPACE_ID}/values/${KV_KEY}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body,
    });
    const json = await res.json();
    if (!json.success) throw new Error(`KV write failed: ${JSON.stringify(json.errors)}`);
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const to = argValue('--to') || new Date().toISOString().slice(0, 10);
    const fromDate = new Date(`${to}T00:00:00Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - WINDOW_DAYS + 1);
    const from = fromDate.toISOString().slice(0, 10);

    const matchesByDiv = {};
    for (const div of DIVS) {
        matchesByDiv[div] = await fetchDivision(div);
        console.log(`${div}: ${matchesByDiv[div].length} matches, latest ${matchesByDiv[div].at(-1)?.date}`);
    }

    const started = Date.now();
    const streaks = findSnappedStreaks(matchesByDiv, { from, to });
    console.log(`${streaks.length} snapped streaks from ${from} to ${to} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    const byDiv = {};
    for (const s of streaks) byDiv[s.div] = (byDiv[s.div] || 0) + 1;
    console.log(`By competition: ${JSON.stringify(byDiv)}`);
    for (const s of streaks.slice(0, 5)) {
        console.log(`  ${s.end} ${s.div} ${s.team}${s.opp ? ` v ${s.opp}` : ''} ${s.type}/${s.loc} ${s.count}`);
    }

    const body = JSON.stringify({ generatedAt: new Date().toISOString(), from, to, streaks });
    const out = argValue('--out');
    if (out) fs.writeFileSync(out, body);
    if (dryRun) {
        console.log(`Dry run - not written (${(body.length / 1024).toFixed(0)} KB).`);
        return;
    }
    await writeToKv(body);
    console.log(`Wrote ${KV_KEY} to KV (${(body.length / 1024).toFixed(0)} KB).`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
