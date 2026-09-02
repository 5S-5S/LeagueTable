# Domestic scores auto-update

`update_domestic_scores.py` pulls the last week of finished matches for the
5 domestic leagues from football-data.org and appends any new results to
the matching gist. Since `DomesticEurope.html` / `DomesticEuropeMobile.html`
always fetch a gist's latest revision (they strip the commit hash from the
URL), updating the gist is the entire deployment — no HTML changes needed.

## One-time setup

1. Get a free API key: https://www.football-data.org/register
2. Create a GitHub personal access token with the `gist` scope:
   https://github.com/settings/tokens
3. In this repo, go to Settings → Secrets and variables → Actions, and add:
   - `FOOTBALL_DATA_API_KEY` — the key from step 1
   - `GIST_PAT` — the token from step 2
4. **Before relying on the schedule**, run a dry run and check the output
   for `UNMAPPED TEAM(S)` warnings:

   ```
   FOOTBALL_DATA_API_KEY=... python3 scripts/update_domestic_scores.py --dry-run --days 30
   ```

   The `team_map` dictionaries in the script were written from memory of
   football-data.org's usual naming conventions, not verified against a
   live response. Any name that comes back differently than expected will
   be skipped (not guessed) and printed as a warning — add it to the
   relevant league's `team_map` and re-run until warnings are gone.

Once that's clean, the GitHub Actions workflow
(`.github/workflows/update-domestic-scores.yml`) runs automatically every
day at 06:00 UTC. It can also be triggered manually from the Actions tab
("Run workflow") with custom `days` / `dry_run` inputs.
