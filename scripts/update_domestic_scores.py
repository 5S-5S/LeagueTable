#!/usr/bin/env python3
"""
Pull the last week of finished results for the top 5 European leagues from
football-data.org, dedupe against what's already in each league's gist, and
append only the genuinely new rows.

Because DomesticEurope.html / DomesticEuropeMobile.html strip the commit hash
from every gist URL before fetching (see stripGistCommitHash in those files),
updating a gist's content is the entire deployment — no HTML file edit or
site rebuild is needed after this script runs.

Required environment variables:
    FOOTBALL_DATA_API_KEY   API key from https://www.football-data.org/register
    GIST_PAT                GitHub personal access token with the `gist` scope

Usage:
    python3 scripts/update_domestic_scores.py            # live run, appends new rows
    python3 scripts/update_domestic_scores.py --dry-run   # prints what would change, writes nothing
    python3 scripts/update_domestic_scores.py --days 10   # look back further than the default 7 days
"""

import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - Python < 3.9 fallback
    print("This script requires Python 3.9+ (zoneinfo).", file=sys.stderr)
    raise

UK_TZ = ZoneInfo("Europe/London")

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
GITHUB_API_BASE = "https://api.github.com"

# --------------------------------------------------------------------------
# Per-league configuration.
#
# team_map translates a football-data.org team name to the EXACT string
# already used in DomesticEurope.html's color arrays and the existing gist
# rows. Getting this wrong doesn't corrupt anything visually — a team name
# that doesn't match an existing string just won't have a color/crest — but
# it's still worth getting right. These mappings are a best-effort based on
# football-data.org's usual naming conventions and have NOT been verified
# against a live API response (no key was available while writing this).
# Run with --dry-run first and check the "UNMAPPED TEAM" warnings before
# ever enabling the scheduled workflow; patch team_map with whatever names
# actually come back.
# --------------------------------------------------------------------------
LEAGUES = {
    "premier-league": {
        "fd_code": "PL",
        "div": "E0",
        "gist_id": "fa353dfa11e18395ff657f2196a45129",
        "filename": "2526prem.csv",
        "team_map": {
            "AFC Bournemouth": "AFC Bournemouth",
            "Arsenal FC": "Arsenal FC",
            "Aston Villa FC": "Aston Villa",
            "Brentford FC": "Brentford FC",
            "Brighton & Hove Albion FC": "Brighton & Hove Albion",
            "Burnley FC": "Burnley FC",
            "Chelsea FC": "Chelsea FC",
            "Crystal Palace FC": "Crystal Palace",
            "Everton FC": "Everton FC",
            "Fulham FC": "Fulham FC",
            "Leeds United FC": "Leeds United",
            "Liverpool FC": "Liverpool FC",
            "Manchester City FC": "Manchester City",
            "Manchester United FC": "Manchester United",
            "Newcastle United FC": "Newcastle United",
            "Nottingham Forest FC": "Nottingham Forest",
            "Sunderland AFC": "Sunderland AFC",
            "Tottenham Hotspur FC": "Tottenham Hotspur",
            "West Ham United FC": "West Ham United",
            "Wolverhampton Wanderers FC": "Wolverhampton Wanderers",
            "Hull City AFC": "Hull City",
            "Ipswich Town FC": "Ipswich Town",
            "Coventry City FC": "Coventry City",
        },
    },
    "la-liga": {
        "fd_code": "PD",
        "div": "SP1",
        "gist_id": "03928e4a8ea1899826fa8507de7a7753",
        "filename": "2526laliga.csv",
        "team_map": {
            "Athletic Club": "Athletic Club",
            "Club Atlético de Madrid": "Atlético Madrid",
            "CA Osasuna": "CA Osasuna",
            "Deportivo Alavés": "CD Alavés",
            "Elche CF": "Elche CF",
            "RCD Espanyol de Barcelona": "Espanyol Barcelona",
            "FC Barcelona": "FC Barcelona",
            "Getafe CF": "Getafe CF",
            "Girona FC": "Girona FC",
            "Levante UD": "Levante UD",
            "Rayo Vallecano de Madrid": "Rayo Vallecano",
            "RC Celta de Vigo": "RC Celta",
            "RCD Mallorca": "RCD Mallorca",
            "Real Betis Balompié": "Real Betis",
            "Real Madrid CF": "Real Madrid",
            "Real Oviedo": "Real Oviedo",
            "Real Sociedad de Fútbol": "Real Sociedad",
            "Sevilla FC": "Sevilla FC",
            "Valencia CF": "Valencia CF",
            "Villarreal CF": "Villarreal CF",
            "Málaga CF": "Málaga CF",
            "RC Deportivo La Coruña": "Deportivo La Coruña",
            "Real Racing Club de Santander": "Racing Santander",
        },
    },
    "serie-a": {
        "fd_code": "SA",
        "div": "I1",
        "gist_id": "bcf66a873318f8287362194bf54e1c9b",
        "filename": "2526seriea.csv",
        "team_map": {
            "AC Milan": "AC Milan",
            "ACF Fiorentina": "ACF Fiorentina",
            "AS Roma": "AS Roma",
            "Atalanta BC": "Atalanta",
            "Bologna FC 1909": "Bologna FC",
            "Cagliari Calcio": "Cagliari Calcio",
            "Como 1907": "Como 1907",
            "Genoa CFC": "Genoa CFC",
            "Hellas Verona FC": "Hellas Verona",
            "FC Internazionale Milano": "Inter",
            "Juventus FC": "Juventus",
            "SS Lazio": "Lazio Roma",
            "Parma Calcio 1913": "Parma Calcio 1913",
            "Pisa Sporting Club": "Pisa SC",
            "US Sassuolo Calcio": "Sassuolo Calcio",
            "SSC Napoli": "SSC Napoli",
            "Torino FC": "Torino FC",
            "Udinese Calcio": "Udinese Calcio",
            "US Cremonese": "US Cremonese",
            "US Lecce": "US Lecce",
            "Venezia FC": "Venezia FC",
            "Frosinone Calcio": "Frosinone Calcio",
            "AC Monza": "AC Monza",
        },
    },
    "bundesliga": {
        "fd_code": "BL1",
        "div": "D1",
        "gist_id": "8178038874c8328042527d460b0677ed",
        "filename": "2526bundesliga.csv",
        "team_map": {
            "1. FC Heidenheim 1846": "1. FC Heidenheim 1846",
            "1. FC Köln": "1. FC Köln",
            "1. FC Union Berlin": "1. FC Union Berlin",
            "1. FSV Mainz 05": "1. FSV Mainz 05",
            "TSG 1899 Hoffenheim": "1899 Hoffenheim",
            "Bayer 04 Leverkusen": "Bayer Leverkusen",
            "FC Bayern München": "Bayern München",
            "Borussia Mönchengladbach": "Bor. Mönchengladbach",
            "Borussia Dortmund": "Borussia Dortmund",
            "Eintracht Frankfurt": "Eintracht Frankfurt",
            "FC Augsburg": "FC Augsburg",
            "FC St. Pauli 1910": "FC St. Pauli",
            "Hamburger SV": "Hamburger SV",
            "RB Leipzig": "RB Leipzig",
            "Sport-Club Freiburg": "SC Freiburg",
            "VfB Stuttgart": "VfB Stuttgart",
            "VfL Wolfsburg": "VfL Wolfsburg",
            "SV Werder Bremen": "Werder Bremen",
            "FC Schalke 04": "FC Schalke 04",
            "SC Paderborn 07": "SC Paderborn 07",
            "SV 07 Elversberg": "SV Elversberg",
        },
    },
    "ligue-1": {
        "fd_code": "FL1",
        "div": "F1",
        "gist_id": "1f3282f6f02422622c47b7a7a7512c91",
        "filename": "2526ligue.csv",
        "team_map": {
            "AJ Auxerre": "AJ Auxerre",
            "Angers SCO": "Angers SCO",
            "AS Monaco FC": "AS Monaco",
            "FC Lorient": "FC Lorient",
            "FC Metz": "FC Metz",
            "FC Nantes": "FC Nantes",
            "Le Havre AC": "Havre AC",
            "Lille OSC": "Lille OSC",
            "OGC Nice": "OGC Nice",
            "Olympique Lyonnais": "Olympique Lyonnais",
            "Olympique de Marseille": "Olympique Marseille",
            "Paris FC": "Paris FC",
            "Paris Saint-Germain FC": "Paris Saint-Germain",
            "Racing Club de Lens": "RC Lens",
            "RC Strasbourg Alsace": "RC Strasbourg",
            "Stade Brestois 29": "Stade Brestois 29",
            "Stade Rennais FC 1901": "Stade Rennais",
            "Toulouse FC": "Toulouse FC",
            "ES Troyes AC": "ESTAC Troyes",
            "Le Mans FC": "Le Mans FC",
        },
    },
}


def normalize_for_fallback_match(name):
    """Loosely normalize a team name for fallback matching when the exact
    string isn't in team_map (strips common club-suffix words)."""
    strip_words = {"fc", "cf", "afc", "ac", "sc", "cfc", "the", "club"}
    tokens = [t for t in name.lower().replace(".", "").replace("-", " ").split() if t not in strip_words]
    return " ".join(tokens)


def http_get_json(url, headers, retries=3, backoff=5):
    req = urllib.request.Request(url, headers=headers)
    last_error = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                # football-data.org rate limit — back off and retry
                time.sleep(backoff * (attempt + 1))
                last_error = e
                continue
            raise
        except urllib.error.URLError as e:
            last_error = e
            time.sleep(backoff)
    raise last_error


def fetch_finished_matches(fd_code, api_key, date_from, date_to):
    url = (
        f"{FOOTBALL_DATA_BASE}/competitions/{fd_code}/matches"
        f"?dateFrom={date_from}&dateTo={date_to}&status=FINISHED"
    )
    data = http_get_json(url, headers={"X-Auth-Token": api_key})
    return data.get("matches", [])


def match_to_row(match, div, team_map, warnings):
    home_name_raw = match["homeTeam"]["name"]
    away_name_raw = match["awayTeam"]["name"]

    home_name = resolve_team_name(home_name_raw, team_map, warnings)
    away_name = resolve_team_name(away_name_raw, team_map, warnings)
    if home_name is None or away_name is None:
        return None

    full_time = match.get("score", {}).get("fullTime", {})
    home_goals = full_time.get("home")
    away_goals = full_time.get("away")
    if home_goals is None or away_goals is None:
        return None  # not actually finished / abandoned — skip

    utc_dt = datetime.fromisoformat(match["utcDate"].replace("Z", "+00:00"))
    uk_dt = utc_dt.astimezone(UK_TZ)

    if home_goals > away_goals:
        ftr = "H"
    elif away_goals > home_goals:
        ftr = "A"
    else:
        ftr = "D"

    return {
        "Div": div,
        "Date": uk_dt.strftime("%d/%m/%Y"),
        "Time": uk_dt.strftime("%H:%M"),
        "HomeTeam": home_name,
        "AwayTeam": away_name,
        "FTHG": str(home_goals),
        "FTAG": str(away_goals),
        "FTR": ftr,
    }


def resolve_team_name(raw_name, team_map, warnings):
    if raw_name in team_map:
        return team_map[raw_name]

    # Fallback: normalized comparison against known mapped values
    normalized_raw = normalize_for_fallback_match(raw_name)
    for known_value in team_map.values():
        if normalize_for_fallback_match(known_value) == normalized_raw:
            return known_value

    warnings.append(raw_name)
    return None


def fetch_gist_file_content(gist_id, filename, token):
    url = f"{GITHUB_API_BASE}/gists/{gist_id}"
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    data = http_get_json(url, headers=headers)
    file_info = data["files"].get(filename)
    if file_info is None:
        raise RuntimeError(f"File {filename} not found in gist {gist_id}")
    content = file_info["content"]
    if file_info.get("truncated"):
        # Large gist — the API only returns a preview; fetch the raw_url in full
        raw_req = urllib.request.Request(file_info["raw_url"])
        with urllib.request.urlopen(raw_req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
    return content


def push_gist_file_content(gist_id, filename, content, token):
    url = f"{GITHUB_API_BASE}/gists/{gist_id}"
    body = json.dumps({"files": {filename: {"content": content}}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status


def existing_row_key(row):
    return (row["Date"], row["HomeTeam"], row["AwayTeam"])


def update_league(league_key, cfg, api_key, gist_token, date_from, date_to, dry_run):
    print(f"\n=== {league_key} ({cfg['fd_code']}) ===")
    warnings = []

    matches = fetch_finished_matches(cfg["fd_code"], api_key, date_from, date_to)
    print(f"  Fetched {len(matches)} finished matches from football-data.org")

    new_rows = []
    for match in matches:
        row = match_to_row(match, cfg["div"], cfg["team_map"], warnings)
        if row is not None:
            new_rows.append(row)

    if warnings:
        unique_warnings = sorted(set(warnings))
        print("  UNMAPPED TEAM(S) — these matches were skipped, add them to team_map:")
        for w in unique_warnings:
            print(f"    - {w!r}")

    if not new_rows:
        print("  No mappable finished matches in range.")
        return

    existing_content = fetch_gist_file_content(cfg["gist_id"], cfg["filename"], gist_token)
    reader = csv.DictReader(io.StringIO(existing_content))
    fieldnames = reader.fieldnames
    existing_rows = list(reader)
    existing_keys = {existing_row_key(r) for r in existing_rows}

    rows_to_append = [r for r in new_rows if existing_row_key(r) not in existing_keys]

    # de-dupe within the batch itself too, in case the API returned a match twice
    seen = set()
    deduped_rows_to_append = []
    for r in rows_to_append:
        k = existing_row_key(r)
        if k not in seen:
            seen.add(k)
            deduped_rows_to_append.append(r)
    rows_to_append = deduped_rows_to_append

    if not rows_to_append:
        print("  Nothing new — all fetched matches already present in the gist.")
        return

    print(f"  {len(rows_to_append)} new row(s) to append:")
    for r in rows_to_append:
        print(f"    {r['Date']} {r['Time']}  {r['HomeTeam']} {r['FTHG']}-{r['FTAG']} {r['AwayTeam']}")

    if dry_run:
        print("  (dry run — gist not modified)")
        return

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(existing_rows)
    writer.writerows(rows_to_append)

    push_gist_file_content(cfg["gist_id"], cfg["filename"], output.getvalue(), gist_token)
    print(f"  Pushed update to gist {cfg['gist_id']} ({cfg['filename']})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=7, help="How many days back to pull (default 7)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would change without writing to any gist")
    parser.add_argument(
        "--league",
        action="append",
        choices=list(LEAGUES.keys()),
        help="Limit to specific league(s); can be passed multiple times. Default: all 5.",
    )
    args = parser.parse_args()

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
    gist_token = os.environ.get("GIST_PAT")
    if not api_key:
        sys.exit("FOOTBALL_DATA_API_KEY environment variable is required.")
    if not gist_token and not args.dry_run:
        sys.exit("GIST_PAT environment variable is required (unless using --dry-run).")

    today_utc = datetime.now(timezone.utc).date()
    date_from = (today_utc - timedelta(days=args.days)).isoformat()
    date_to = today_utc.isoformat()

    leagues_to_run = args.league or list(LEAGUES.keys())

    print(f"Pulling finished matches from {date_from} to {date_to} (UTC)")
    for league_key in leagues_to_run:
        cfg = LEAGUES[league_key]
        try:
            update_league(league_key, cfg, api_key, gist_token, date_from, date_to, args.dry_run)
        except Exception as e:
            print(f"  ERROR updating {league_key}: {e}", file=sys.stderr)
        # football-data.org free tier: 10 req/min — small pause is cheap insurance
        time.sleep(2)


if __name__ == "__main__":
    main()
