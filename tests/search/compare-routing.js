// Search routing compared with a git ref: runs the question set
// (questions.js) through search.js as it is in the working copy and as it
// is in a git ref (main by default), and prints every question whose
// results differ - the full result list (kind, title, detail and link),
// not just the first.
//
//   node tests/search/compare-routing.js           # working copy vs main
//   node tests/search/compare-routing.js HEAD~3    # ... vs any ref
//
// A difference isn't necessarily a regression - a new feature changes
// routes on purpose - so read the list: every line should be one you
// meant. (run-checks.js does the same against a saved snapshot instead of
// a git ref.)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSearch, buildQuestions, describeResults } = require('./questions');

const root = path.join(__dirname, '..', '..');
const ref = process.argv[2] || 'main';

const before = loadSearch(execFileSync('git', ['show', `${ref}:search.js`], { cwd: root, encoding: 'utf8' }));
const after = loadSearch(fs.readFileSync(path.join(root, 'search.js'), 'utf8'));

const first = r => r.results[0]
    ? `${r.results[0].kind} | ${r.results[0].title} | ${r.results[0].detail} (${r.results.length} results)`
    : `none - ${r.message}`;

const questions = buildQuestions(before, after);
let differ = 0;
for (const [q, scope] of questions) {
    const a = before.searchFor(q, scope);
    const b = after.searchFor(q, scope);
    if (describeResults(a) === describeResults(b)) continue;
    differ++;
    console.log(`${scope.padEnd(16)} ${q}\n    ${ref}: ${first(a)}\n    now:  ${first(b)}`);
}
console.log(`\n${questions.length} questions, ${differ} differ from ${ref}`);
