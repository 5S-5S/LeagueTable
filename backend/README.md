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
      both Domestic and Continental), with a unique index on
      `(div, date, home_team, away_team)` that the daily sync relies on
- [x] `migration/lib.mjs` — shared gist-fetch/normalize logic (mirrors
      `processRawData()` in the frontend exactly)
- [x] `migration/migrate.mjs` — one-time/manual full backfill: emits a SQL
      seed file with every row, for the initial seed or a full rebuild
- [x] `migration/sync.mjs` — daily incremental sync (see below)
- [x] Cloudflare account authenticated locally (`wrangler login`)
- [x] D1 database created — `leaguetable`
      (`7069d435-b2d1-4b49-9510-8be2cf8119d9`, region WNAM)
- [x] Schema + seed data loaded into D1 (local and remote) — 166,519 rows
- [x] First endpoint live: `GET /api/team-history?div=&team=`
      https://leaguetable-api.league-table-api.workers.dev/api/team-history
      (single-team match history — the simplest query, chosen as the
      first cut). Verified against both apps' data (Arsenal FC / E0 and
      Real Madrid / C1) and against 404/missing-param/CORS-preflight cases.
- [x] Daily sync workflow active (`.github/workflows/sync-d1.yml`, 06:30
      UTC), authenticated via a `CLOUDFLARE_API_TOKEN` repo secret
- [x] `additional_info` column added (Continental penalty-shootout data,
      e.g. `pso 4:3`) — nullable, always `NULL` for Domestic
- [x] Frontend's single-team Match History view switched to call the
      Worker instead of computing from the full gist-loaded dataset, on
      all four pages: `DomesticEurope.html`, `DomesticEuropeMobile.html`,
      `ContinentalEurope.html`, `ContinentalEuropeMobile.html`
- [x] `migration/verify-parity.mjs` — full parity check (every team,
      every division) between the live gists and the API; run after any
      backend change that touches match data
- [ ] Everything else (head-to-head, standings, Team Seasons filters) —
      one endpoint at a time, same pattern

## Keeping D1 in sync

The daily GitHub Actions pipeline (`scripts/update_*_scores.py`) only
writes to the gists — it doesn't know D1 exists. `sync.mjs` closes that
gap separately: it re-fetches every gist (cheap, just network requests),
then only writes rows D1 doesn't already have.

**Important constraint:** D1's free tier caps writes at **100,000
rows/day**, and our dataset is 166,519 rows — so re-inserting everything
daily would blow the free tier on day one. `sync.mjs` avoids this by
finding each competition's most recent date already in D1 (a "watermark")
and only considering gist rows on/after that date as candidates — daily
volume in practice is a few dozen rows, not the whole dataset.
`INSERT OR IGNORE` plus the unique index is a safety net for the
boundary date (matches on the exact watermark date that are already
present get silently skipped rather than erroring).

Verified end-to-end: deleted a real row from the live database, ran
`sync.mjs`, confirmed it was the only row restored (with identical data)
and the total count was exactly right.

One D1-specific gotcha hit while building this: **D1 caps bound
parameters at 100 per query** (undocumented in the general limits until
you hit it — the error is a cryptic `too many SQL variables at offset
N`). At 8 columns/row that's a hard ceiling of 12 rows per `INSERT`
batch, which `sync.mjs` respects.

Also don't trust `meta.rows_written` from D1's HTTP API as "how many rows
actually got inserted" when using `INSERT OR IGNORE` — it was observed
reporting non-zero even when every row in a batch was an ignored
duplicate. `sync.mjs` instead compares a `SELECT COUNT(*)` before and
after to get the real number.

### Activating the daily sync

The workflow file exists but won't run correctly yet — it needs three
repo secrets (Settings → Secrets and variables → Actions), same place the
existing `FOOTBALL_DATA_API_KEY`/`GIST_PAT` secrets live:

- `CLOUDFLARE_ACCOUNT_ID` — `cdc1435f466da6e579b8a9e64a7bb6d4`
- `CLOUDFLARE_DATABASE_ID` — `7069d435-b2d1-4b49-9510-8be2cf8119d9`
- `CLOUDFLARE_API_TOKEN` — **needs to be created**: go to
  https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom
  token → permission `D1: Edit`, scoped to your account. (The token used
  to validate `sync.mjs` locally was a temporary OAuth token from
  `wrangler login`, which expires quickly and isn't meant for this — a
  proper API token is long-lived and independently revocable.)

Once those are added, either wait for the 06:30 UTC schedule or trigger
it manually from the Actions tab ("Run workflow").

## Layout

```
backend/
  worker/          Cloudflare Worker (the API) + D1 schema
    schema.sql
    wrangler.toml
    src/index.js
  migration/
    lib.mjs                       Shared gist-fetch/normalize logic
    migrate.mjs                   One-off full backfill (gists -> seed.sql)
    sync.mjs                      Daily incremental sync (gists -> D1, new rows only)
    backfill-additional-info.mjs  One-off: backfill additional_info for rows inserted before that column existed
    verify-parity.mjs             Full gist-vs-API parity check, every team/division
```

## Live endpoint

```
GET https://leaguetable-api.league-table-api.workers.dev/api/team-history?div=E0&team=Arsenal%20FC
```

`div` is the same competition code the frontend already uses internally
(E0/SP1/I1/D1/F1 for Domestic, C1/E1/C2 for Continental).

## Data integrity

The initial `migrate.mjs` backfill ran before the commit-hash-stripping fix
existed (see git history for `decodeGistUrl`), so it read a frozen gist
snapshot rather than current data. This surfaced as 9 teams (2 in SP1, 7 in
C1 - e.g. `AC Sparta Praha` vs the gists' current `Sparta Prague`) whose
names had since been standardized upstream; `sync.mjs`'s watermark-based
design only catches new matches, never retroactive corrections to old
rows, so these stayed stale in D1 indefinitely. Fixed with one-off
`UPDATE` statements renaming the 9 teams in D1 to match the gists.

Run `verify-parity.mjs` after any change that touches match data (schema
changes, bulk updates, a new endpoint reading raw D1 rows) - it'll catch
exactly this kind of drift by diffing every team's full match list against
the live gists.

## Next steps

1. Build the next endpoint (head-to-head is the next simplest: two teams,
   optionally two divs).
2. Keep working through the rest of the site's features the same way -
   standings, Team Seasons filters, etc.

## Regenerating the seed data (manual full rebuild only)

`sync.mjs` is what normally keeps D1 current. `migrate.mjs` is only for
the initial seed or a full rebuild:

```
cd backend/migration
npm install
node migrate.mjs > ../worker/seed.sql
```
