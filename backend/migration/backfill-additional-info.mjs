// One-time backfill: additional_info was added to the matches table after
// the initial seed, so existing rows have it as NULL even where the source
// gist has a value (currently only Continental penalty-shootout rows, e.g.
// 'pso 4:3'). Domestic gists never have this column, so nothing to do there.
//
// Matches rows by the same (div, date, home_team, away_team) key the unique
// index uses, and only issues an UPDATE where the gist actually has a
// non-null additionalInfo - a few dozen rows, not a full re-sync.
//
// Required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID,
// CLOUDFLARE_API_TOKEN

import { collectAllMatches } from './lib.mjs';

const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN } = process.env;

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_DATABASE_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Missing required env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN');
    process.exit(1);
}

const D1_QUERY_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`;

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

async function main() {
    const log = msg => console.log(msg);

    const all = await collectAllMatches({ log });
    const withInfo = all.filter(m => m.additionalInfo);
    log(`${withInfo.length} rows from gists have non-null additionalInfo`);

    let updated = 0;
    for (const m of withInfo) {
        const { meta } = await runD1Query(
            `UPDATE matches SET additional_info = ? WHERE div = ? AND date = ? AND home_team = ? AND away_team = ? AND additional_info IS NULL`,
            [m.additionalInfo, m.div, m.date, m.homeTeam, m.awayTeam]
        );
        updated += meta.changes || 0;
    }

    log(`Done. ${updated} rows updated with additional_info.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
