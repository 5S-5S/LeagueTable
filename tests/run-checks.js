// Checks to run before each push - one command:
//
//   cd tests && npm run check          # everything (~5 minutes)
//   npm run check:quick                # desktop pages only, no phone runs
//   npm run check:update               # accept the current routing and
//                                      # exact answers as the new expected
//                                      # ones (review the diff before committing)
//
// 1. Routing: every question in the search question set
//    (search/questions.js, ~1,500) through search.js, compared with
//    search/routing-snapshot.txt - any change is listed.
// 2. Pages: the four sport pages (desktop, and phone width for the Mobile
//    pages) in headless Chrome - every tab and Seasons sub-tab clicked, no
//    script error, Team Records and League History draw rows; and League
//    Tables filter combinations that once showed nothing.
// 3. Exact answers (checks/answers.json "exact"): questions about the past,
//    whose answer can't change - the answer line and its note, word for
//    word.
// 4. Answer shapes (checks/answers.json "shape"): questions touching the
//    current season, whose numbers move with each sync - the answer matches
//    a pattern. And every dropdown example (smoke): an answer appears, no
//    script error, no hang.
//
// The pages are served by a small server here and read the live Worker
// API, so the checks need a network connection (and the API up). Chrome:
// the installed Google Chrome (CHROME_PATH to use another).

const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { loadSearch, buildQuestions, describeResults } = require('./search/questions');

const ROOT = path.join(__dirname, '..');
const ARGS = new Set(process.argv.slice(2));
const QUICK = ARGS.has('--quick');
const UPDATE = ARGS.has('--update');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROUTING_SNAPSHOT = path.join(__dirname, 'search', 'routing-snapshot.txt');
const ANSWERS = path.join(__dirname, 'checks', 'answers.json');
const PARALLEL = 5;
const ANSWER_TIMEOUT_MS = 25000;
const SEARCH_MODE_KINDS = ['h2h', 'team', 'table', 'match-finder', 'team-seasons', 'team-streaks', 'team-records', 'league-history'];

const failures = [];
const fail = (section, message) => failures.push(`[${section}] ${message}`);

// --- 1. Routing ---

const search = loadSearch(fs.readFileSync(path.join(ROOT, 'search.js'), 'utf8'));

function checkRouting() {
    const questions = buildQuestions(search);
    const now = questions.map(([q, scope]) => `${scope} | ${q}\n${describeResults(search.searchFor(q, scope)).replace(/^/gm, '    ')}`).join('\n') + '\n';
    if (UPDATE || !fs.existsSync(ROUTING_SNAPSHOT)) {
        fs.writeFileSync(ROUTING_SNAPSHOT, now);
        console.log(`Routing: ${questions.length} questions, snapshot ${UPDATE ? 'updated' : 'written'}`);
        return;
    }
    const was = fs.readFileSync(ROUTING_SNAPSHOT, 'utf8');
    if (was === now) {
        console.log(`Routing: ${questions.length} questions, as the snapshot`);
        return;
    }
    // Compare question by question (blocks start at a line with no indent)
    const blocks = text => new Map(text.split(/\n(?=\S)/).filter(Boolean).map(b => [b.split('\n')[0], b.trim()]));
    const before = blocks(was), after = blocks(now);
    let changed = 0;
    for (const [key, block] of after) {
        if (before.get(key) === block) continue;
        changed++;
        fail('routing', `${key}\n      was: ${(before.get(key) || '(new question)').split('\n').slice(1, 2).join('').trim()}\n      now: ${block.split('\n').slice(1, 2).join('').trim()}`);
    }
    for (const key of before.keys()) if (!after.has(key)) { changed++; fail('routing', `${key}: no longer in the question set`); }
    console.log(`Routing: ${questions.length} questions, ${changed} differ from the snapshot (npm run check:update to accept)`);
}

// --- A static server for the pages ---

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

function startServer() {
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

// --- Pages in Chrome ---

// A page with its script errors collected (console errors too, except
// resources that failed to load - hotlinked crests)
async function openPage(browser, url, phone) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(String(err.message || err).split('\n')[0]));
    page.on('console', msg => {
        if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) errors.push(`console: ${msg.text().slice(0, 160)}`);
    });
    if (phone) await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    else await page.setViewport({ width: 1300, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    return { page, errors };
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function checkPages(browser, base) {
    const pages = [['DomesticEurope', false], ['ContinentalEurope', false]];
    if (!QUICK) pages.push(['DomesticEuropeMobile', true], ['ContinentalEuropeMobile', true]);
    for (const extra of ['index', 'qa', 'contact']) {
        const { page, errors } = await openPage(browser, `${base}/${extra}.html`, false);
        await wait(500);
        errors.forEach(e => fail('pages', `${extra}.html: ${e}`));
        await page.close();
    }
    for (const [name, phone] of pages) {
        const { page, errors } = await openPage(browser, `${base}/${name}.html`, phone);
        await wait(1500);
        for (const tab of ['matchFinderTab', 'teamStreaksTab', 'teamSeasonsTab', 'leagueFiltersTab', 'teamSeasonsTab']) {
            await page.click(`#${tab}`);
            await wait(1200);
        }
        // Seasons sub-tabs: Team Records and League History draw rows
        for (const [sub, body] of [['records', '#teamRecordsBody'], ['league', '#leagueHistoryBody'], ['history', null]]) {
            await page.click(`#seasonsSubTabButtons [data-sub="${sub}"]`);
            if (!body) continue;
            const rows = await page.waitForFunction(sel => document.querySelectorAll(`${sel} > tr`).length > 3 && !/Loading/.test(document.querySelector(sel).innerText),
                { timeout: 30000 }, body).then(() => true).catch(() => false);
            if (!rows) fail('pages', `${name}: ${sub} drew no rows`);
        }
        errors.forEach(e => fail('pages', `${name}: ${e}`));
        console.log(`Pages: ${name} - ${errors.length ? `${errors.length} error(s)` : 'ok'}`);
        await page.close();
    }

    // League Tables states that once showed nothing: [page, filters,
    // what the info line must say]
    const states = [
        ['ContinentalEurope', 'season=2016-17&exM=1', /\(92 total matches\)/],
        ['ContinentalEurope', 'season=2016-17&stage=Play-Offs+(Q)', /\(20 total matches\)/]
    ];
    for (const [name, filters, expect] of states) {
        for (const phone of QUICK ? [false] : [false, true]) {
            const pageName = phone ? `${name}Mobile` : name;
            const { page, errors } = await openPage(browser, `${base}/${pageName}.html?view=league-filters&lg=champions-league&${filters}`, phone);
            const ok = await page.waitForFunction(re => new RegExp(re).test(document.getElementById('tableInfoText').textContent),
                { timeout: 30000 }, expect.source).then(() => true).catch(() => false);
            if (!ok) fail('pages', `${pageName} ${filters}: info line "${await page.evaluate(() => document.getElementById('tableInfoText').textContent)}"`);
            errors.forEach(e => fail('pages', `${pageName} ${filters}: ${e}`));
            await page.close();
        }
    }
    console.log(`Pages: ${states.length} League Tables states`);

    // "Something wrong?": a tab's link opens the contact form with Data
    // Issue picked and the tab's current address in the message
    {
        const { page, errors } = await openPage(browser, `${base}/DomesticEurope.html?view=team-seasons&lg=serie-a&sub=records&stat=points`, false);
        await wait(1500);
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('.seasons-records-only .report-link')]);
        const form = await page.evaluate(() => ({ subject: document.getElementById('subject').value, message: document.getElementById('message').value }));
        if (form.subject !== 'data' || !/Page: .*DomesticEurope\.html\?view=team-seasons&lg=serie-a&sub=records.*stat=points/.test(form.message)) {
            fail('pages', `report link: contact form "${form.subject}" / "${form.message.slice(0, 120)}"`);
        }
        errors.forEach(e => fail('pages', `report link: ${e}`));
        await page.close();
        console.log('Pages: report link');
    }
}

// A question's search-mode page and its answer line ({ answer, note,
// errors }), or a page with no search mode loaded for errors only
async function answerFor(browser, base, q, scope, phone) {
    const result = search.searchFor(q, scope).results[0];
    if (!result) return { routed: false };
    let href = result.href;
    if (SEARCH_MODE_KINDS.includes(result.kind)) href += `&${new URLSearchParams({ search: result.kind, q, scope })}`;
    if (phone) href = href.replace(/^(\w+)\.html/, '$1Mobile.html');
    const { page, errors } = await openPage(browser, `${base}/${href}`, phone);
    let answer = '', note = '';
    if (SEARCH_MODE_KINDS.includes(result.kind)) {
        // the answer once it stops changing (it redraws as data arrives)
        let last = null, stableSince = Date.now();
        const deadline = Date.now() + ANSWER_TIMEOUT_MS;
        while (Date.now() < deadline) {
            const now = await page.evaluate(() => {
                const el = document.getElementById('searchAnswer');
                const text = el.querySelector('.search-answer-text');
                const n = el.querySelector('.search-answer-note');
                return { answer: text ? text.innerText.replace(/\s+/g, ' ').trim() : '', note: n ? n.innerText.replace(/\s+/g, ' ').trim() : '', loading: !!el.querySelector('.search-answer-loading') };
            });
            const key = JSON.stringify(now);
            if (key !== last) { last = key; stableSince = Date.now(); }
            if (now.answer && !now.loading && Date.now() - stableSince > 1500) { answer = now.answer; note = now.note; break; }
            await wait(300);
        }
    } else {
        await wait(1500);
    }
    await page.close();
    return { routed: true, kind: result.kind, searchMode: SEARCH_MODE_KINDS.includes(result.kind), answer, note, errors };
}

// Run tasks a few at a time
async function pool(items, worker) {
    let next = 0;
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
        while (next < items.length) {
            const item = items[next++];
            await worker(item);
        }
    }));
}

async function checkAnswers(browser, base) {
    const expected = JSON.parse(fs.readFileSync(ANSWERS, 'utf8'));
    let exactChanged = 0;

    // 3. Exact answers
    await pool(expected.exact, async item => {
        const got = await answerFor(browser, base, item.q, item.scope, !!item.phone);
        got.errors && got.errors.forEach(e => fail('answers', `${item.q} (${item.scope}): ${e}`));
        if (!got.routed) { fail('answers', `${item.q} (${item.scope}): no search result`); return; }
        if (UPDATE) {
            if (item.answer !== got.answer || (item.note || '') !== got.note) exactChanged++;
            item.answer = got.answer;
            if (got.note) item.note = got.note; else delete item.note;
            return;
        }
        if (got.answer !== item.answer) fail('answers', `${item.q} (${item.scope})\n      expected: ${item.answer}\n      got:      ${got.answer || '(no answer)'}`);
        else if ((item.note || '') !== got.note) fail('answers', `${item.q} (${item.scope}) note\n      expected: ${item.note || '(none)'}\n      got:      ${got.note || '(none)'}`);
    });
    if (UPDATE) {
        fs.writeFileSync(ANSWERS, JSON.stringify(expected, null, 2) + '\n');
        console.log(`Exact answers: ${expected.exact.length}, ${exactChanged} updated`);
    } else {
        console.log(`Exact answers: ${expected.exact.length} checked`);
    }

    // 4. Shapes
    await pool(expected.shape, async item => {
        const got = await answerFor(browser, base, item.q, item.scope, !!item.phone);
        got.errors && got.errors.forEach(e => fail('shapes', `${item.q} (${item.scope}): ${e}`));
        if (!got.routed || !new RegExp(item.pattern).test(got.answer)) {
            fail('shapes', `${item.q} (${item.scope})\n      pattern: ${item.pattern}\n      got:     ${got.answer || '(no answer)'}`);
        }
    });
    console.log(`Answer shapes: ${expected.shape.length} checked`);

    // Smoke: every dropdown example, desktop (and phone unless --quick)
    const examples = [];
    for (const scope of ['domestic', 'premier-league', 'la-liga', 'serie-a', 'bundesliga', 'ligue-1', 'champions-league']) {
        search.examples(scope).forEach(q => {
            examples.push([q, scope, false]);
            if (!QUICK) examples.push([q, scope, true]);
        });
    }
    await pool(examples, async ([q, scope, phone]) => {
        const got = await answerFor(browser, base, q, scope, phone);
        const where = `${q} (${scope}${phone ? ', phone' : ''})`;
        if (!got.routed) { fail('examples', `${where}: no search result`); return; }
        got.errors.forEach(e => fail('examples', `${where}: ${e}`));
        if (got.searchMode && !got.answer && !['league-history'].includes(got.kind)) fail('examples', `${where}: no answer line`);
    });
    console.log(`Examples: ${examples.length} opened`);
}

(async () => {
    const started = Date.now();
    checkRouting();
    const server = await startServer();
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run'] });
    try {
        await checkPages(browser, base);
        await checkAnswers(browser, base);
    } finally {
        await browser.close();
        server.close();
    }
    const took = Math.round((Date.now() - started) / 1000);
    if (failures.length) {
        console.log(`\n${failures.length} problem(s):\n`);
        failures.forEach(f => console.log(`  ${f}`));
        console.log(`\nFAILED (${took}s)`);
        process.exit(1);
    }
    console.log(`\nAll checks passed (${took}s)`);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
