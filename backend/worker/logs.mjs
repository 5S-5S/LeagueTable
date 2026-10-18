// The visit log (POST /api/log -> Analytics Engine, dataset
// leaguetable_events): what people searched for and didn't find, what
// they gave up on, what they opened, page views and JavaScript errors.
//
//   npm run logs                 last 7 days, the live site
//   npm run logs -- 30           last 30 days
//   npm run logs -- 7 --local    local testing's events instead (localhost / 127.0.0.1)
//
// Needs a Cloudflare API token with Account | Account Analytics | Read
// (wrangler's own login can't read Analytics Engine), in
// ~/.cloudflare-analytics-token or CF_ANALYTICS_TOKEN. The account id
// comes from CLOUDFLARE_ACCOUNT_ID or `wrangler whoami`.
//
// Columns (see handleLog in src/index.js): blob1 kind, blob2 outcome,
// blob3 text, blob4 scope, blob5 detail, blob6 corrected, blob7 page,
// blob8 site, blob9 device, blob10 country, blob11 stack; double1
// results shown, double2 position opened. Analytics Engine may sample
// busy days, so counts are SUM(_sample_interval), not COUNT().
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LIVE_SITE = '5s-5s.github.io';
const args = process.argv.slice(2);
const days = Math.max(1, parseInt(args.find(a => /^\d+$/.test(a)) || '7', 10));
const local = args.includes('--local');

function token() {
    if (process.env.CF_ANALYTICS_TOKEN) return process.env.CF_ANALYTICS_TOKEN.trim();
    try {
        return readFileSync(join(homedir(), '.cloudflare-analytics-token'), 'utf8').trim();
    } catch (err) {
        console.error('No token: put a Cloudflare API token with Account Analytics: Read in ~/.cloudflare-analytics-token (see the top of logs.mjs).');
        process.exit(1);
    }
}

function accountId() {
    if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
    const out = execSync('npx wrangler whoami', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const id = (out.match(/\b[0-9a-f]{32}\b/) || [])[0];
    if (!id) {
        console.error('No account id from `wrangler whoami` - set CLOUDFLARE_ACCOUNT_ID.');
        process.exit(1);
    }
    return id;
}

const TOKEN = token();
const ACCOUNT = accountId();

async function query(sql) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: `${sql} FORMAT JSON`,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Analytics Engine ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text).data;
}

const siteFilter = local ? `blob8 != '${LIVE_SITE}'` : `blob8 = '${LIVE_SITE}'`;
const where = (extra = '') => `WHERE timestamp > NOW() - INTERVAL '${days}' DAY AND ${siteFilter}${extra ? ` AND ${extra}` : ''}`;
const FROM = 'FROM leaguetable_events';

function table(title, rows, columns) {
    console.log(`\n${title}`);
    if (!rows.length) {
        console.log('  (none)');
        return;
    }
    const widths = columns.map(([label, get]) => Math.min(60, Math.max(label.length, ...rows.map(r => String(get(r)).length))));
    const line = cells => '  ' + cells.map((c, i) => String(c).slice(0, widths[i]).padEnd(widths[i])).join('  ');
    console.log(line(columns.map(([label]) => label)));
    rows.forEach(r => console.log(line(columns.map(([, get]) => get(r)))));
}

const n = v => Math.round(Number(v));
const scopeLabel = s => s === 'domestic' ? 'Top 5' : s;

const [views, viewsByPage, devices, countries, referrers, failed, abandoned, opened, examples, errors] = await Promise.all([
    query(`SELECT SUM(_sample_interval) AS c ${FROM} ${where("blob1 = 'view'")}`),
    query(`SELECT blob7 AS page, SUM(_sample_interval) AS c ${FROM} ${where("blob1 = 'view'")} GROUP BY page ORDER BY c DESC`),
    query(`SELECT blob9 AS device, SUM(_sample_interval) AS c ${FROM} ${where("blob1 = 'view'")} GROUP BY device ORDER BY c DESC LIMIT 8`),
    query(`SELECT blob10 AS country, SUM(_sample_interval) AS c ${FROM} ${where("blob1 = 'view'")} GROUP BY country ORDER BY c DESC LIMIT 8`),
    query(`SELECT blob3 AS site, SUM(_sample_interval) AS c ${FROM} ${where(`blob1 = 'view' AND blob3 != '' AND blob3 != '${LIVE_SITE}'`)} GROUP BY site ORDER BY c DESC LIMIT 10`),
    // nothing to open: Enter on no results, or left with none showing
    query(`SELECT blob3 AS text, blob4 AS scope, SUM(_sample_interval) AS c, MAX(timestamp) AS last, argMax(blob5, timestamp) AS message ${FROM} ${where("blob1 = 'search' AND double1 = 0 AND (blob2 = 'no-results' OR blob2 = 'abandoned')")} GROUP BY text, scope ORDER BY c DESC, last DESC LIMIT 40`),
    // results showing, none opened: the suggestions missed
    query(`SELECT blob3 AS text, blob4 AS scope, SUM(_sample_interval) AS c, MAX(double1) AS results, MAX(timestamp) AS last ${FROM} ${where("blob1 = 'search' AND blob2 = 'abandoned' AND double1 > 0")} GROUP BY text, scope ORDER BY c DESC, last DESC LIMIT 30`),
    query(`SELECT blob3 AS text, blob4 AS scope, SUM(_sample_interval) AS c, AVG(double2) AS pos, argMax(blob5, timestamp) AS result, argMax(blob6, timestamp) AS corrected ${FROM} ${where("blob1 = 'search' AND blob2 = 'opened'")} GROUP BY text, scope ORDER BY c DESC LIMIT 30`),
    query(`SELECT blob3 AS text, SUM(_sample_interval) AS c ${FROM} ${where("blob1 = 'search' AND blob2 = 'example'")} GROUP BY text ORDER BY c DESC LIMIT 15`),
    query(`SELECT blob3 AS message, blob5 AS place, SUM(_sample_interval) AS c, MAX(timestamp) AS last, argMax(blob9, timestamp) AS device, argMax(blob7, timestamp) AS page, argMax(blob11, timestamp) AS stack ${FROM} ${where("blob1 = 'error'")} GROUP BY message, place ORDER BY c DESC LIMIT 20`),
]);

console.log(`Visit log, last ${days} day${days === 1 ? '' : 's'} (${local ? 'local testing' : LIVE_SITE})`);
console.log(`Page views: ${n(views[0]?.c || 0)}`);
table('Views by page', viewsByPage, [['Page', r => r.page], ['Views', r => n(r.c)]]);
table('Devices', devices, [['Device', r => r.device], ['Views', r => n(r.c)]]);
table('Countries', countries, [['Country', r => r.country || '?'], ['Views', r => n(r.c)]]);
table('Came from', referrers, [['Site', r => r.site], ['Views', r => n(r.c)]]);
table('Searches with no results (the best guide to what search misses)', failed, [
    ['Times', r => n(r.c)], ['Search', r => r.text], ['In', r => scopeLabel(r.scope)], ['Message shown', r => r.message]
]);
table('Abandoned: results showed, none opened', abandoned, [
    ['Times', r => n(r.c)], ['Search', r => r.text], ['In', r => scopeLabel(r.scope)], ['Results', r => n(r.results)]
]);
table('Opened', opened, [
    ['Times', r => n(r.c)], ['Search', r => r.text], ['In', r => scopeLabel(r.scope)], ['Avg pos', r => Number(r.pos).toFixed(1)],
    ['Result', r => r.result + (r.corrected ? ` (read as "${r.corrected}")` : '')]
]);
table('Examples picked from the empty bar', examples, [['Times', r => n(r.c)], ['Example', r => r.text]]);
table('JavaScript errors', errors, [
    ['Times', r => n(r.c)], ['Error', r => r.message], ['Where', r => r.place], ['Page', r => r.page], ['e.g. device', r => r.device]
]);
errors.slice(0, 5).filter(r => r.stack).forEach(r => {
    console.log(`\n  ${r.message}\n${r.stack.split('\n').slice(0, 6).map(l => `    ${l.trim()}`).join('\n')}`);
});
