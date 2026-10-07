#!/usr/bin/env python3
"""
Refresh upcoming fixtures in D1 from football-data.org, for the home
page's upcoming-matches strip (index.html).

Pulls every not-yet-played match (status SCHEDULED, which also returns
TIMED) in the next --days days for the five domestic leagues and the
Champions League - one API call per competition - maps team names to the
site's own names using the score scripts' mappings, and writes them to the
`fixtures` table (see backend/worker/schema.sql):

  1. Upsert every fetched fixture, stamped with this run's fetched_at.
  2. Only once all of those succeeded, delete fixtures from earlier runs
     that weren't in this fetch (played, postponed or dropped). A run that
     fails part-way therefore leaves yesterday's fixtures in place instead
     of an empty table.
  3. Bump the 'fixtures-version' key in KV, which the Worker's
     /api/upcoming cache is keyed on. Deliberately a separate key from
     sync.mjs's 'cache-version', so refreshing fixtures daily doesn't throw
     away the (expensive) standings caches.

Unmapped team names are skipped (not guessed) and printed as warnings -
add them to the relevant team_map in update_domestic_scores.py /
update_champions_league_scores.py, the same fix as for results.

Required env vars:
    FOOTBALL_DATA_API_KEY   same key the score scripts use
    CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN
                            same as the D1 sync (not needed for --dry-run)

Usage:
    python3 scripts/update_fixtures.py [--days 21] [--dry-run] [--json-out FILE]

--json-out also saves the fetched fixtures to FILE, in the same shape as
the D1 table's rows - used to give the upcoming-matches strip a fixed
fixture list while it's built, before the table is live. Combine with
--dry-run to skip D1 entirely.
"""

import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

import update_domestic_scores as domestic
import update_champions_league_scores as continental

FOOTBALL_DATA_BASE = domestic.FOOTBALL_DATA_BASE

# Same KV namespace sync.mjs bumps 'cache-version' in (not a secret - see
# backend/worker/wrangler.toml).
CACHE_KV_NAMESPACE_ID = "b2fa8b93e59540749923768aaf1fc08d"

# D1's HTTP API allows at most 100 bound parameters per statement
COLUMNS = ["match_id", "div", "utc_date", "home_team", "away_team",
           "matchday", "competition_phase", "status", "fetched_at"]
ROWS_PER_INSERT = 100 // len(COLUMNS)


def fetch_upcoming(fd_code, api_key, date_from, date_to):
    url = (
        f"{FOOTBALL_DATA_BASE}/competitions/{fd_code}/matches"
        f"?dateFrom={date_from}&dateTo={date_to}&status=SCHEDULED"
    )
    data = domestic.http_get_json(url, headers={"X-Auth-Token": api_key})
    return data.get("matches", [])


def to_fixture(match, div, resolve, fetched_at, warnings, phase_map=None):
    home = resolve(match["homeTeam"]["name"])
    away = resolve(match["awayTeam"]["name"])
    if home is None or away is None:
        return None  # unmapped - already recorded in warnings

    phase = None
    if phase_map is not None:
        stage = match.get("stage")
        phase = phase_map.get(stage)
        if phase is None:
            warnings.append(f"UNKNOWN STAGE {stage!r} for {match['homeTeam']['name']} vs {match['awayTeam']['name']} - skipped")
            return None

    return {
        "match_id": match["id"],
        "div": div,
        "utc_date": match["utcDate"],
        "home_team": home,
        "away_team": away,
        "matchday": match.get("matchday"),
        "competition_phase": phase,
        "status": match["status"],
        "fetched_at": fetched_at,
    }


def collect_fixtures(api_key, date_from, date_to, fetched_at):
    fixtures, warnings = [], []

    for league_key, cfg in domestic.LEAGUES.items():
        unmapped = []
        matches = fetch_upcoming(cfg["fd_code"], api_key, date_from, date_to)
        resolve = lambda name: domestic.resolve_team_name(name, cfg["team_map"], unmapped)
        league_fixtures = [f for f in (to_fixture(m, cfg["div"], resolve, fetched_at, warnings) for m in matches) if f]
        print(f"{league_key}: {len(matches)} upcoming, {len(league_fixtures)} mapped")
        fixtures += league_fixtures
        warnings += [f"UNMAPPED TEAM {name!r} ({league_key})" for name in sorted(set(unmapped))]

    unmapped = []
    matches = fetch_upcoming(continental.FD_CODE, api_key, date_from, date_to)
    resolve = lambda name: continental.resolve_team_name(name, unmapped)
    cl_fixtures = [f for f in (to_fixture(m, continental.DIV, resolve, fetched_at, warnings, continental.STAGE_MAP) for m in matches) if f]
    print(f"champions-league: {len(matches)} upcoming, {len(cl_fixtures)} mapped")
    fixtures += cl_fixtures
    warnings += [f"UNMAPPED TEAM {name!r} (champions-league)" for name in sorted(set(unmapped))]

    return fixtures, warnings


def cloudflare_request(url, token, method="POST", body=None, content_type="application/json"):
    data = body.encode("utf-8") if isinstance(body, str) else body
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": content_type,
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    if not result.get("success"):
        raise RuntimeError(f"Cloudflare request failed: {result.get('errors')}")
    return result


def run_d1(sql, params, account_id, database_id, token):
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{database_id}/query"
    return cloudflare_request(url, token, body=json.dumps({"sql": sql, "params": params}))


# Same definition as backend/worker/schema.sql - run on every write so the
# table exists without a separate manual migration step (both statements
# are no-ops once it's there).
CREATE_TABLE_SQL = [
    "CREATE TABLE IF NOT EXISTS fixtures ("
    "match_id INTEGER PRIMARY KEY, div TEXT NOT NULL, utc_date TEXT NOT NULL, "
    "home_team TEXT NOT NULL, away_team TEXT NOT NULL, matchday INTEGER, "
    "competition_phase TEXT, status TEXT NOT NULL, fetched_at TEXT NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_fixtures_utc_date ON fixtures(utc_date)",
]


def write_fixtures(fixtures, fetched_at, account_id, database_id, token):
    for sql in CREATE_TABLE_SQL:
        run_d1(sql, [], account_id, database_id, token)

    placeholders = "(" + ", ".join("?" for _ in COLUMNS) + ")"
    for i in range(0, len(fixtures), ROWS_PER_INSERT):
        batch = fixtures[i:i + ROWS_PER_INSERT]
        sql = (
            f"INSERT OR REPLACE INTO fixtures ({', '.join(COLUMNS)}) VALUES "
            + ", ".join(placeholders for _ in batch)
        )
        params = [row[col] for row in batch for col in COLUMNS]
        run_d1(sql, params, account_id, database_id, token)

    # Only now, with every fetched fixture written: drop the ones this run
    # didn't see (played, postponed or dropped since the last refresh)
    result = run_d1("DELETE FROM fixtures WHERE fetched_at != ?", [fetched_at], account_id, database_id, token)
    return result["result"][0].get("meta", {}).get("changes", 0)


def bump_fixtures_version(account_id, token, fetched_at):
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/storage/kv/namespaces/{CACHE_KV_NAMESPACE_ID}/values/fixtures-version"
    )
    cloudflare_request(url, token, method="PUT", body=fetched_at, content_type="text/plain")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=21,
                        help="How many days ahead to fetch (default 21; the page shows 14)")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and map, but don't write to D1")
    parser.add_argument("--json-out", metavar="FILE",
                        help="Also save the fetched fixtures to FILE as JSON (same shape as the D1 rows)")
    args = parser.parse_args()

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
    if not api_key:
        sys.exit("FOOTBALL_DATA_API_KEY environment variable is required.")

    now = datetime.now(timezone.utc)
    fetched_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    date_from = now.date().isoformat()
    date_to = (now.date() + timedelta(days=args.days)).isoformat()
    print(f"Fetching upcoming fixtures {date_from} to {date_to} (UTC)")

    fixtures, warnings = collect_fixtures(api_key, date_from, date_to, fetched_at)
    print(f"Total: {len(fixtures)} fixtures")
    for warning in warnings:
        print(f"  WARNING: {warning}")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as out:
            json.dump(sorted(fixtures, key=lambda f: (f["utc_date"], f["div"], f["home_team"])),
                      out, ensure_ascii=False, indent=1)
            out.write("\n")
        print(f"Saved {len(fixtures)} fixtures to {args.json_out}")

    if args.dry_run:
        for f in sorted(fixtures, key=lambda f: f["utc_date"])[:15]:
            print(f"  {f['utc_date']}  {f['div']:>3}  {f['home_team']} vs {f['away_team']}"
                  + (f"  [{f['competition_phase']}]" if f["competition_phase"] else ""))
        print("Dry run - nothing written.")
        return

    if not fixtures:
        # An empty fetch is far more likely an API problem than a genuinely
        # empty fortnight across six competitions - keep the old fixtures.
        sys.exit("No fixtures fetched - refusing to clear the table.")

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    database_id = os.environ.get("CLOUDFLARE_DATABASE_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not (account_id and database_id and token):
        sys.exit("CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID and CLOUDFLARE_API_TOKEN are required.")

    removed = write_fixtures(fixtures, fetched_at, account_id, database_id, token)
    print(f"Wrote {len(fixtures)} fixtures, removed {removed} stale.")
    bump_fixtures_version(account_id, token, fetched_at)
    print("Bumped fixtures-version.")


if __name__ == "__main__":
    main()
