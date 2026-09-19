# Backend migration (in progress)

Moving match data off public gist URLs (anyone can `curl` the raw CSV
forever) into a Cloudflare D1 database sitting behind a Cloudflare Worker
API. The Worker only ever answers specific questions (a team's history, a
head-to-head, a table) — it never hands back the full dataset in one
request, the way the gists currently do.

This is happening gradually on the `backend-migration` branch. The
frontend keeps working against the gists as today until each endpoint
below is built and proven; nothing on `main` changes until a piece is
actually ready to cut over.

## Status

- [x] `worker/schema.sql` — D1 schema (single `matches` table covering
      both Domestic and Continental)
- [x] `migration/migrate.mjs` — one-time backfill script: fetches the
      same gist CSVs the live frontend uses today, normalizes them the
      same way `processRawData()` does, outputs `seed.sql`
- [x] Cloudflare account authenticated locally (`wrangler login`)
- [x] D1 database created — `leaguetable`
      (`7069d435-b2d1-4b49-9510-8be2cf8119d9`, region WNAM)
- [x] Schema + seed data loaded into D1 (local and remote) — 166,519 rows
- [x] First endpoint live: `GET /api/team-history?div=&team=`
      https://leaguetable-api.league-table-api.workers.dev/api/team-history
      (single-team match history — the simplest query, chosen as the
      first cut). Verified against both apps' data (Arsenal FC / E0 and
      Real Madrid / C1) and against 404/missing-param/CORS-preflight cases.
- [ ] Frontend's single-team Match History view switched to call the
      Worker instead of computing from the full gist-loaded dataset
- [ ] Everything else (head-to-head, standings, Team Seasons filters) —
      one endpoint at a time, same pattern
- [ ] Keeping D1 in sync going forward — the daily GitHub Actions pipeline
      (`scripts/update_*_scores.py`) still only writes to the gists; D1 is
      a point-in-time backfill until that's addressed

## Layout

```
backend/
  worker/         Cloudflare Worker (the API) + D1 schema
    schema.sql
    wrangler.toml
    src/index.js
  migration/       One-time backfill script (gists -> seed.sql)
    migrate.mjs
```

## Live endpoint

```
GET https://leaguetable-api.league-table-api.workers.dev/api/team-history?div=E0&team=Arsenal%20FC
```

`div` is the same competition code the frontend already uses internally
(E0/SP1/I1/D1/F1 for Domestic, C1/E1/C2 for Continental).

## Next steps

1. Wire up the frontend: the single-team Match History view in
   `DomesticEurope.html`/`ContinentalEurope.html` (and their Mobile
   counterparts) should call this endpoint instead of filtering the full
   in-memory gist dataset. Once that's live and confirmed working, do the
   same for the mobile files.
2. Build the next endpoint (head-to-head is the next simplest: two teams,
   optionally two divs).
3. Eventually: point `scripts/update_*_scores.py` at D1 too (or replace
   the gist writes entirely), so new results don't need a manual re-run
   of the backfill script.

## Regenerating the seed data

The backfill script re-fetches the live gists, so it always reflects
whatever's currently in them:

```
cd backend/migration
npm install
node migrate.mjs > ../worker/seed.sql
```
