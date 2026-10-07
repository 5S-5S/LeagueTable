// The search question set and a way to run search.js outside a page -
// shared by compare-routing.js and run-checks.js.
//
// Questions: each dropdown's examples, ~90 templates filled with clubs from
// each dropdown (templates.txt), the phrasings quoted in past commit
// messages (questions-from-history.txt) and the season-record questions
// (questions-records.txt).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// search.js in a plain Node context (no page): searchFor() only needs its
// own tables, so nothing is fetched
function loadSearch(source) {
    const ctx = { console, setTimeout, clearTimeout, Promise, URLSearchParams, URL, Date, Math, JSON, Intl, Map, Set, RegExp, Number, String, Array, Object };
    ctx.window = ctx;
    ctx.document = { addEventListener() {}, querySelector() { return null; } };
    ctx.localStorage = { getItem() { return null; }, setItem() {} };
    ctx.fetch = () => Promise.reject(new Error('offline'));
    vm.createContext(ctx);
    vm.runInContext(source, ctx);
    return ctx.LeagueSearch;
}

const lines = file => fs.readFileSync(path.join(__dirname, file), 'utf8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

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

// [question, dropdown] pairs. searches: LeagueSearch instances whose
// dropdown examples are all included (old and new, when comparing).
function buildQuestions(...searches) {
    const questions = [];
    const templates = lines('templates.txt');
    for (const [scope, pairs] of Object.entries(SCOPES)) {
        new Set(searches.flatMap(search => search.examples(scope))).forEach(q => questions.push([q, scope]));
        pairs.forEach(([t, u], i) => templates.forEach(tpl => {
            if (!/\bT\b/.test(tpl) && i > 0) return; // no-club templates once per dropdown
            questions.push([tpl.replace(/\bL\b/, LEAGUE_NAMES[scope]).replace(/\bT\b/, t).replace(/\bU\b/, u), scope]);
        }));
    }
    for (const file of ['questions-from-history.txt', 'questions-records.txt']) {
        lines(file).forEach(q => ['domestic', 'premier-league', 'champions-league'].forEach(scope => questions.push([q, scope])));
    }
    return questions;
}

// One question's results as a line per result (kind | title | detail | link)
function describeResults(r) {
    return r.results.length
        ? r.results.map(x => `${x.kind} | ${x.title} | ${x.detail} | ${x.href}`).join('\n')
        : `message: ${r.message}`;
}

module.exports = { loadSearch, buildQuestions, describeResults, SCOPES };
