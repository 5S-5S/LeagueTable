// Daily incremental sync: fetches every gist (same as migrate.mjs), but
// only writes matches D1 doesn't already have - keeping well under D1's
// free-tier cap of 100,000 rows written/day (our full dataset is 166k+,
// so a naive daily full re-insert would blow past that limit immediately).
//
// Strategy: for each competition (div), find the most recent date already
// in D1, then only consider gist rows on or after that date - so the
// candidate set is always small (roughly the last day or two of matches),
// not the whole history. INSERT OR IGNORE plus the unique index on
// (div, date, home_team, away_team) is a safety net against re-inserting
// a match that's on the boundary date and already present.
//
// Talks to D1 directly over its HTTP API (not the wrangler CLI), so this
// can run unattended in CI with just an API token - see
// .github/workflows/sync-d1.yml.
//
// Last step: if any new rows actually landed, bumps a version counter in
// KV that the Worker's standings/season-standings caches are keyed on
// (see CACHE_KV_NAMESPACE_ID below) - this is what invalidates those
// caches once a day's worth of new matches is in, instead of a blind TTL.
//
// Required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID,
// CLOUDFLARE_API_TOKEN (the same token already needs workers_kv:write
// scope for this - check via `wrangler whoami` if the KV write 403s)

import { collectAllMatches } from './lib.mjs';

const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN } = process.env;

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_DATABASE_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN');
    process.exit(1);
}

const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`;

// KV namespace the Worker uses to cache /api/standings and
// /api/season-standings responses (see withCache()/getCacheVersion() in
// backend/worker/src/index.js) - both scan an entire division on every
// call, so re-reading D1 for the same division more than once a day would
// be pure waste. Not a secret - same ID as the [[kv_namespaces]] binding
// in backend/worker/wrangler.toml.
const CACHE_KV_NAMESPACE_ID = 'b2fa8b93e59540749923768aaf1fc08d';

async function bumpCacheVersion() {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${CACHE_KV_NAMESPACE_ID}/values/cache-version`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'text/plain',
        },
        body: new Date().toISOString(),
    });
    const json = await res.json();
    if (!json.success) {
        throw new Error(`KV cache-version write failed: ${JSON.stringify(json.errors)}`);
    }
}

async function runD1Query(sql, params = []) {
    const res = await fetch(D1_QUERY_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
    });
    const json = await res.json();
    if (!json.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
    }
    return json.result[0];
}

async function getWatermarks() {
    const { results } = await runD1Query('SELECT div, MAX(date) as max_date FROM matches GROUP BY div');
    const watermarks = new Map();
    for (const row of results) {
        watermarks.set(row.div, row.max_date);
    }
    return watermarks;
}

async function getTotalRowCount() {
    const { results } = await runD1Query('SELECT COUNT(*) as total FROM matches');
    return results[0].total;
}

function toInsertOrIgnore(batch) {
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = batch.flatMap(m => [
        m.div, m.date, m.homeTeam, m.awayTeam, m.homeGoals, m.awayGoals, m.competitionPhase, m.isQualifier ? 1 : 0, m.additionalInfo,
    ]);
    const sql = `INSERT OR IGNORE INTO matches (div, date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier, additional_info) VALUES ${placeholders}`;
    return { sql, params };
}

async function main() {
    const log = msg => console.log(msg);

    const watermarks = await getWatermarks();
    log(`Watermarks: ${JSON.stringify(Object.fromEntries(watermarks))}`);

    const all = await collectAllMatches({ log });
    log(`Fetched ${all.length} total rows from gists`);

    // Only rows on/after that div's watermark are even candidates - this
    // is what keeps the daily write volume small. A div with no watermark
    // yet (shouldn't happen post-backfill, but just in case) gets no
    // filter, so a brand new competition would still fully seed itself.
    const candidates = all.filter(m => {
        const watermark = watermarks.get(m.div);
        return !watermark || m.date >= watermark;
    });
    log(`${candidates.length} candidate rows on/after each div's watermark`);

    if (candidates.length === 0) {
        log('Nothing to sync.');
        return;
    }

    // D1's INSERT OR IGNORE doesn't reliably report per-batch rows_written
    // over the HTTP API (verified: it can report non-zero even when every
    // row in the batch was an ignored duplicate), so the real "how many
    // new rows landed" figure comes from a before/after COUNT instead.
    const countBefore = await getTotalRowCount();

    // D1 caps bound parameters at 100 per query; 9 columns per row means
    // at most 11 rows per batch (11 * 9 = 99).
    const batchSize = 11;
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const { sql, params } = toInsertOrIgnore(batch);
        await runD1Query(sql, params);
    }

    const countAfter = await getTotalRowCount();
    const newRowCount = countAfter - countBefore;
    log(`Done. ${newRowCount} genuinely new rows written (out of ${candidates.length} candidates checked). Total rows now: ${countAfter}.`);

    // Only invalidate the standings/season-standings cache when something
    // actually changed - bumping it on a no-op sync would just force every
    // division to be needlessly re-read from D1 on the next request, for
    // an identical result. Non-fatal: the sync's actual job (getting new
    // matches into D1) already succeeded by this point, so a KV problem
    // (e.g. CLOUDFLARE_API_TOKEN missing Workers KV Storage:Edit scope)
    // shouldn't fail the whole run - it just means cached responses stay
    // stale a bit longer, not that anything is broken.
    if (newRowCount > 0) {
        try {
            await bumpCacheVersion();
            log('Bumped cache-version in KV - cached standings responses will be recomputed on next request.');
        } catch (err) {
            console.error('Failed to bump cache-version (non-fatal - D1 sync itself succeeded):', err.message);
        }
    } else {
        log('No new rows landed - leaving cache-version untouched.');
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
