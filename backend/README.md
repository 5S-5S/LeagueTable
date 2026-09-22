# Backend migration (complete on this branch, not yet merged to main)

Moved match data off public gist URLs (anyone can `curl` the raw CSV
forever) into a Cloudflare D1 database sitting behind a Cloudflare Worker
API. The Worker only ever answers specific questions (a team's history, a
head-to-head, a table) — it never hands back the full dataset in one
request, the way the gists used to.

This happened gradually on the `backend-migration` branch, one endpoint
at a time, each proven before the frontend cut over to it. As of
2026-09-21, `loadGistData()` and every gist-fetching function have been
deleted from all four frontend pages (`DomesticEurope.html`,
`DomesticEuropeMobile.html`, `ContinentalEurope.html`,
`ContinentalEuropeMobile.html`) - the gist URLs are no longer reachable
from the client at all, which was always the actual finish line (not
just "every tab has an API"). **This branch has not been merged to
`main` yet** - that's a separate, deliberate step (see "Next steps").

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
- [x] `GET /api/head-to-head?div=&team1=&team2=` — two teams (team2 may be
      a comma-separated list, e.g. a "Big 6"/country grouping already
      resolved client-side). Match History and Team Streaks also cut over
      to team-history/head-to-head on all four pages.
- [x] `GET /api/standings?div=&dateFrom=&dateTo=&...` — full-division
      aggregated standings (raw/undeducted points; deductions stay
      client-side). Powers League Table with no team selected (Domestic
      and Continental's flat/non-grouped case), on all four pages.
- [x] `GET /api/season-matches?div=&dateFrom=&dateTo=` — raw matches for
      one division bounded to a single season. Powers Continental's
      League Table when a specific season is selected (the
      grouped-by-competition-phase view, which needs match-level
      granularity for its per-phase mini-tables and knockout
      match-history display), on both Continental pages.
- [x] `POST /api/season-standings` — batches a division's entire match
      history into requested season date ranges in one query/pass,
      returning each season's full (all-teams, raw/undeducted) standings
      plus each team's chronologically last match of the season
      (`lastMatch`, Continental-only, for tournament-progression display).
      Powers Team Seasons on all four pages (Domestic: rank-by-season;
      Continental: rank-by-season + progression/"reached the Final" search).
- [x] KV response cache for `/api/standings` and `/api/season-standings` —
      both scan an entire division on every call, so without caching the
      D1 read cost scales with *traffic* (a single visitor viewing League
      Table's default view plus Team Seasons for a couple of teams can
      read 150K+ rows; modest daily traffic can exhaust the 5M/day quota
      from normal use alone, not just heavy testing). Cached in the
      `leaguetable_cache` KV namespace (binding `CACHE` in
      `wrangler.toml`), keyed by a version counter rather than a blind
      TTL: `sync.mjs` bumps the `cache-version` KV key as its last step,
      only when new rows actually landed, so cached responses are never
      staler than "since the last sync" (the same lag already in the
      data) and a no-op sync doesn't needlessly invalidate anything.
      **Verify after setting up**: the CI `CLOUDFLARE_API_TOKEN` secret
      needs `Workers KV Storage:Edit` permission for the bump to work -
      it's a separate, narrower token from local `wrangler login`, so this
      isn't guaranteed by the D1 permissions it already has. The bump is
      wrapped in try/catch and won't fail the sync job if it's missing,
      but check `sync.mjs`'s logs after the next scheduled run for
      "Bumped cache-version" vs a "Failed to bump cache-version" warning.
- [x] Team Dashboard's "Last 5" snapshot and its date-range utilities
      (`getSeasonEraEndYear()`, `handleLeagueChange()`'s per-league
      default range, `updateLastDataUpdate()`, `clearFilters()`) cut over
      to team-history/the standings API's `matchDateRange`, on all four
      pages.
- [x] KV response cache extended to `/api/team-history`,
      `/api/head-to-head`, and `/api/season-matches` — reuses the same
      `withCache()`/`canonicalQueryKey()` machinery as `/api/standings`/
      `/api/season-standings`. **Every D1-backed endpoint the Worker
      currently exposes is now KV-cached** - no uncached read path left
      for existing traffic to exhaust the D1 quota through. **Deployed and
      verified live** (2026-09-21): cache-miss vs cache-hit timing -
      team-history 0.62s→0.12s, head-to-head 0.71s→0.08s, season-matches
      0.47s→0.07s - byte-identical responses, and confirmed present via
      `wrangler kv key list`.
- [x] `getLeagueTeams()` (team-name dropdown population) cut over to the
      hardcoded color/logo table on the two Domestic pages
      (`DomesticEurope.html`, `DomesticEuropeMobile.html`) — verified each
      league's bucket is a complete, exact match for the gists' actual
      roster first (fetched fresh from the gists, not D1 - zero D1 cost).
      Found and fixed one real data inconsistency along the way: "Viking
      FC"/"Viking FK" are the same club recorded under two different
      names within the same 2026 Champions League campaign (same class of
      drift as the 9 teams already noted below under "Data integrity",
      except inconsistent within a single season rather than just stale).
- [x] `GET /api/teams?div=` added, deployed, and wired up - distinct team
      roster per division from D1 (DISTINCT/UNION over
      home_team/away_team), KV-cached like `/api/standings` since it's a
      full-division scan. Built for Continental's `getLeagueTeams()`,
      which (unlike Domestic's) can't reuse the hardcoded color table -
      see the code comment on `handleTeams()` in `src/index.js` for why.
      Verified against production D1 (2026-09-21, see "Data integrity"
      below) - no drift, clean to use.
- [x] Continental's `getLeagueTeams()` (`ContinentalEurope.html`,
      `ContinentalEuropeMobile.html`) cut over to `/api/teams`. Stays
      synchronous for its callers (returns whatever's cached) while a new
      `ensureTeamsLoaded(div)` does the fetch and re-renders every
      consumer once it resolves - same eventual-consistency pattern as
      `ensureDivDateRangeLoaded`/`divDateRangeApiCache` already used
      elsewhere in these files. Verified live: team search, Team Seasons'
      dropdown, and Team Streaks' Team 1 dropdown all populate correctly
      from the real 567-team C1 roster, no console errors. **This was the
      last `state.data`-dependent feature on any of the four pages** -
      see "Next steps" for what that actually unlocks.
- [x] `loadGistData()` and the entire gist-fetching pipeline (
      `loadLeagueDataForDevice`, `filterDataForCurrentLeague`,
      `loadGistDataChunked`, `processRawData`, `decodeSingleBase64Url`,
      the `GIST_URLS`/`LEAGUE_CODES` constants, and Continental's
      qualifier-specific `isQualifierMatch`/`processQualifierData`)
      deleted from all four pages - this is what actually stops the
      client from downloading the gists, the real finish line for the
      whole migration. Several UI sections were still gated on
      `state.data.length` (the controls section, the table info line,
      the Team Dashboard search box) - dead weight that would have kept
      everything permanently hidden once nothing populated `state.data`
      anymore, fixed alongside the removal. `init()` needed an explicit
      `updateTable()`/etc. call added back too, since that used to only
      happen at the end of the now-deleted gist-load completion chain.
      Testing this surfaced two real, pre-existing frontend bugs in the
      Continental pages (both latent under the old design, only now
      visibly triggered): `state.teamSeasonsSelectedLeague` defaulted to
      `'serie-a'` (a Domestic value, meaningless here - fixed to
      `'champions-league'`), and `getTeamDashboardSnapshot()` crashed
      whenever a team was locked in the Team Dashboard *and* a specific
      season was selected, since it assumed `calculateTable()` always
      returns a flat `tableData` array, but a specific season delegates
      to `calculateGroupedTable()`, whose result is split per competition
      phase instead (fixed by searching every phase). See `git log` for
      the "Drop gist fetching entirely from ___" commits for full detail.

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

A second, different flavor of the same problem: **"Viking FC" / "Viking
FK"** (Norway) is recorded under both names within the same 2026
Champions League campaign - "Viking FC" for its August qualifiers,
"Viking FK" once it reached the League Phase in September. Unlike the
9-team case above, this isn't stale-vs-current drift fixed once and done
- it's the gists themselves being inconsistent about one club's name
within a single season, so D1 (and the API) currently has this team's
matches split across two identities. Not yet fixed in D1 - only worked
around in the frontend's hardcoded color table (both spellings map to
the same color/crestId, see `git log` for the "Viking FK/Viking FC data
inconsistency" commit). Fixing it properly means picking a canonical
name and a D1 `UPDATE`, the same pattern as the 9-team fix above -
watch for it recurring if the gists rename this team again next season.

**2026-09-21, investigated and resolved - false alarm, no production
drift:** building `GET /api/teams?div=` (see Status above) and testing
it against the **local dev D1 replica** first suggested the 9-team fix
above had regressed - `AC Sparta Praha` (one of the original 9) and 6
more of the same shape showed up stale, plus `Como 1907` looked missing
outright. Cross-checking directly against **production** once the daily
quota reset (a single query, conditional-aggregated and scoped to
`div='C1'` - 8,910 rows read, cheap) found **all of it clean**: every
team is under its correct current name (`Sparta Prague`: 164 rows vs
`AC Sparta Praha`: 0, and the same 0-vs-nonzero pattern for all 6
others), `Como 1907` is present with exactly 1 row (matching the gist),
and `total_c1_rows` (8,910) matches the gists' C1 count exactly.
**Root cause: the local dev D1 replica used for the first test is just
a stale local copy** - it isn't kept in sync with production the way
production D1 is kept in sync with the gists, so testing against it via
plain `wrangler dev` (not `--remote`) doesn't tell you anything about
current data. Lesson for next time: any check meant to say something
about *production* data state must run with `--remote`, or hit the live
Worker directly - the local replica is fine for testing query logic and
response shape, but not for parity/drift checks.

**Mind D1's free-tier daily row-read limit (5,000,000 rows/day).** A single
day of running `verify-parity.mjs` a few times, a couple of full-table
`UPDATE` fixes, and `verify-head-to-head.mjs` was enough to exhaust it -
`UPDATE ... WHERE div = ? AND home_team = ?` in particular reads far more
rows than it writes (one 18-statement rename fix alone read 246,400 rows).
Both verify scripts use `api-client.mjs`'s `fetchApiJson()`, which detects
the quota error and aborts the whole run immediately instead of looping
through the remaining checks (which would all fail the same way) - so a
verify script stopping with `INCOMPLETE` most likely means the quota
tripped, not that something's broken. When re-running verification after a
fix, prefer running each script once rather than repeating it "just to be
sure" - re-running an already-passed check burns quota for no new
information.

**Note this applies to manual/testing usage of D1 directly** (curl,
`wrangler d1 execute`, the verify scripts) - it does not describe the
Worker's own read cost anymore for `/api/standings` and
`/api/season-standings`, which are now KV-cached (see Status above) and
only hit D1 once per division per day. Testing *those* two endpoints
specifically is cheap regardless of how many times they're called, as
long as the cache isn't being bypassed - only a fresh D1 query (the first
call after a cache-version bump, or a query-param combination that's
never been requested that day) pays the full row-read cost.

## Next steps

The migration itself is done - `git grep 'loadGistData\|GIST_URLS'` across
all four frontend pages returns nothing. What's left is entirely about
shipping it:

1. Merge `backend-migration` to `main` when ready. This is the step that
   actually takes the site live on the new backend - nothing before this
   point has touched `main` or affected real users. Confirm first: the
   daily sync workflow is active (see "Activating the daily sync" above),
   and it's worth a final `verify-parity.mjs` run beforehand given D1's
   free-tier daily read quota (see "Data integrity").

## Regenerating the seed data (manual full rebuild only)

`sync.mjs` is what normally keeps D1 current. `migrate.mjs` is only for
the initial seed or a full rebuild:

```
cd backend/migration
npm install
node migrate.mjs > ../worker/seed.sql
```
