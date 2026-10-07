// The Q&A page's screenshots (QAImages/), taken from the live pages in
// headless Chrome so they can be retaken whenever a layout changes:
//
//   cd tests && npm run qa-screenshots            # every shot
//   npm run qa-screenshots -- streaks             # only shots whose name has "streaks"
//
// Files are named <section>-<nn>-<what>.png, the section matching the Q&A
// category they illustrate. Each shot is a page address (a Copy Link or
// search link), optional clicks, and the part of the page to keep: from the
// top of one element to the bottom of another (or the top of a third),
// capped at a height. The pages read the live Worker API, so the numbers are
// whatever the data says on the day.

const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'QAImages');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.slice(2).find(arg => !arg.startsWith('--')) || '';
const WIDTH = 1280;
const SCALE = 1.5;

const D = 'DomesticEurope.html';
const C = 'ContinentalEurope.html';
const q = params => new URLSearchParams(params).toString();

// A search-mode page: the question as a visitor would type it, routed the
// way search.js routes it
function searchUrl(search, question, scope) {
    const result = search.searchFor(question, scope).results[0];
    if (!result) throw new Error(`No search result for "${question}"`);
    return `${result.href}&${q({ search: result.kind, q: question, scope })}`;
}

function shots(search) {
    return [
        // League Tables
        { name: 'league-tables-01-past-season', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'bundesliga', season: '2023-24' })}`,
            from: '#leagueFiltersContent', to: '#tableContainer', max: 1500 },
        { name: 'league-tables-02-home-only', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'ligue-1', season: '2022-23', away: '0' })}`,
            from: '#leagueFiltersContent .flex.flex-wrap', to: '#tableContainer', max: 1000, fromMatch: 'Match Results' },
        { name: 'league-tables-03-date-range', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'premier-league', from: '2016-07-01' })}`,
            from: '#leagueFiltersContent', to: '#tableContainer', max: 1500 },
        { name: 'league-tables-04-premier-league-era', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'premier-league', season: 'premier-league-era-1992-2025' })}`,
            from: '#tableInfo', to: '#tableContainer', max: 800 },
        { name: 'league-tables-05-team-record', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'bundesliga', t1: 'Borussia Dortmund' })}`,
            from: '#tableInfo', to: '#matchHistoryVisualizations', max: 1100 },
        { name: 'league-tables-06-match-history', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'bundesliga', t1: 'Borussia Dortmund' })}`,
            from: '#matchHistoryTable', to: '#matchHistoryTable', max: 800 },
        { name: 'league-tables-07-head-to-head', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'la-liga', t1: 'Real Madrid', t2: 'Atlético Madrid' })}`,
            from: '#tableInfo', to: '#h2hVisualizations', max: 1100 },
        { name: 'league-tables-08-head-to-head-matches', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'la-liga', t1: 'Real Madrid', t2: 'Atlético Madrid' })}`,
            from: '#h2hMatchesTable', to: '#h2hMatchesTable', max: 800 },
        { name: 'league-tables-09-complex-filters', byHand: true, url: `${D}?${q({ view: 'league-filters', lg: 'premier-league', t1: 'Arsenal FC', t2: 'Chelsea FC', home: '0', h2hN: '20' })}`,
            from: '#tableInfo', to: '#h2hMatchesTable', max: 1700 },
        { name: 'league-tables-10-several-opponents', byHand: true,
            url: `${D}?view=league-filters&lg=serie-a&t1=Inter&${['Juventus', 'AC Milan', 'AS Roma', 'SSC Napoli'].map(t => `t2=${encodeURIComponent(t)}`).join('&')}`,
            from: '#tableInfo', to: '#tableContainer', max: 900 },

        // Seasons
        { name: 'seasons-01-team-history', byHand: true, url: `${D}?${q({ view: 'team-seasons', lg: 'ligue-1', t1: 'Olympique Lyonnais' })}`,
            from: '#teamHistoryTable', to: '#teamHistoryTable', max: 900 },
        { name: 'seasons-02-position', byHand: true, url: `${D}?${q({ view: 'team-seasons', lg: 'bundesliga', pos: '2' })}`,
            from: '#teamHistoryTable', to: '#teamHistoryTable', max: 900 },
        { name: 'seasons-03-team-records', byHand: true, url: `${D}?${q({ view: 'team-seasons', lg: 'premier-league', sub: 'records', stat: 'points', order: 'most', pos: '2' })}`,
            from: '#teamSeasonsContent', to: '#teamRecordsTable', max: 1600 },
        { name: 'seasons-04-league-history', byHand: true, url: `${D}?${q({ view: 'team-seasons', lg: 'la-liga', sub: 'league', rank: 'gap', order: 'fewest' })}`,
            click: '#leagueHistoryBody .league-history-expand',
            from: '#leagueHistoryTable', to: '#leagueHistoryTable', max: 1300 },

        // Match Finder
        { name: 'match-finder-01-biggest-victories', byHand: true, url: `${D}?${q({ view: 'match-finder', lg: 'serie-a', t1: 'AC Milan' })}`,
            from: '#matchFinderResults', to: '#matchFinderResults', max: 900 },
        { name: 'match-finder-02-most-recent', byHand: true, url: `${D}?${q({ view: 'match-finder', lg: 'la-liga', t1: 'Atlético Madrid', cat: 'recent' })}`,
            from: '#matchFinderResultContainer', to: '#matchFinderResults', max: 1100 },
        { name: 'match-finder-03-comebacks', byHand: true, url: `${C}?${q({ view: 'match-finder', lg: 'champions-league', cat: 'comebacks', mode: 'tie' })}`,
            from: '#matchFinderResults', to: '#matchFinderResults', max: 1000 },

        // Team Streaks
        { name: 'team-streaks-01-active-controls', byHand: true, url: `${D}?${q({ view: 'team-streaks', lg: 'premier-league', t1: 'Tottenham Hotspur', t2: 'Chelsea FC', type: 'winless', loc: 'away' })}`,
            from: '#teamStreaksContent', toTop: '#teamStreaksResults', max: 1400 },
        { name: 'team-streaks-02-active-result', byHand: true, url: `${D}?${q({ view: 'team-streaks', lg: 'premier-league', t1: 'Tottenham Hotspur', t2: 'Chelsea FC', type: 'winless', loc: 'away' })}`,
            from: '#teamStreaksResults', to: '#teamStreaksResults', max: 1500 },
        { name: 'team-streaks-03-historic', byHand: true, url: `${D}?${q({ view: 'team-streaks', lg: 'bundesliga', t1: 'Bayern München', type: 'unbeaten', status: 'historic', loc: 'home' })}`,
            from: '#teamStreaksResults', to: '#teamStreaksResults', max: 900 },

        // Search
        // Taken by hand for now: headless Chrome gets no crests from the
        // crest host (429), and here a missing crest shows as a broken image.
        // --force retakes them anyway.
        { name: 'search-01-results', byHand: true, url: 'index.html', type: { text: 'Paris Saint-Germain', scope: 'domestic' },
            from: '.search-bar', to: '.search-results', max: 900, pad: 24 },
        { name: 'search-02-answer', byHand: true, url: searchUrl(search, 'Most goals in a La Liga season', 'la-liga'),
            from: '#searchAnswer', to: '#teamRecordsTable', max: 800 },

        { name: 'search-03-era', byHand: true, url: searchUrl(search, 'Arsenal vs Chelsea', 'premier-league'),
            from: '#searchModeBar', to: '#h2hMatchesTable', max: 1500 },
        { name: 'search-04-final-table', byHand: true, url: searchUrl(search, 'Serie A 2005-06', 'serie-a'),
            from: '#searchModeBar', to: '#teamHistoryTable', max: 1100 },
        { name: 'search-05-last-time', byHand: true, url: searchUrl(search, 'Last time Olympique Marseille beat Paris Saint-Germain', 'ligue-1'),
            from: '#searchModeBar', to: '#matchFinderResults', max: 1500 },
        { name: 'search-06-streak', byHand: true, url: searchUrl(search, 'Bayer Leverkusen longest unbeaten run', 'bundesliga'),
            from: '#searchModeBar', to: '#teamStreaksResults', max: 1300 },
        { name: 'search-07-date', byHand: true, url: searchUrl(search, 'Premier League table on Christmas Day 2003', 'premier-league'),
            from: '#searchModeBar', to: '#tableContainer', max: 1100 },
        { name: 'search-08-champions-league', byHand: true, url: searchUrl(search, 'Liverpool penalty shootouts', 'champions-league'),
            from: '#searchModeBar', to: '#matchHistoryTable', max: 1600 },

        // Champions League
        { name: 'champions-league-01-one-season', byHand: true, url: `${C}?${q({ view: 'league-filters', lg: 'champions-league', season: '2018-19' })}`,
            from: '#tableInfo', to: '#tableContainer', max: 1100 },
        { name: 'champions-league-02-qualifiers', byHand: true, url: `${C}?${q({ view: 'league-filters', lg: 'champions-league', season: '2016-17', stage: 'Play-Offs (Q)' })}`,
            from: '#leagueFiltersContent', to: '#tableContainer', max: 1900 }
    ];
}

function startServer() {
    const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
    const server = http.createServer((req, res) => {
        const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function take(browser, base, shot) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(String(err.message || err)));
    await page.setViewport({ width: WIDTH, height: 900, deviceScaleFactor: SCALE });
    // light mode, whatever the machine prefers
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto(`${base}/${shot.url}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(3500);
    if (shot.type) {
        await page.select('.search-scope', shot.type.scope);
        await page.type('.search-input', shot.type.text, { delay: 30 });
        await page.waitForSelector('.search-results:not(.hidden)', { timeout: 10000 });
        await wait(800);
    }
    if (shot.click) {
        await page.evaluate(sel => {
            const el = document.querySelector(sel);
            if (el) el.click();
        }, shot.click);
        await wait(3000);
    }
    const clip = await page.evaluate(({ from, to, toTop, max, pad = 0, fromMatch }) => {
        let start = document.querySelector(from);
        if (fromMatch) start = [...document.querySelectorAll(from)].find(el => el.textContent.includes(fromMatch)) || start;
        const end = document.querySelector(toTop || to);
        if (!start || !end) return null;
        const a = start.getBoundingClientRect();
        const b = end.getBoundingClientRect();
        // the white card the content sits in sets the width
        // the page's white card sets the width, so every shot of a page is
        // the same width with no background showing; the home page's search
        // has no card, so it keeps its own width
        const card = start.closest('.main-card');
        const c = (card || start).getBoundingClientRect();
        const left = Math.max(0, c.left - pad);
        const right = Math.min(document.documentElement.clientWidth, c.right + pad);
        const top = a.top + window.scrollY - pad;
        const bottom = (toTop ? b.top : b.bottom) + window.scrollY + pad;
        return { x: left, y: Math.max(0, top), width: right - left, height: Math.min(bottom - top, max) };
    }, shot);
    if (!clip || clip.height < 40) throw new Error(`${shot.name}: nothing to capture (${JSON.stringify(clip)})`);
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), clip, captureBeyondViewport: true });
    await page.close();
    return errors;
}

module.exports = { shots };

if (require.main === module) (async () => {
    const vm = require('./search/questions');
    const search = vm.loadSearch(fs.readFileSync(path.join(ROOT, 'search.js'), 'utf8'));
    const list = shots(search).filter(s => s.name.includes(ONLY));
    list.filter(s => s.byHand && !FORCE).forEach(s => console.log(`${s.name}.png - taken by hand, kept (--force to retake)`));
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
    let failed = 0;
    try {
        for (const shot of list.filter(s => !s.byHand || FORCE)) {
            try {
                const errors = await take(browser, base, shot);
                console.log(`${shot.name}.png${errors.length ? ` (script errors: ${errors.join('; ')})` : ''}`);
            } catch (err) {
                failed++;
                console.log(`FAILED ${shot.name}: ${err.message}`);
            }
        }
    } finally {
        await browser.close();
        server.close();
    }
    if (failed) process.exit(1);
})();
