#!/usr/bin/env python3
"""
Check that the site's data is fresh - run daily by
.github/workflows/check-freshness.yml, which files a GitHub issue when
anything here fails.

The update workflows already file issues when they crash. This catches
what goes wrong quietly: a job that "succeeds" without the new results, a
Worker that stops answering, the live-results cron failing (it has no
alert of its own), the dispatch token behind it expiring.

Checks:
  1. Every match football-data.org has as FINISHED in the last few days,
     kicked off more than 6 hours ago, is in the live API's results. That
     only fires when a match was played and not recorded - whichever path
     failed (live results, the score scripts, the sync) - so international
     breaks don't look stale. Run early in the morning (before the score
     scripts at 06:00 UTC), a match missing from yesterday is the live
     results cron's miss; one still missing a day later is the daily
     path's too.
  2. The live API answers (/api/upcoming, /api/snapped-streaks).
  3. The snapped streaks list was rebuilt in the last 30 hours, and
     today's On this day streaks are in KV.
  4. The Worker's GitHub dispatch token (which reruns the snapped streaks
     after live results): no failed dispatch in the last 3 days, and not
     expiring within 14 days. The Worker stores both in KV
     (requestSnappedStreaksUpdate in backend/worker/src/index.js).
  5. Team names football-data.org uses that the score scripts can't map
     (those matches would never be recorded).

Required env vars:
    FOOTBALL_DATA_API_KEY                       same key the score scripts use
    CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN  for the KV reads (checks 3-4)

Usage:
    python3 scripts/check_freshness.py [--days 3] [--report FILE]

Prints what it checked; exits 1 if anything failed, with the problems
also written to --report as Markdown (the issue's text).
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import update_domestic_scores as domestic
import update_champions_league_scores as continental

API_BASE = "https://leaguetable-api.league-table-api.workers.dev"
# Same KV namespace as sync.mjs and update_fixtures.py (not a secret)
CACHE_KV_NAMESPACE_ID = "b2fa8b93e59540749923768aaf1fc08d"
# Same window as the Worker's LIVE_POLL_UNTIL_HOURS: after this the live
# results cron has given up on a match
RECORDED_WITHIN_HOURS = 6
SNAPPED_MAX_AGE_HOURS = 30
TOKEN_WARNING_DAYS = 14
DISPATCH_ERROR_DAYS = 3


def api_get(path):
    req = urllib.request.Request(API_BASE + path, headers={"User-Agent": "leaguetable-freshness-check"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def kv_get(key, account_id, token):
    """A KV value as text, or None when the key isn't there."""
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/storage/kv/namespaces/{CACHE_KV_NAMESPACE_ID}/values/{urllib.parse.quote(key, safe='')}"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def finished_matches(api_key, date_from, date_to, problems):
    """(div, uk date, home, away, label) for every finished match in the
    window, in the site's own team names"""
    out = []
    competitions = [(cfg["div"], cfg["fd_code"], cfg["team_map"], key) for key, cfg in domestic.LEAGUES.items()]
    competitions.append((continental.DIV, continental.FD_CODE, None, "champions-league"))
    for div, fd_code, team_map, name in competitions:
        unmapped = []
        if team_map is None:
            matches = continental.fetch_finished_matches(api_key, date_from, date_to)
            resolve = lambda raw: continental.resolve_team_name(raw, unmapped)
        else:
            matches = domestic.fetch_finished_matches(fd_code, api_key, date_from, date_to)
            resolve = lambda raw, team_map=team_map: domestic.resolve_team_name(raw, team_map, unmapped)
        for m in matches:
            if team_map is None and m.get("stage") not in continental.STAGE_MAP:
                # Qualifiers aren't recorded from here (the score script
                # covers the League Phase onward); a stage it doesn't know
                # would be skipped there too
                stage = m.get("stage") or ""
                if not stage.startswith(("QUALIFICATION", "PRELIMINARY")):
                    problems.append(f"Unknown Champions League stage `{stage}` ({m['homeTeam']['name']} v "
                                    f"{m['awayTeam']['name']}) - add it to STAGE_MAP in "
                                    f"update_champions_league_scores.py.")
                continue
            home, away = resolve(m["homeTeam"]["name"]), resolve(m["awayTeam"]["name"])
            if home is None or away is None:
                continue
            kickoff = datetime.fromisoformat(m["utcDate"].replace("Z", "+00:00"))
            out.append((div, kickoff, home, away))
        print(f"{name}: {len(matches)} finished")
        for raw in sorted(set(unmapped)):
            problems.append(f"Unmapped team name `{raw}` ({name}) - its matches are never recorded. "
                            f"Add it to the team map in the score scripts.")
    return out


def check_results(api_key, days, now, problems):
    date_from = (now - timedelta(days=days)).date().isoformat()
    date_to = now.date().isoformat()
    played = [m for m in finished_matches(api_key, date_from, date_to, problems)
              if m[1] <= now - timedelta(hours=RECORDED_WITHIN_HOURS)]

    # The site's results around the same days (a day either side: the date
    # is the kick-off's UK date)
    recorded = set()
    lo = (now - timedelta(days=days + 1)).date().isoformat()
    hi = (now + timedelta(days=1)).date().isoformat()
    for div in sorted({m[0] for m in played}):
        body = api_get(f"/api/season-matches?div={div}&dateFrom={lo}&dateTo={hi}")
        recorded |= {(div, r["homeTeam"], r["awayTeam"]) for r in body["matches"]}

    missing = [m for m in played if (m[0], m[2], m[3]) not in recorded]
    print(f"{len(played)} played more than {RECORDED_WITHIN_HOURS} hours ago, {len(missing)} not recorded")
    for div, kickoff, home, away in sorted(missing, key=lambda m: m[1]):
        problems.append(f"Not recorded: {div} {home} v {away}, kicked off "
                        f"{kickoff.strftime('%Y-%m-%d %H:%M')} UTC")


def check_api(problems):
    try:
        upcoming = api_get("/api/upcoming")
        print(f"/api/upcoming: {len(upcoming['fixtures'])} fixtures")
    except Exception as e:
        problems.append(f"/api/upcoming failed: {e}")
    try:
        return api_get("/api/snapped-streaks")
    except Exception as e:
        problems.append(f"/api/snapped-streaks failed: {e}")
        return None


def check_streaks(snapped, now, account_id, token, problems):
    if snapped is not None:
        generated = snapped.get("generatedAt")
        if not generated:
            problems.append("The snapped streaks list has no generatedAt - the job may never have written it")
        else:
            age = now - datetime.fromisoformat(generated.replace("Z", "+00:00"))
            print(f"Snapped streaks generated {age.total_seconds() / 3600:.0f} hours ago")
            if age > timedelta(hours=SNAPPED_MAX_AGE_HOURS):
                problems.append(f"The snapped streaks list is {age.days} days {age.seconds // 3600} hours old "
                                f"(generated {generated}) - the snapped-streaks workflow isn't writing it")

    # The job writes the days around its run in UTC; a visitor's today can
    # be either side, so today's (UTC) must be there
    md = now.strftime("%m-%d")
    if kv_get(f"on-this-day-streaks:{md}", account_id, token) is None:
        problems.append(f"On this day has no streaks for {md} in KV - the snapped-streaks workflow "
                        f"isn't writing them")
    else:
        print(f"On this day streaks for {md}: in KV")


def check_dispatch_token(now, account_id, token, problems):
    error = kv_get("dispatch-token-error", account_id, token)
    if error:
        info = json.loads(error)
        at = datetime.fromisoformat(info["at"].replace("Z", "+00:00"))
        if now - at <= timedelta(days=DISPATCH_ERROR_DAYS):
            problems.append(f"The Worker's GitHub dispatch failed at {info['at']} ({info['status']}): "
                            f"snapped streaks only update after the daily sync until it works. Likely the "
                            f"GITHUB_DISPATCH_TOKEN secret expired - make a new token and "
                            f"`npx wrangler secret put GITHUB_DISPATCH_TOKEN`.")
        print(f"Last dispatch failure: {info['at']} ({info['status']})")

    expires = kv_get("dispatch-token-expires", account_id, token)
    if expires:
        # GitHub's format: '2026-11-10 00:00:00 UTC'
        at = datetime.strptime(expires.replace(" UTC", ""), "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        left = at - now
        print(f"Dispatch token expires {expires} ({left.days} days)")
        if left <= timedelta(days=TOKEN_WARNING_DAYS):
            problems.append(f"The Worker's GITHUB_DISPATCH_TOKEN expires {expires} ({max(left.days, 0)} days). "
                            f"Make a new fine-grained token (this repo, Contents: read and write) and "
                            f"`npx wrangler secret put GITHUB_DISPATCH_TOKEN`.")
    else:
        print("Dispatch token expiry: not known yet (stored after the Worker's next dispatch)")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=3, help="How many days of results to check (default 3)")
    parser.add_argument("--report", metavar="FILE", help="Write the problems found to FILE as Markdown")
    args = parser.parse_args()

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not api_key or not account_id or not token:
        sys.exit("FOOTBALL_DATA_API_KEY, CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required")

    now = datetime.now(timezone.utc)
    problems = []
    # Each check reports its own failure rather than stopping the rest
    def run(name, check):
        try:
            return check()
        except Exception as e:
            problems.append(f"The {name} check itself failed: {e}")

    run("results", lambda: check_results(api_key, args.days, now, problems))
    snapped = run("API", lambda: check_api(problems))
    run("streaks", lambda: check_streaks(snapped, now, account_id, token, problems))
    run("dispatch token", lambda: check_dispatch_token(now, account_id, token, problems))

    if not problems:
        print("All fresh.")
        return
    print(f"\n{len(problems)} problem(s):")
    for p in problems:
        print(f"  - {p}")
    if args.report:
        with open(args.report, "w") as f:
            f.write("\n".join(f"- {p}" for p in problems) + "\n")
    sys.exit(1)


if __name__ == "__main__":
    main()
