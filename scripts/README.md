# Scores auto-update

Two scripts, same shape: pull the last week of finished matches from
football-data.org and append any new results to the matching gist. Since
`DomesticEurope.html`/`Mobile.html` and `ContinentalEurope.html`/`Mobile.html`
always fetch a gist's latest revision (they strip the commit hash from the
URL), updating the gist is the entire deployment — no HTML changes needed.

- `update_domestic_scores.py` — Premier League, La Liga, Serie A,
  Bundesliga, Ligue 1. Appends to each league's own `2526*.csv` gist.
- `update_champions_league_scores.py` — Champions League. Appends to
  `championsleague2526.csv` only. football-data.org's free tier doesn't
  cover qualifying rounds, so `clqualifiers.csv` stays manually maintained
  and this script never touches it.

## One-time setup

1. Get a free API key: https://www.football-data.org/register
2. Create a GitHub personal access token with the `gist` scope:
   https://github.com/settings/tokens
3. In this repo, go to Settings → Secrets and variables → Actions, and add:
   - `FOOTBALL_DATA_API_KEY` — the key from step 1
   - `GIST_PAT` — the token from step 2 (both scripts share these two secrets)
4. **Before relying on the schedule**, run a dry run for each script and
   check the output for unmapped-team warnings:

   ```
   FOOTBALL_DATA_API_KEY=... python3 scripts/update_domestic_scores.py --dry-run --days 30
   FOOTBALL_DATA_API_KEY=... python3 scripts/update_champions_league_scores.py --dry-run --days 30
   ```

   Each script's team-name mapping was verified against a live API roster
   at the time it was written, but rosters change every season (promotions,
   relegations, new CL qualifiers). Any name that comes back unexpectedly
   is skipped (not guessed) and printed as a warning — add it to the
   relevant mapping and re-run until warnings are gone.

Once that's clean, the GitHub Actions workflows
(`.github/workflows/update-domestic-scores.yml`,
`.github/workflows/update-champions-league-scores.yml`) run automatically
every day at 06:00 and 06:15 UTC respectively. Either can also be triggered
manually from the Actions tab ("Run workflow") with custom `days` / `dry_run`
inputs.
