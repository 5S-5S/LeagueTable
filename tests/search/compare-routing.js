// Search routing check: runs one big question set through search.js as it
// is in the working copy and as it is in a git ref (main by default), and
// prints every question whose results differ - the full result list
// (kind, title, detail and link), not just the first.
//
//   node tests/search/compare-routing.js           # working copy vs main
//   node tests/search/compare-routing.js HEAD~3    # ... vs any ref
//
// A difference isn't necessarily a regression - a new feature changes
// routes on purpose - so read the list: every line should be one you
// meant. Questions: each dropdown's examples, ~90 templates filled with
// clubs from each dropdown, the phrasings quoted in past commit messages
// (questions-from-history.txt) and the season-record questions
// (questions-records.txt). First used 2026-10-06 for the Seasons work: 1,230
// questions, every difference intended. A seed for the automated checks
// (TODO.md, "Automated checks").
//
// Runs search.js in a plain Node context (no page): searchFor() only needs
// its own tables, so nothing is fetched.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const ref = process.argv[2] || 'main';

function load(source) {
    const ctx = { console, setTimeout, clearTimeout, Promise, URLSearchParams, URL, Date, Math, JSON, Intl, Map, Set, RegExp, Number, String, Array, Object };
    ctx.window = ctx;
    ctx.document = { addEventListener() {}, querySelector() { return null; } };
    ctx.localStorage = { getItem() { return null; }, setItem() {} };
    ctx.fetch = () => Promise.reject(new Error('offline'));
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    return ctx.LeagueSearch;
}

const before = load(execFileSync('git', ['show', `${ref}:search.js`], { cwd: root, encoding: 'utf8' }));
const after = load(fs.readFileSync(path.join(root, 'search.js'), 'utf8'));
const lines = file => fs.readFileSync(path.join(__dirname, file), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

// Clubs per dropdown (T = Team 1, U = an opponent) and the league's name (L)
const SCOPES = {
    'domestic': [['Arsenal', 'Chelsea'], ['Barcelona', 'Real Madrid'], ['Juventus', 'Inter']],
    'premier-league': [['Liverpool', 'Manchester United'], ['Aston Villa', 'Birmingham']],
    'la-liga': [['Real Madrid', 'Atletico Madrid']],
    'serie-a': [['AC Milan', 'Inter']],
    'bundesliga': [['Bayern', 'Dortmund']],
    'ligue-1': [['PSG', 'Marseille']],
    'champions-league': [['Real Madrid', 'Bayern'], ['Liverpool', 'AC Milan'], ['Celtic', 'Ajax']]
};
const LEAGUE_NAMES = {
    'domestic': 'Serie A', 'premier-league': 'Premier League', 'la-liga': 'La Liga', 'serie-a': 'Serie A',
    'bundesliga': 'Bundesliga', 'ligue-1': 'Ligue 1', 'champions-league': 'Champions League'
};
const TEMPLATES = lines('templates.txt');

const questions = [];
for (const [scope, pairs] of Object.entries(SCOPES)) {
    // every example in the dropdown, as the old and new versions list them
    new Set([...before.examples(scope), ...after.examples(scope)]).forEach(q => questions.push([q, scope]));
    pairs.forEach(([t, u], i) => TEMPLATES.forEach(tpl => {
        if (!/\bT\b/.test(tpl) && i > 0) return; // no-club templates once per dropdown
        questions.push([tpl.replace(/\bL\b/, LEAGUE_NAMES[scope]).replace(/\bT\b/, t).replace(/\bU\b/, u), scope]);
    }));
}
for (const file of ['questions-from-history.txt', 'questions-records.txt']) {
    lines(file).forEach(q => ['domestic', 'premier-league', 'champions-league'].forEach(scope => questions.push([q, scope])));
}

const describe = r => r.results.length
    ? r.results.map(x => `${x.kind}|${x.title}|${x.detail}|${x.href}`).join('\n')
    : `message: ${r.message}`;
const first = r => r.results[0] ? `${r.results[0].kind} | ${r.results[0].title} | ${r.results[0].detail} (${r.results.length} results)` : `none - ${r.message}`;

let differ = 0;
for (const [q, scope] of questions) {
    const a = before.searchFor(q, scope);
    const b = after.searchFor(q, scope);
    if (describe(a) === describe(b)) continue;
    differ++;
    console.log(`${scope.padEnd(16)} ${q}\n    ${ref}: ${first(a)}\n    now:  ${first(b)}`);
}
console.log(`\n${questions.length} questions, ${differ} differ from ${ref}`);
