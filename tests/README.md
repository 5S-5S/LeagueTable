# Checks

Run before each push:

```
cd tests
npm install          # once (puppeteer-core - uses the installed Google Chrome)
npm run check        # everything, ~3 minutes
npm run check:quick  # desktop pages only, ~2 minutes
```

It prints `All checks passed`, or each problem and `FAILED` (exit code 1).

## What it checks

1. **Search routing** - ~1,500 questions (`search/questions.js`: each
   dropdown's examples, `search/templates.txt` per dropdown, phrasings from
   past commits, season-record questions) through `search.js`, compared
   with `search/routing-snapshot.txt`.
2. **Pages** - the four sport pages in headless Chrome (desktop, and the
   Mobile pages at phone width): every tab and Seasons sub-tab clicked, no
   script error, Team Records and League History draw rows. Plus the home,
   Q&A and contact pages load cleanly.
3. **Exact answers** (`checks/answers.json` → `exact`) - questions whose
   answer can only change when a season ends: the answer line and its note,
   word for word.
4. **Answer shapes** (`checks/answers.json` → `shape`) - questions touching
   the current season: the answer matches a pattern. And every dropdown
   example opens with an answer and no script error (desktop and phone).

The pages read the live Worker API, so the checks need a network
connection.

## When something changes on purpose

A new search route, a reworded answer, a record broken at a season's end:

```
npm run check:update   # rewrites routing-snapshot.txt and the exact answers
git diff tests/        # read it - every change should be one you meant
```

and commit the updated files with the change. Shapes are edited by hand.

To add a question: append it to `checks/answers.json` (`exact` with an
empty `answer`, then `npm run check:update` and check what it recorded; or
`shape` with a `pattern`), or to a `search/*.txt` file for routing only.

`search/compare-routing.js` compares routing with a git ref instead of the
snapshot (`node search/compare-routing.js main`).
