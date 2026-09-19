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
- [ ] Cloudflare account authenticated locally (`wrangler login`) — **you**
      need to do this interactively, see below
- [ ] D1 database created (`npm run db:create` in `worker/`)
- [ ] Schema + seed data loaded into D1
- [ ] First endpoint: `GET /api/team-history?div=&team=` (single-team
      match history — the simplest query, chosen as the first cut)
- [ ] Frontend's single-team Match History view switched to call the
      Worker instead of computing from the full gist-loaded dataset
- [ ] Everything else (head-to-head, standings, Team Seasons filters) —
      one endpoint at a time, same pattern

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

## Next steps (needs you)

1. If you don't have one, create a free Cloudflare account:
   https://dash.cloudflare.com/sign-up
2. Authenticate wrangler locally — this opens a browser OAuth flow, has
   to be done by you interactively:
   ```
   cd backend/worker
   npx wrangler login
   ```
3. Once authenticated, tell me and I'll create the D1 database, load the
   schema, run the backfill, and start on the first endpoint.

## Regenerating the seed data

The backfill script re-fetches the live gists, so it always reflects
whatever's currently in them:

```
cd backend/migration
npm install
node migrate.mjs > ../worker/seed.sql
```
