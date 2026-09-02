#!/usr/bin/env python3
"""
Pull the last week of finished Champions League results from football-data.org,
dedupe against what's already in the current-season gist, and append only the
genuinely new rows.

Because ContinentalEurope.html / ContinentalEuropeMobile.html strip the commit
hash from every gist URL before fetching (see stripGistCommitHash in those
files), updating the gist's content is the entire deployment — no HTML file
edit or site rebuild is needed after this script runs.

football-data.org's free tier only covers the Champions League from the
League Phase onward (no qualifying rounds) — clqualifiers.csv is a separate,
manually-maintained gist and this script never touches it.

Required environment variables:
    FOOTBALL_DATA_API_KEY   API key from https://www.football-data.org/register
    GIST_PAT                GitHub personal access token with the `gist` scope

Usage:
    python3 scripts/update_champions_league_scores.py            # live run, appends new rows
    python3 scripts/update_champions_league_scores.py --dry-run   # prints what would change, writes nothing
    python3 scripts/update_champions_league_scores.py --days 10   # look back further than the default 7 days
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

FD_CODE = "CL"
DIV = "C1"
GIST_ID = "b1e5570e985d7fca4deabcc8a004e9e0"
FILENAME = "championsleague2526.csv"

# Maps football-data.org's `stage` enum to the exact CompetitionPhase strings
# already used in the site's gists (see championsleague.csv for the full set
# of historical phase names — this only needs the stages CL actually reaches
# from the League Phase onward).
STAGE_MAP = {
    "LEAGUE_STAGE": "League Phase",
    "PLAYOFFS": "Play-Offs",
    "LAST_16": "Round Of 16",
    "QUARTER_FINALS": "Quarter-Finals",
    "SEMI_FINALS": "Semi-Finals",
    "FINAL": "Final",
}

# football-data.org name -> exact string used in ContinentalEurope.html's
# color arrays. For Champions League, getTeamLogoNumber() falls back from the
# champions-league array to premier-league/la-liga/serie-a/bundesliga/ligue-1
# in turn, so a team already covered by a domestic team_map just needs to
# resolve to that same domestic string here too — no new color-array entries
# needed. Verified against the live 2026-27 CL league-phase roster (36 teams)
# via football-data.org's /competitions/CL/teams endpoint.
TEAM_MAP = {
    "Borussia Dortmund": "Borussia Dortmund",
    "FC Bayern München": "Bayern München",
    "VfB Stuttgart": "VfB Stuttgart",
    "Arsenal FC": "Arsenal FC",
    "Aston Villa FC": "Aston Villa",
    "Liverpool FC": "Liverpool FC",
    "Manchester City FC": "Manchester City",
    "Manchester United FC": "Manchester United",
    "Club Atlético de Madrid": "Atlético Madrid",
    "FC Barcelona": "FC Barcelona",
    "Real Madrid CF": "Real Madrid",
    "Real Betis Balompié": "Real Betis",
    "Villarreal CF": "Villarreal CF",
    "AS Roma": "AS Roma",
    "FC Internazionale Milano": "Inter",
    "SSC Napoli": "SSC Napoli",
    "Sporting Clube de Portugal": "Sporting CP",
    "FC Porto": "FC Porto",
    "Lille OSC": "Lille OSC",
    "Paris Saint-Germain FC": "Paris Saint-Germain",
    "Racing Club de Lens": "RC Lens",
    "Galatasaray SK": "Galatasaray",
    "Fenerbahçe SK": "Fenerbahçe",
    "PSV": "PSV Eindhoven",
    "Feyenoord Rotterdam": "Feyenoord",
    "RB Leipzig": "RB Leipzig",
    "Club Brugge KV": "Club Brugge KV",
    "SK Slavia Praha": "Slavia Praha",
    "FK Shakhtar Donetsk": "Shakhtar Donetsk",
    "PAE AEK": "AEK Athen",
    "LASK Linz": "LASK",
    "Viking FK": "Viking FK",
    "FK Bodø/Glimt": "FK Bodø/Glimt",
    "Como 1907": "Como 1907",
    "ŠK Slovan Bratislava": "Slovan Bratislava",
    "Sabah FK": "Sabah FK",
}


def normalize_for_fallback_match(name):
    """Loosely normalize a team name for fallback matching when the exact
    string isn't in TEAM_MAP (strips common club-suffix words)."""
    strip_words = {"fc", "cf", "afc", "ac", "sc", "fk", "sk", "cfc", "the", "club"}
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


def fetch_finished_matches(api_key, date_from, date_to):
    url = (
        f"{FOOTBALL_DATA_BASE}/competitions/{FD_CODE}/matches"
        f"?dateFrom={date_from}&dateTo={date_to}&status=FINISHED"
    )
    data = http_get_json(url, headers={"X-Auth-Token": api_key})
    return data.get("matches", [])


def resolve_team_name(raw_name, warnings):
    if raw_name in TEAM_MAP:
        return TEAM_MAP[raw_name]

    normalized_raw = normalize_for_fallback_match(raw_name)
    for known_value in TEAM_MAP.values():
        if normalize_for_fallback_match(known_value) == normalized_raw:
            return known_value

    warnings.append(raw_name)
    return None


def score_and_additional_info(score):
    """Compute (FTHG, FTAG, AdditionalInfo) from football-data.org's score
    object, matching the site's existing convention (verified against
    championsleague.csv's historical rows):
      - REGULAR / EXTRA_TIME: fullTime is the correct final score
        (fullTime == regularTime when no ET was needed); AdditionalInfo is
        "aet" only when extra time was played.
      - PENALTY_SHOOTOUT: football-data.org's fullTime incorrectly folds the
        penalty-shootout score into the goal tally, so the real 120-minute
        score has to be reconstructed from regularTime + extraTime instead;
        AdditionalInfo becomes "pso {home}:{away}".
    """
    duration = score.get("duration")

    if duration == "PENALTY_SHOOTOUT":
        reg = score.get("regularTime") or {}
        et = score.get("extraTime") or {}
        home = (reg.get("home") or 0) + (et.get("home") or 0)
        away = (reg.get("away") or 0) + (et.get("away") or 0)
        pens = score.get("penalties") or {}
        additional_info = f"pso {pens.get('home')}:{pens.get('away')}"
        return home, away, additional_info

    full_time = score.get("fullTime") or {}
    home = full_time.get("home")
    away = full_time.get("away")
    additional_info = "aet" if duration == "EXTRA_TIME" else ""
    return home, away, additional_info


def match_to_row(match, warnings):
    home_name_raw = match["homeTeam"]["name"]
    away_name_raw = match["awayTeam"]["name"]

    home_name = resolve_team_name(home_name_raw, warnings)
    away_name = resolve_team_name(away_name_raw, warnings)
    if home_name is None or away_name is None:
        return None

    stage = match.get("stage")
    phase = STAGE_MAP.get(stage)
    if phase is None:
        warnings.append(f"UNKNOWN STAGE {stage!r} for {home_name_raw} vs {away_name_raw} — skipped")
        return None

    home_goals, away_goals, additional_info = score_and_additional_info(match.get("score", {}))
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
        "Div": DIV,
        "CompetitionPhase": phase,
        "Date": uk_dt.strftime("%d/%m/%Y"),
        "Time": uk_dt.strftime("%H:%M"),
        "HomeTeam": home_name,
        "AwayTeam": away_name,
        "FTHG": str(home_goals),
        "FTAG": str(away_goals),
        "FTR": ftr,
        "AdditionalInfo": additional_info,
    }


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


def update_champions_league(api_key, gist_token, date_from, date_to, dry_run):
    print(f"\n=== champions-league ({FD_CODE}) ===")
    warnings = []

    matches = fetch_finished_matches(api_key, date_from, date_to)
    print(f"  Fetched {len(matches)} finished matches from football-data.org")

    new_rows = []
    for match in matches:
        row = match_to_row(match, warnings)
        if row is not None:
            new_rows.append(row)

    if warnings:
        unique_warnings = sorted(set(warnings))
        print("  WARNING(S) — these matches were skipped:")
        for w in unique_warnings:
            print(f"    - {w!r}")

    if not new_rows:
        print("  No mappable finished matches in range.")
        return

    existing_content = fetch_gist_file_content(GIST_ID, FILENAME, gist_token)
    reader = csv.DictReader(io.StringIO(existing_content))
    fieldnames = reader.fieldnames
    existing_rows = list(reader)
    existing_keys = {existing_row_key(r) for r in existing_rows}

    rows_to_append = [r for r in new_rows if existing_row_key(r) not in existing_keys]

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
        info = f" ({r['AdditionalInfo']})" if r["AdditionalInfo"] else ""
        print(f"    {r['Date']} {r['Time']} [{r['CompetitionPhase']}]  {r['HomeTeam']} {r['FTHG']}-{r['FTAG']} {r['AwayTeam']}{info}")

    if dry_run:
        print("  (dry run — gist not modified)")
        return

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()
    writer.writerows(existing_rows)
    writer.writerows(rows_to_append)

    push_gist_file_content(GIST_ID, FILENAME, output.getvalue(), gist_token)
    print(f"  Pushed update to gist {GIST_ID} ({FILENAME})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=7, help="How many days back to pull (default 7)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would change without writing to any gist")
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

    print(f"Pulling finished matches from {date_from} to {date_to} (UTC)")
    update_champions_league(api_key, gist_token, date_from, date_to, args.dry_run)


if __name__ == "__main__":
    main()
