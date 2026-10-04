# TODO

Feature ideas, not yet scheduled.

## Priority (ranked 2026-10-03)

Most to least important; details are in each item below.

**Tier 1 - before launch** (keep the site up and know how it's doing)
1. API caching for traffic - the only item that prevents an outage
2. Analytics, with failed searches
3. Automated checks
4. Error reporting
5. About / sources page
6. D1 backups

**Tier 2 - high value, soon after launch**
7. Link previews when sharing
8. Season records and title races
9. "Report a data error" link
10. ~~The table on any date~~ - done 2026-10-04
11. League trends over time
12. Match Finder upgrades (what's left)
13. Lighter pages

**Tier 3 - worthwhile features**
14. Typo tolerance in search
15. Upcoming matches (home page strip)
16. Penalty shootout records
17. Recent searches
18. Pinned / favourite team
19. Road to the final
20. Head-to-head by decade
21. More competitions (depends on the data)

**Tier 4 - nice to have**
22. "On this day"
23. Trivia mode
24. Side-by-side Team Seasons
25. Team progression chart (after league trends)
26. "/" to search
27. Knockout Stage bracket view (on hold)
28. Country vs Country

## Items

- On hold: **Knockout Stage bracket view (Continental)** — built on the
  `knockout-bracket-view` branch, not merged to main yet: more work
  needed before it's release-worthy. Adds a List View/Bracket View
  toggle when a specific season's full Knock-Out Stage is selected;
  Bracket View reconstructs a two-sided tournament bracket from match
  data alone (no seeding data needed), built backward from the Final,
  with dynamically computed per-round gaps so it never overlaps at any
  bracket depth or asymmetry. Desktop only so far - mobile is a later
  extension. See that branch's own TODO.md for the full build/fix
  history.

- Partly done: **Match Finder upgrades (Last Time When merged in)** —
  merge done 2026-10-02, all four pages; more Match Finder work to come.
  - Done: Last Time When was Match Finder sorted by date keeping the top
    row, so it's now Match Finder's **Most Recent** category (Most Recent
    Ties in Continental tie mode): newest first, a Result filter (win /
    draw / loss / didn't win / didn't lose), a Team 1 - Opponent score at
    either venue ("lost 5-0" = 0-5; the aggregate for ties), and last win /
    draw / loss cards above the table with days ago (a card filters to its
    result). Copy Link: `cat=recent`, `res`, `t1g`, `og`.
  - Done: the Last Time When tab is gone (~4,500 lines of its code, CSS
    and mobile layout). Old `view=last-time-when` / `search=last-time-when`
    links are rewritten in each page's <head> to Match Finder with the
    same teams, venue (`loc` -> home / away), weekday, stage (League/Group
    Stage -> group-stage, Knock-Out Stage -> knockout-stage) and result.
  - Done: the search's "last time ..." questions go to Most Recent, which
    adds "didn't win" / "didn't lose", scorelines from Team 1's side, and
    seasons / dates (Last Time When had none). The answer follows the
    page's current filters, so clicking a card rewords it. Q&A: "The Last
    Time When" section replaced by a Match Finder one (no screenshots yet).
  - Still to do:
    - "Won on penalties": a shootout game is a draw at full time, so
      Match Finder can't tell a shootout win from a loss - the search
      gives the last game decided on penalties.
    - A country's clubs as the subject ("last time an English club won
      the UCL") - Team 1 is always one club.
    - "City" / "United" alone as the opponent ("when did Man Utd last lose
      to City" reads City as Hull City).
    - Q&A screenshots for Match Finder; the old QAImages/TheLastTimeWhen1/2
      .png are no longer used.
    - Related: "Match Finder without a team" and "Comebacks" below.

- Later (before launch): **Analytics, with failed searches** — noted
  2026-10-03. Know what people ask - especially questions that get "No
  results", the best guide to improving the search. Cloudflare Web
  Analytics is free and cookie-free; failed searches could be logged by
  the Worker.

- Later (before launch): **About / sources page** — noted 2026-10-03.
  Where the data comes from, how often it updates, and that club names
  and crests belong to their owners. A privacy note too if analytics
  ever uses cookies.

- Later (before launch): **Automated checks** — noted 2026-10-03. A
  script (maybe a GitHub Action) that loads all four pages, runs every
  search example and fails on any script error - instead of checking by
  hand before each push.

- Later (before launch): **Error reporting** — noted 2026-10-03. A small
  handler that reports visitors' JavaScript errors (to the Worker or a
  free service), to hear about breakages only some devices hit (iOS).

- Later (before launch): **D1 backups** — noted 2026-10-03. A periodic
  export of the database (to the repo or elsewhere) as cheap insurance.

- Later: **API caching for traffic (Cloudflare free plan)** — noted
  2026-10-03, before publishing. The Worker caches in KV, but KV is itself
  metered on the free plan (per day: 100k Worker requests, 100k KV reads,
  1k KV writes, 5M D1 rows read; resets 00:00 UTC). Every API call costs
  a Worker request + 2 KV reads (cache-version, then the entry) + a KV
  write on a miss; there's no Cache-Control, so browsers refetch every
  time. Measured 2-6 API calls per page view, ~10-20 per visit. Estimate:
  fine under ~1k visits/day; low thousands/day - KV writes (one per new
  question; the daily version bump empties the cache) run out and
  misses fall through to D1 (a full-history query reads tens of
  thousands of rows); ~3-5k visits/day - KV reads run out, env.CACHE.get
  throws and every API call fails until the reset. The four changes,
  all on the free plan (one Worker deploy):
  1. Browser caching: a Cache-Control header on API responses (~10 min
     when the current season is in the answer, longer for history-only),
     so repeat calls in a visit never reach the Worker - the only change
     that saves Worker requests.
  2. Edge cache (Workers Cache API, caches.default - free, unmetered) in
     front of KV, so popular answers use no KV reads / writes.
  3. Keep cache-version in the isolate's memory for ~1 minute instead of
     a KV read per request - halves KV reads.
  4. Fail safe: if KV errors (over the limit or otherwise), skip the
     cache and answer from D1 instead of returning an error.
  Together: first hard failure moves from a few thousand to ~10k
  visits/day. Past that, Workers Paid ($5/month): no daily cut-off -
  10M requests and 10M KV reads a month included (~3x free), 1M KV
  writes (~33x), 25B D1 rows read (~160x), then small per-use charges
  (~$2 per extra 100k visits). Check Cloudflare's pricing page - figures
  as of 2026-10.
  - Also before traffic: remove PapaParse (loaded from unpkg on every
    page, unused since the gists went), and consider self-hosting the
    club crests (hotlinked from s.hs-data.com - their server and images;
    they could rate-limit or block at volume).
  - Usage to watch: Cloudflare dashboard -> Workers & Pages ->
    leaguetable-api -> Metrics; KV / D1 -> Metrics.

- Later: **Season records and title races** — noted 2026-10-03; details
  to be worked out. Proposed home: Team Seasons (it already has every
  club-season's P W D L GF GA GD Pts, and every club at a position):
  - Season records: an "All finishes" choice in Filter by Position -
    every club-season in the league in the existing sortable table.
    "Most points in a Bundesliga season" = sorted by Pts, "fewest goals
    conceded" = by GA, "unbeaten seasons" / "most wins" likewise.
  - Title races: position 1 (every champion) plus a "Gap to 2nd" column
    (points, or goal difference when level). "Closest title races" /
    "biggest winning margins" sort it.
  - Search answers both, opening the list already sorted. A separate
    "Records" tab only if the Team Seasons version feels buried.

- Later: **League trends over time** — noted 2026-10-03. Per season:
  goals per game, home win %, draw rate - a simple chart, and searchable
  ("highest-scoring Serie A season", "has home advantage shrunk").
  Built from the season data; pairs with the team progression chart idea.

- Later: **"Report a data error" link** — noted 2026-10-03. A small link
  on each answer / table that opens the contact page with the question
  (or page link) pre-filled, so visitors can flag wrong results easily.

- Later: **Link previews when sharing** — noted 2026-10-03. Copy Link /
  search links show a bare URL in WhatsApp, X, Discord etc. Add title /
  description (Open Graph) tags - for search links, the question and its
  answer - so they preview properly. Small; helps the site spread after
  launch.

- Later: **Side-by-side Team Seasons** — a split view comparing two teams'
  season-by-season history in one page, rather than the current
  one-team-at-a-time view.

- Later: **Country vs. Country (Continental-specific)** — extend the
  country-comparison feature so Team 1 can also be a country, not just Team 2
  (e.g. "Spain vs. Germany": every Spanish team's combined record against
  every German team). Lower priority — scoped it out and it's uneven work:
  League Tables & Head-to-Head is moderate (filter plumbing reuses, but would
  need a row per club instead of one blended row), while Last Time When and
  Team Streaks are hard and arguably a different feature — a "streak" is a
  single-club narrative, so a country Team 1 there means a per-club list
  view, not a straight extension of the current layout.

- Later: **Upcoming matches dashboard** — noted 2026-09-29. **Direction
  changed 2026-10-03:** upcoming matches go on the home page, in the
  header above the search bar, not on their own page - lower priority as
  a result. The branch's fixtures table, update script / workflow,
  planned /api/upcoming and per-match context (below) still apply; the
  standalone UpcomingMatches page (and its mobile twin) don't. A
  dashboard of upcoming fixtures, where each match shows the context for
  that meeting:
  - all-time head-to-head record between the two teams
  - any active streak in that head-to-head (e.g. "unbeaten in 6 vs them")
  - each team's own active streaks regardless of opponent (winning,
    unbeaten, scoring, clean sheets...)

  Data source confirmed: the football-data.org key the score scripts
  already use returns future fixtures - `/v4/competitions/{code}/matches`
  with `status=SCHEDULED` and a future date range (tested on the Premier
  League 2026-09-29: 38 fixtures over the next month, all with fixed
  kick-off times, `SCHEDULED` also returns `TIMED`). Each fixture has a
  stable match `id`, `utcDate`, `matchday`, `stage` and API team names that
  the scripts' existing team mappings already handle. Free tier covers all
  five leagues and the Champions League (not CL qualifiers), ~10
  requests/min - one call per competition per day is plenty.

  Decided (2026-09-29):
  - A new standalone page covering all six competitions (not a tab, not
    the landing page), with a side-menu link.
  - Window: the next 14 days, grouped by day, then competition; kick-off
    times in the visitor's local timezone.
  - History is per competition: a Premier League fixture uses Premier
    League meetings and form only, a Champions League fixture uses
    Champions League meetings and form only.
  - Per fixture: both teams' current league positions, last-5 form (W/D/L
    dots), the head-to-head bars (as in the H2H panel), and three tables:
    every active head-to-head streak of 3+ games (each with the Team
    Streaks chevron to list its matches), every active 3+ streak for Team 1
    (home), and the same for Team 2 (away), across all nine streak types.

  Build plan:
  1. Data: a `fixtures` table in D1 (football-data match id as key, div,
     utc kick-off, home, away, matchday, stage, status), kept separate from
     results. A daily `update_fixtures.py` pulls the next 14+ days for all
     six competitions (one call each), reuses the score scripts' team-name
     mappings, replaces the stored upcoming fixtures, and writes to D1 with
     the sync job's Cloudflare secrets; own workflow + failure issue.
  2. API: `/api/upcoming` returns fixtures with the per-match context
     precomputed (positions, form, H2H record, active H2H and per-team
     streaks with their matches), KV-cached until the next daily refresh -
     computing it in the page would take ~3 API calls per fixture. Needs a
     Worker copy of the streak logic, checked against Team Streaks.
  3. Page: fixture cards, filters by competition and team, links into the
     existing tabs via share links (League Tables H2H, Team Streaks).
  4. Entry points: side menu; maybe a landing-page teaser and a "next
     match" line on the Team Dashboard.

  Also decided: a separate UpcomingMatchesMobile.html like every other
  page; for Champions League fixtures, "league position" is the team's
  place in the CL league-phase table; compact fixture cards, with the three
  streak tables opening when a card is clicked (~150 fixtures in 14 days).

  Progress (on the `upcoming-matches` branch, not merged):
  - Phase 1 done (2026-09-29): fixtures table in schema.sql,
    scripts/update_fixtures.py, .github/workflows/update-fixtures.yml.
  - Desktop page done (2026-09-30), on a fixed sample fixture list
    (upcoming-fixtures-sample.json): compact two-per-row cards; opened
    card has the season table, H2H and record bars, Premier League era
    switch, streak tables with an Overall / Home / Away switch.
  - Next (after the 2026-10-03 change): /api/upcoming (Worker deploy);
    a compact upcoming-matches strip on index.html above the search bar
    (desktop + phone width - index.html has no separate mobile page),
    opening each match's context; reuse what fits from the branch's
    desktop page. The UpcomingMatchesMobile.html + redirect step is
    dropped.
  - **Before continuing on the branch: merge `main` into it.** `main` has
    moved on since the branch was cut (local-format dates on all four
    pages, the Continental Team Seasons qualifier fixes, the Main Stage /
    Qualifiers Competition Stage dropdowns with their Worker change, and
    the Match History stage fix, the all-teams Team Streaks lists and
    streak pagination; merged in 2026-10-01, but since then the search
    page / search mode, Include Better Results for every team and the
    Worker cache key fix), so the branch's copies of those pages
    are stale until it's brought up to date. One `git merge main` on the
    branch brings all of it over - nothing needs reapplying by hand.
    (The Worker is already deployed with the stage change; the branch
    doesn't touch backend/worker/src/index.js, so no conflict there.)

- Maybe: **Road to the final (Continental)** — noted 2026-10-03. One
  club's season as its whole path: group results, then each knockout tie
  on aggregate ("Liverpool 2018-19 run"). The tie code already pairs
  legs.

- Maybe: **Recent searches** — noted 2026-10-03. A visitor's last few
  questions, kept in their browser (localStorage), at the top of the
  empty search bar's suggestions. Pairs with the pinned-team idea.

- Maybe: **Head-to-head by decade** — noted 2026-10-03. A rivalry's
  record split by decade ("Arsenal v Spurs: 1990s W12 D6 L2, ...") to
  show who was on top when; reuses the head-to-head data and the search's
  decade parsing.

- Maybe: **Trivia mode** — noted 2026-10-03. A final table with the
  club names hidden - guess the season; or guess the club from its
  season-by-season finishes. Existing data only; a reason to come back
  daily (like "On this day").

- Maybe: **Lighter pages** — noted 2026-10-03. The sport pages are
  620-790 KB of HTML because their code is inline; moving it into
  separate .js files lets browsers cache it once instead of with every
  page. Helps phones, and pairs with API caching for traffic.

- Maybe: **Typo tolerance in search** — noted 2026-10-03. "arsnl",
  "chelsae" find nothing; fuzzy-match club names ("Did you mean
  Arsenal?").

- Maybe: **"/" to search** — noted 2026-10-03. Focus the search bar from
  anywhere on a page.

- Maybe: **More competitions** — noted 2026-10-03. Europa League /
  Conference League (the code already maps E1 / C2), or more leagues
  (Eredivisie, Primeira Liga, Championship) - depends on the data.

- Maybe: **Penalty shootout records** — noted 2026-10-03. "Most
  shootouts won", "best shootout record" - mostly sorting existing data.

- Maybe: **"On this day"** — a small widget (dashboard or landing page)
  showing historical matches that happened on today's date, using existing
  match data with a date filter.

- Maybe: **Pinned/favorite team** — remember a user's team via
  `localStorage` so the landing-page search can offer a one-click shortcut
  back to their dashboard instead of retyping every visit.

- Maybe: **Team progression chart** — a line chart (points or league
  position per season) on the Team Dashboard for Domestic and Continental,
  possibly with a second team overlaid for comparison.

## Done

- ~~The table on any date~~ — done (2026-10-04), in the search. League
  Tables already takes a date range, so a single date with a table
  question means that season's start (1 July) to the date: "table on
  1/1/23", "who was top at Christmas 2003", "Serie A table on 1 January
  2010", "where was Arsenal on 1/1/2023" (the table, the answer naming
  that club's place). Answer: "On January 1, 2023, Arsenal FC were top of
  the 2022-23 Premier League with 43 points from 16 games, 7 points ahead
  of Manchester City" / "Liverpool FC were 6th ..., 15 points behind".
  Dates gained two-digit years (1/1/23) and holidays (Christmas, Christmas
  Eve, Boxing Day, New Year's Day; no year = the most recent). "Arsenal on
  10/05/2026" with no table words is still that day's match. Not done:
  "after N games" (League Tables has no matchday filter).

- ~~Match Finder without a team~~ — done (2026-10-03), both steps; noted
  2026-10-01 while testing the search bar.
  - Done (2026-10-03), step 1 - single matches, all four pages: leave
    Team 1 empty for the whole league's matches, each listed once, from
    the division's full history (the all-teams streaks' data, only
    fetched while the Match Finder tab is open). "Biggest Victories" is
    "Biggest Wins" (the margin, whoever won); Biggest Defeats is hidden
    (same list); Most Recent's result column is H / D / A. Home/Away,
    Result, the score boxes and the last win / draw / loss cards are
    hidden (they're Team 1's side). Team 2 alone (a club, the Big 6, a
    country - now offered with no Team 1) = every club's matches with it;
    Biggest Wins = the biggest wins against it. Season, dates, weekday,
    Continental stage / qualifiers / penalties / extra time apply.
  - Search: "biggest win in La Liga history" (Athletic Club 12-1
    Barcelona, 1931), "highest scoring game ever Premier League"
    (Portsmouth 7-4 Reading), "biggest wins against Chelsea", "Serie A
    0-0 draws". "Last time ..." and comebacks still need a club. One
    example per competition list; the Q&A and Match Finder's description
    mention it.
  - Fixed on the way: Continental mobile rebuilt Match Finder's Team 2
    list without countries after adding them (a country-only link was
    ignored).
  - Done (2026-10-03), step 2 - Continental Double-Legged Tie mode with
    no Team 1: every two-legged tie, each from the winner's side (a level
    tie - settled on penalties - from the alphabetically first club). The
    tie code already paired legs without Team 1; only its classification
    and table used Team 1, now a per-tie side. Biggest Aggregate Wins
    (Benfica 18-0 Stade Dudelange, 1965), level / highest-scoring ties,
    an aggregate scoreline (winner first - the boxes read Winner / Loser),
    Most Recent Ties (no last win / draw / loss cards), and every club's
    Comebacks (Barcelona vs PSG first, of 380). Team 2 alone = ties
    against it. Search: "biggest comebacks", "biggest aggregate wins
    against English clubs", "comebacks against Barcelona", "ties decided
    on away goals" (counted - 175, the latest PSG 3-3 Bayern); a query of
    only tie / away goals / extra time words is no longer treated as
    empty. "Biggest comebacks" is in the Champions League examples.

- ~~Comebacks~~ — done (2026-10-03), both Continental pages. A comeback
  is a two-legged tie won after losing the first leg (decided
  2026-10-03 - not a single match won from behind). Match Finder's
  Double-Legged Tie mode has a "Comebacks (Lost the First Leg)" category
  (tie mode only - switching to Single Match falls back to Biggest
  Victories): Team 1 lost leg 1 and went through on aggregate, away goals,
  after extra time or on penalties; biggest deficit first, then newest.
  The last column, "Deficit Overturned" ("Deficit" on mobile), is the
  goals they were down after leg 1 with the aggregate under it - 4, then
  6-5, for Barcelona vs PSG (0-4, 6-1). Copy Link: cat=comebacks&mode=tie.
  - Search: "comebacks", "comeback", "came back", "remontada",
    "overturned", "turned around" -> Comebacks: "FC Barcelona's biggest
    comeback ... was overturning a 0-4 first-leg defeat against Paris
    Saint-Germain in the 2016-17 round of 16, going through 6-5 on
    aggregate - one of 7 comebacks." Outside the Champions League it says
    to pick it. "Barcelona comebacks" is in the Champions League examples;
    the Q&A's two-legged ties answer mentions it.
  - Not done (maybe later): the mirror - ties lost after winning the
    first leg.

- ~~Team Streaks: every club vs a Team 2~~ — done (2026-10-03), all four
  pages. With no Team 1, a Team 2 (a club, the Big 6, a country's clubs on
  Continental) lists every club's streaks against it, ranked: "Longest
  Unbeaten Streaks vs Chelsea FC - All Teams" (Arsenal, 19 games, 1995-
  2005). Built on the all-teams lists: each club's matches are filtered
  to games against Team 2 before its streaks are found (memoised per
  opponent). A club inside the group plays only the others (Big 6 vs the
  Big 6, English clubs vs England); Active is still clubs in the latest
  season. Big 6 / countries are offered with no Team 1; picking Team 1
  keeps Team 2 (unless they'd be the same club); "Team 2 (Optional)" is
  now "Team 2". Copy Link carries t2 alone.
  - Search: "against / vs / versus / v / over" before the only club - or
    a Big 6 / country with no club - means every club vs it ("longest
    unbeaten run against Chelsea", "active winning streaks vs the Big 6",
    "longest unbeaten run against English clubs"); answers name the
    opponent. "Arsenal unbeaten against Tottenham" is unchanged. Each
    dropdown's example list has one (77 examples, all answering).
  - Home / away is from the listed club's side.

- ~~Historic streaks: the match that ended each run~~ — done
  (2026-10-02), all four pages. Expanding a historic streak's match list
  now also shows the match that broke the run, in its own one-row table
  above the run's matches (the list is newest first, and that match is
  newer than the run's), with a note under it: "The match that ended this
  49-game run". Recorded as `endedBy` when findAllHistoricStreaks closes a
  run, so it follows the streak's own filters - against one opponent it's
  the next meeting, home / away only the next home / away match, with a
  Continental stage the next match in that stage; all-teams lists too. A
  run nothing has broken (still going, or the club's last run in the
  data) says "No later match has ended this run". E.g. Arsenal's 49
  unbeaten: Manchester United 2-0 Arsenal, 24 October 2004.

- ~~Search page~~ — done (2026-10-01), merged to main 2026-10-02. `index.html` is now a plain search page (title, a
  search bar with a sport/competition dropdown: Top 5 Leagues, each
  league, Champions League; NFL/NBA greyed out). The search lives in
  `search.js` / `search.css`, shared with the sport pages: it reads a
  plain-English query for teams, a season and what's being asked, and
  links to that view through the pages' Copy Link parameters.
  - Search mode (`?search=<kind>&q=&scope=` on top of a Copy Link URL):
    the page hides its header, tabs and filters, shows the search bar and
    a one-line answer (team names in team colors), and only the results
    for that question - worked out by the page's own functions; search.js
    words the answer line (renderAnswer) from what the page passes in
    plus the URL's filters. Every tab answers this way, on all four
    pages; mobile links redirect with the search intact.
  - Search / Filters switch (2026-10-02): a button beside the dark mode
    toggle on all four pages switches between the tabs and filters and
    the search bar, without reloading. Search -> Filters keeps the
    question's filters (the tab comes back set to it); Filters -> Search
    shows an empty bar (`?search=none`) preset to the page's league. The
    address follows the mode, so a refresh keeps it. Mobile stacks the
    toggle and the button in the header. Manual filters don't turn into
    a question - the bar starts empty.
  - Empty search bar: clicking into it shows example questions for the
    dropdown's competition, grouped by kind (head to head, seasons &
    tables, titles, streaks, last time, biggest wins), each opening its
    answer, plus words to add to any question ("at home", "since 2010",
    "last 10 meetings", "semi final exits"...). Arrow keys / Enter work on
    them. The home page's "Try" chips are the same list (SEARCH_EXAMPLES
    in search.js) - every example checked to give an answer.
  - Ways to ask, beyond each tab's own filters: nicknames and club
    abbreviations (Barca, Atleti, Gladbach, OM, S04, BMG, LFC, MUFC...),
    named derbies (El Clasico, Der Klassiker, Le Classique, North London,
    Merseyside, Madrid, Milan, Revierderby, Borussen-Derby, Rheinderby...),
    "last 5" on its own, "1990 to 2000", decades ("in the 90s" - answered
    as "in the 1990s"), "1st time" / "maiden" for first-time winners,
    "finalists" / "semi finalists". Weekdays never complete to a team
    ("drew on a Wednesday" isn't Sheffield Wednesday).
  - League Tables & Head to Head, all four pages:
    - `h2h`: home / away / "X at Y", a season, since / before / between
      years, "last 5 seasons", a weekday, "last 10 meetings", several
      opponents ("vs Chelsea and Liverpool"), the Big 6; Continental also
      a stage ("semi finals", "knockouts"), penalty shootouts, main stage
      / qualifiers only, and a country ("vs English clubs").
    - `team` (one team): the same filters, with its record and match
      history ("arsenal away since 2010", "arsenal last 20 games").
    - `table` (no team): dates, home / away / weekday tables, 2 or 3
      points for a win, without deductions, Continental stages. A plain
      single season ("2025-26 Serie A") opens Team Seasons' final
      standings instead (medal colors, each club's matches a click away)
      - "Inter won the 2025-26 Serie A with 87 points, 11 ahead of SSC
      Napoli"; Continental: the winner and the beaten finalist. Stripped
      titles (Marseille 1992-93, Juventus 2004-05 - shown as NR) are never
      counted: "finished top ... but were stripped of the title - it
      wasn't awarded".
    - Dates as well as years in ranges ("since 01/01/1991", "between 1
      Jan 1990 and 31/12/2000", "on 10/05/2026", "January 2010"); slashed
      dates follow the visitor's language (US: month first). A typed date
      is spelled out in the answer ("since January 1, 1991").
    - Eras: typing "Premier League"/"EPL" or "Champions League"/"UCL"/"CL"
      means 1992 onwards, "First Division" / "European Cup" the older era;
      no name (or "all-time") means every season, and a season or dates
      beat an era. Answers name the era: "the English top flight", "the
      European Cup and Champions League" for all-time. Ligue 1 left out -
      Division 1 to Ligue 1 was only a rename.
  - Match Finder, all four pages (`match-finder`):
    biggest wins / defeats, highest-scoring draws, most / fewest goals
    (goalless), a scoreline (home-away), against a team / several / the
    Big 6 / a country, with seasons, eras, dates, weekdays, home / away.
    Continental: two-legged ties on aggregate ("aggregate", "two-legged";
    aggregate scorelines are Team 1-opponent), after extra time, on away
    goals (counts ties won / lost), penalties, stages, qualifiers. Needs a
    team - "biggest wins" alone asks for one. Answer names the top result
    and how many share it.
  - Team Seasons, all four pages (`team-seasons`): a
    team's seasons ("arsenal seasons" / "history"), a finish ("titles",
    "3rd", "top 4", "runners up"; Continental "finals" / "semi finals" =
    reached, "lost in the final" / "knocked out in the quarter finals" /
    "semi final exits" / "exactly the semi finals" = went out there), one season ("where did arsenal finish in 2003-04"),
    every club at a finish ("premier league champions", "first time
    champions"), eras, and "including historic" (the pre-Serie A /
    pre-Bundesliga champions - answers then say "the German / Italian
    championship"). Title questions in Serie A / the Bundesliga include
    those by default ("Schalke titles" = 7); naming the league ("Schalke
    Bundesliga titles") means that league only, with a small-print link
    under the answer to the full count. "German / Italian champions" work
    as searches. Only titles - seasons, top 4 etc. stay league-only (the
    historic list only has champions). Titles narrowed to one era ("Man
    Utd premier league titles", "Ajax european cup titles", "premier
    league champions") get a link to the all-eras search too, naming the
    other era (no count - the page only works out the era asked about).
  - Last Time When, all four pages (`last-time-when`):
    "last time X beat / lost to / drew with / played Y", one team ("last
    time arsenal won away"), the Big 6, a country's clubs, home / away, a
    weekday, Continental stages ("won a final"). Which result was asked
    rides in the link as res= (the page ignores it). Season questions
    worded this way ("when did arsenal last win the league") go to Team
    Seasons. The tab has no season / date filters, so none are applied.
  - Team Streaks, all four pages (`team-streaks`): a
    team's current run ("liverpool unbeaten streak", "games without a
    win", "clean sheets in a row") or longest ("arsenal longest unbeaten
    run" - 49 games), against a team / the Big 6 / a country's clubs, home
    / away, Continental stages; every team's longest or current runs
    ("longest winning streaks" - ties named). A 1-game run is worded as
    what happened in that game. The tab has no season / date filters.
  - Team Seasons' Include Better Results now works with no team picked
    too, on all four pages: "top 4" lists every 1st-4th finish (Domestic
    adds a Pos column - on mobile in place of P), "reached the final"
    every finalist and winner, sorted by finish within a season; before,
    the all-teams view only ever showed the exact finish. With it ticked,
    a team's Count column counts the qualifying finishes together (26th
    time 2nd or better), matching the summary line. First Occurrence Only
    then means each club's first finish in that range ("first time top 4"
    - Leicester 2015-16).
  - Also fixed on the way: Continental `?team=` dashboard links never
    locked the team (the lock was consumed before /api/teams loaded); the
    Worker's KV cache keys broke past 512 bytes - head to head against
    every club from a big country (Real Madrid vs Germany, 30 clubs)
    returned a 500 and showed no matches; long keys are now hashed
    (deployed 2026-10-01).
  - Not covered yet (own TODO items): Last Time When negation /
    scorelines / penalties (Last Time When is now Match Finder's Most
    Recent - see Match Finder upgrades), Match Finder without a team,
    comebacks.
    League relegations aren't searchable (the number relegated changed
    over the years).

- ~~Team Streaks for all teams~~ — done (2026-09-30), all four pages.
  With no Team 1 picked, Team Streaks lists every team's streaks of the
  chosen type, longest first (ties: most recent first):
  - Historic: every streak of 3+ games in the league's history (e.g.
    3,453 Premier League winning streaks - Liverpool and Man City 18 top
    it; Arsenal's 49 heads unbeaten).
  - Active: every team in the latest season on a streak of that type now
    (clubs no longer in the league are left out - their "current" streak
    is frozen at their last match); End Date is "Latest Match". "In the
    latest season" is judged on all of a team's matches, before stage
    filters (fixed 2026-09-30: with Knock-Out Stage picked before any
    knockout of the new season, the list came up empty). Old runs can
    still head an active list - e.g. Crvena Zvezda's knockout unbeaten 17
    dates from around 1991 and is genuinely unbroken; kept as-is.
  - Same columns/stats, sorting, chevron match lists (each row's own team
    highlighted) and Home/Away filter as the one-team table; Continental
    also applies Competition Stage and League Filters' Exclude Qualifiers
    / Exclude Main Stage. Mobile uses its compact historic layout.
  - Data: the division's full history from /api/season-matches (~400 KB
    gzipped for the Premier League), fetched once per division on first
    use; all streaks computed in ~70 ms and memoised per
    status/location/type/filters.
  - Streak Type now opens on "Select Streak" - nothing is calculated or
    downloaded until a type is picked. Share links always carry `type`;
    older links with a team but no type still mean Winning (the old
    default). A no-team link opens the all-teams list.
  - Pagination: historic tables (one team, two teams, all teams) show 20
    per page with Previous/Next, as Match History / Match Finder - single
    teams reach ~485 streaks (Everton, scoring). New list or new sort goes
    back to page 1.

- ~~Separate qualifying rounds from the main stage in Continental
  filters~~ — done (2026-09-30), both Continental pages. Qualifying rounds
  are "Qualification ..." in the data but were shown and filtered under
  the same names as main-stage rounds ("Play-Offs", "2. Round").
  - Team Seasons: a single season's standings list only teams that
    reached the competition proper, counting only main-stage matches
    (falls back to the League Filters settings with Exclude Main Stage on,
    or before any main-stage match of a season). Qualifying exits are
    labelled Play-Offs (Q), 3./2./1. Round (Q) and Preliminary Round (Q);
    third qualifying round exits used to show as "Group Stage". Filter by
    Progression is split into Main Stage / Qualifiers groups, (Q) rounds
    rank below every main-stage finish for "include better results", and
    Group Stage now ranks between Play-Offs and 2. Round.
  - Competition Stage: every stage dropdown (League Tables, Match Finder,
    Last Time When, Team Streaks, H2H and Match History panels) is split
    into Main Stage / Qualifiers, adding All Qualifiers and the five (Q)
    rounds. One rule for all of them - `matchesStageCategory()` +
    `qualifierRoundLabel()` in the pages, with the same copy in the Worker
    and backend/migration/standings-aggregate.mjs (keep in sync). Main
    Stage options never match qualifying rounds (League/Group Stage and
    Knock-Out Stage used to let some in); checked to split all 8,910
    Champions League matches with no gaps or overlaps. Match Finder's
    tie mode includes two-legged qualifying ties. Worker deployed
    (version d26129b1) and cache-version bumped.
  - Match History and the H2H panel now follow the League Tables
    Competition Stage, like its other filters (they used to ignore it,
    so the bars and match list didn't match the table).
  - Stage names: desktop Stage columns show the (Q) labels instead of
    "Qualification Play-Offs"; mobile abbreviates them P/R3/R2/R1/PR (Q),
    and 1999-2003's Preliminary/Intermediate groups to GS/GS2.
  - Share links needed no changes (new values round-trip; old
    `stage=`/`pos=` links still open, with the corrected meanings).
  - Worker deploys: Node 22 is installed per-user in ~/.local/node (the
    Homebrew install belongs to another macOS account), so run
    `PATH="$HOME/.local/node/bin:$PATH" npx wrangler deploy` from
    backend/worker; wrangler is already logged in.

- ~~Show dates in the visitor's local format~~ — done (2026-09-30). Every
  displayed date on the four pages now uses the browser's locale
  (`toLocaleDateString()` with no locale): the 21 hard-coded 'en-US' calls
  (Domestic match/streak tables, Match History, Match Finder, historic
  streaks; Continental historic streaks; "Last Data Update" on all four)
  were switched, and "(MM/DD/YYYY)" was dropped from the 16 Start/End Date
  labels, since the native date pickers already show the visitor's own
  format. Internal dates (filters, API params) stay ISO, and every date
  sort uses the Date objects, never the displayed text. The Upcoming
  Matches pages already used the locale.

- ~~Update the League Tables, Team Seasons and Team Streaks tab
  descriptions~~ — done (2026-09-29), after multi-team Team 2, Team Seasons
  match lists/individual seasons and streak match lists. Team Streaks uses
  the user's wording (active and historic streaks, all nine streak types;
  Continental adds a Competition Stage line). Team Seasons uses the user's
  wording with two edits: it now opens with picking a Season (the new
  single-season view), and Continental says Progression finds teams "which
  reached a particular stage"; Continental's outdated qualifier note is
  gone. League Tables adds one sentence on picking one or several Team 2s
  (Big 6 on Domestic, a whole country on Continental) and drops a stray "to
  filter with" on Continental. Mobile matches desktop throughout.

- ~~Update the Match Finder tab description~~ — done (2026-09-29), user's
  own wording. Domestic: "Select one or two teams and find standout matches
  that they played in. Biggest wins and defeats, highest-scoring draws, the
  most or fewest total goals, or just a specific scoreline too."
  Continental adds: "Switch to Double-Legged Tie to get the same information
  for knock out matchups." Mobile uses the same text as desktop.

- ~~Team Seasons "No seasons found" info line with team + position~~ —
  fixed (2026-09-29): displayTeamHistory() ends with switchTab(), which
  clears the info line, and a 100ms timer put it back only if still empty,
  each timer using its own copy of the text. A link renders twice in quick
  succession (before and after the season data loads), so the first
  render's stale "No seasons found" won. The timer now restores the latest
  render's text (pendingTeamSeasonsPositionInfo), and other Team Seasons
  views/resets cancel it. All four pages.

- ~~Historic streak match lists~~ — done (2026-09-29): each historic
  streak row in Team Streaks has a chevron that expands the streak's
  matches underneath (newest first, Match History layout and highlighting;
  stage and penalty lines on Continental). Works for single team,
  head-to-head, Big 6 and Continental; open rows survive sorting. All four
  pages.

- ~~Team Seasons: per-season match lists and individual seasons~~ — done
  (2026-09-29): every Team Seasons row has a chevron that expands that
  team's matches for the season (Match History layout, newest first; several
  can be open at once). Works in every view - one team, all teams at a
  position/progression, and a new single-season view: the Season dropdown
  now lists every individual season after the eras, and picking one on its
  own shows that season's final standings (Continental: ranked by
  progression) while hiding the position/progression filter. Revoked titles
  (Marseille 1992-93, Juventus 2004-05) show "NR" in those tables. All four
  pages. Shipped alongside: Everton's missing second 2023-24 deduction (-2)
  and Bielefeld's strippedChampions league code (E1 -> D1).

- ~~Continental dark mode starts 100ms late~~ — done (2026-09-28): both
  Continental pages now call `initDarkMode()` immediately at start-up, as
  Domestic does, instead of `setTimeout(initDarkMode, 100)`. Anything
  drawn in that first 100ms (e.g. a link straight into a single-season
  grouped table) used to keep light-mode team colors in dark mode.

- ~~Multi-team Team 2 ("+ Add team")~~ — done (2026-09-28): Team 1 stays
  single, but Team 2 can be several teams (3-10 total via "+ Add team";
  hidden while Team 2 is Big 6/Country). Only Team 1's matches against
  those teams count, and each Team 2 gets its own League Table row, e.g.
  Arsenal vs Chelsea + Spurs → Arsenal 357 GP, Chelsea 179, Spurs 178.
  Big 6 (Domestic) and Country (Continental) now split into per-club rows
  the same way. Covers League Tables & H2H (including Continental's
  grouped single-season table) and Match Finder (including Double-Legged
  Tie); share links use repeated `t2=` params. No backend change -
  `/api/head-to-head` already took a team2 list. Re-scoped from the
  original round-robin "mini-league" idea. All four pages. Shipped
  alongside:
  - Team 1/Team 2 side by side in Last Time When and Team Streaks
  - Selected team's logo stays visible in team comboboxes
  - Mobile League Table team names lightened for dark mode
  - Point Deductions now switches off when teams are picked from the
    search boxes (it never did - the check only ran on the hidden
    selects); Team Seasons and the Team Dashboard header always count
    deductions

- ~~Aggregate stat columns for Streaks~~ — done (2026-09-25): the
  Historic streaks table now shows sortable per-streak totals, with each
  streak type getting only the stats that actually vary for it (picked
  type by type):
  - Winning: GF, GA, GD, Clean Sheets
  - Unbeaten: GF, GA, GD, Clean Sheets, PPG
  - Draw: GF, GA, Clean Sheets
  - Winless: GF, GA, GD, Failed to Score, PPG
  - Losing: GF, GA, GD, Failed to Score
  - Clean Sheet: GF, PPG
  - Goals Conceded / Scoring: GF, GA, GD, PPG
  - Failed to Score: GA, PPG
  Config lives in `HISTORIC_STREAK_AGGREGATE_COLUMNS` (all 4 files);
  totals come from the same full-time score/result the streak itself was
  built from (a shootout counts as its full-time draw), PPG = 3/win,
  1/draw. Default order is still longest streak first; Count and Length
  (Days) are always the last two columns. Mobile compacts the table:
  short labels (CS/FTS, full name on hover), GF and GA merged into one
  sub-sortable "GF:GA" column (as on the League Table), and logo-only
  team columns with blank headers - so single-team mode fits a 390px
  screen for every type; anything wider (head-to-head Unbeaten/Winless)
  scrolls sideways with the team logo(s) and title pinned. Verified
  every row against an independent recomputation for all 9 types -
  Real Madrid (single + vs Bayern) and Arsenal (single + vs Big 6),
  desktop and mobile - plus sorting and light/dark mode. The
  active-streak view doesn't show aggregates yet (open item above).

- ~~Mobile layout fixes (after Match Finder shipped)~~ — done
  (2026-09-24); the first two confirmed on a real iPhone against the
  live site:
  - Match Finder's "Match Results" checkboxes (Penalty Shootouts Only,
    Extra Time Only) ran off-screen on Continental mobile - the row had
    no ID, so the wrap rules League Tables' row uses never applied.
    Gave it (and its Exclude row) IDs and added them to those rules
    (`17cbf45`).
  - Start/End Date boxes overflowed their column on iOS Safari on every
    mobile page/tab with a date pair - Safari's native date input keeps
    an intrinsic minimum width that ignores `width: 100%`. Dropped the
    native appearance and let the input and its grid cell shrink
    (`e3ab60c`). Not reproducible in desktop Chrome.
  - Match Finder tie mode's hierarchy was flipped on mobile (aggregate
    scoreline big, ranked margin small) - the generic mobile table-cell
    font rule shrank the margin. Restored big margin / smaller scoreline
    to match desktop (`dc75b1e`).

- ~~Goals Conceded Streak~~ — done (2026-09-24, `57154d1`): new Team
  Streaks type "Goals Conceded Streak (1+ Goals Allowed)", listed
  directly under Clean Sheet Streak, in all 4 files. Works for both
  active and historic modes; the active view's "opposite result" panel
  shows the team's last clean sheet.

- ~~Team Streaks stale team list after switching league~~ — fixed
  (2026-09-24, `194f9d7`): Team Streaks' own league-change handler was
  the only one that didn't refresh its team comboboxes, so after
  switching league it still offered the previous league's teams. Every
  other tab was already correct.

- ~~Paginate Match History / Head-to-Head Match History~~ — done
  (2026-09-24, `7e28eab`): both tables now paginate like Match Finder's
  results, for consistency and so long histories don't render hundreds
  of rows at once on mobile.

- ~~Biggest Win / Biggest Loss / Closest Match finders~~ — done as the
  **Match Finder** tab (2026-09-24, merged to main in `657af7b`; full
  spec in `MATCH_FINDER.md`). Resolved the open team-scoped vs
  league-wide question by making Team 1 required (Team 2 optional for
  head-to-head), so it reuses the existing team-scoped match caches with
  no new backend work - the league-wide "closest games this season, no
  team" variant is deliberately out of scope. Second tab on all four
  pages. Categories: Biggest Victories/Defeats, Highest-Scoring Draws,
  Most/Least Total Goals, and Specific Scoreline (At Least/At Most/
  Exactly per side); no dedicated "Closest Match" (1-goal margin)
  category. Continental adds a Double-Legged Tie mode ranking two-legged
  knockout ties by aggregate (penalty-decided ties count as aggregate
  draws; away-goals-decided ties stay wins/losses at a 0 margin, by
  design). Paginated, sortable, Copy Link support.
  Final pre-merge test pass: every category's classification, value and
  sort order checked row-by-row across all pages for several teams and
  a head-to-head, plus all filters, tie aggregates vs. their legs,
  league-switch reset, and shared links on all four surfaces. It caught
  two bugs, both fixed before merging:
  - Tie mode crashed on Continental mobile (`848f8b8`) - the ported
    `computeTieBreakdown()` needed `isAwayGoalsRuleActive()`, which the
    away-goals fix further down had only ever added to the desktop file.
  - Shared links silently dropped Team 1/Team 2 on Continental, on every
    tab, and had been live on main since the team rosters moved to
    `/api/teams` (`4aa8473`) - the link was applied before the async
    roster load finished. Now applied at the end of `ensureTeamsLoaded()`.
    Domestic was never affected (its rosters load synchronously).

- ~~Dark mode audit + redesigned color scheme (Continental + Domestic,
  desktop and mobile)~~ — done (2026-09-23): a full contrast audit (WCAG ratio scan
  plus visual pass, across index/Contact/Qa/DomesticEurope/
  ContinentalEurope) turned up three root causes behind "inconsistent
  across pages, hard to read dark text":
  1. **Goal Difference column** (`.text-green-700`/`.text-red-600`) had
     no dark-mode override at all, so it rendered at its light-mode
     value (~2-3:1 contrast against the dark background, failing WCAG
     AA's 4.5:1) - the single biggest source of unreadable text, since
     it's one of the most repeated elements on the page.
  2. **Team brand-color text** (inline `style="color: ${teamColor}"` for
     the non-highlighted team name in Match History/Streaks/Last Time
     When rows) was unreadable for any team with a dark brand color
     (navy, maroon, black) - e.g. Tottenham's navy measured ~1:1
     contrast, not just "low," effectively invisible.
  3. **Native `<select>`/`<input type="date">`** on Continental/Domestic
     never got a dark background (only text color was ever set),
     staying bright white boxes on an otherwise dark page - while the
     same elements on index/Contact/Qa were already correctly dark,
     making the inconsistency literal, not just visual.

  Fixed via a small deliberate design decision rather than more one-off
  patches: confirmed light mode's *background* really is exactly two
  variables (`--bg-white`/`--bg-gray-50`, identical across all 7 CSS
  files) and dark mode already mirrored that pair - so extended the
  same pattern with a `--text-primary`/`--text-secondary` pair and a
  `--positive`/`--negative` pair (lightened to `#34d399`/`#f87171` in
  dark mode - the light-mode brand green/red pass fine on white but
  fail badly against `#222`/`#333`). `.text-green-700`/`.text-red-600`
  and the several duplicate hardcoded `.win-score` dark-mode overrides
  (one per container id, `#h2hTableBody`/`#matchHistoryTableBody`/
  `#teamStreaksResults`/`#lastTimeResults`, plus their own dark-mode
  copies) were consolidated to reference `var(--positive)` in their
  BASE rule instead - the fix that actually prevents this class of bug
  recurring, since a class built on the variable works in dark mode
  automatically rather than needing a hand-added entry in an
  ever-growing `[data-theme="dark"] .foo, .bar, .baz { color: white }`
  override list (the exact list the Goal Difference column's classes
  had been missing from). Also fixed in the same pass: `.h2h-losses`
  (a light-gray gradient bar segment with no dark treatment, a light-
  mode island next to its two already-dark siblings), `.menu-section-
  title`/`.close-btn` in the nav sidebar (same "never added to the
  override list" gap), and `.form-input`/`select` gained a real dark
  background (not just text color) plus `color-scheme: dark` for
  native chrome (date-picker popup/icon) that CSS can't reach directly;
  `<option>` intentionally still falls back to a light background,
  matching a tradeoff the code had already made once for
  `#recentH2HSelect` - native dropdown-list styling isn't reliably
  overridable across browsers, so it stays guaranteed-readable
  (dark-on-light) rather than risking unreadable dark-on-dark.

  Team brand colors (root cause 2) needed a JS-side fix, not CSS: added
  `ensureReadableOnDark()` (mixes a color toward white until it clears
  4.5:1 against the dark background, preserving hue rather than a flat
  fallback) and `pickTeamTextColor(rawColor, cssClass)`, which only
  applies it when the color will sit on the page's own dark background
  - NOT inside a `.team1-highlight`/`.team2-highlight` pill, which has
  its own (still light-mode-only) pastel background where the raw dark
  color already reads fine; lightening it there was a real regression
  caught during verification (a first pass lightened unconditionally,
  which fixed the plain case but dropped highlighted-pill contrast to
  ~3:1 since the pill background stayed light and dark team names read
  fine against light backgrounds without any lightening) - fixed by
  threading the eventual CSS class through to the color decision,
  which required reordering each of the affected render functions
  (5 in Continental, 4 in Domestic) so the highlight class is known
  before the color is chosen, not after.

  Deliberately scoped to Continental + Domestic desktop only, per
  explicit choice, since that's where the audit found the concrete
  failures - Mobile variants and index/Contact/Qa share the same CSS
  pattern (confirmed structurally identical `:root`/`[data-theme="dark"]`
  blocks) and are the natural next pass once this approach is proven.
  Verified: WCAG contrast re-scan of both pages in dark mode came back
  clean (only remaining "failures" are a search-icon emoji glyph, a
  false positive - computed `color` doesn't apply to full-color emoji);
  GD column measured 8.28:1 (was ~1.78-2.9:1); Tottenham/Inter/PSG text
  measured 4.66-5.92:1 (was ~1.0-1.2:1) in the plain case, and the
  team1-highlight/team2-highlight pill case re-verified clean after the
  regression fix; Season/Stage/Day-of-Week/date-input dropdowns
  confirmed properly dark on both pages; light mode re-verified
  unaffected (only visual delta: `.text-green-700` consolidated from
  `#047857` to the canonical `#059669` already used by `.win-score` -
  both very close shades of the same brand green, negligible visually);
  JS syntax and CSS brace balance both clean; no console errors.

  Two follow-up rounds of user-reported bugs, both from real dark-mode
  usage rather than the audit's own scan:
  - **Team History team name staying black**, and **losing/draw scores
    intermittently wrong across League Tables, Last Time When, and Team
    Streaks**. The team name turned out to be three literal
    `style="color: #000000"` spans (Team History only, Continental) -
    unconditional, unrelated to theme entirely - removed so they
    inherit the same `.league-table td` dark rule everything else does.
    The score-color bug had two independent causes: (1)
    `handlePositionColors()`, a legacy JS function predating the CSS
    variable system, force-recolors League Table/Team History columns
    by header name on theme toggle, but did it with a page-wide
    `document.querySelectorAll('.league-table ...')` - since Match
    History/H2H/Streaks/Last Time When tables also carry the
    `.league-table` class, this concatenated every table's headers into
    one flat list sharing a single column index, so `:nth-child(N)`
    matched the Nth cell in *every* `.league-table` on the page, not
    just the one that header belonged to; whenever an unrelated table's
    column position coincidentally lined up with "GD"/"L", that rule
    leaked across. Fixed by scoping every lookup inside a
    `document.querySelectorAll('.league-table').forEach(table => ...)`
    wrapper, per table. (2) The real, larger cause: `.text-red-600` and
    `.text-gray-400` (applied directly to a losing/draw score `<td>`,
    not a wrapping span) had no `!important`, so
    `[data-theme="dark"] ... .league-table td ...` - higher specificity
    (class+class+element beats one class) - silently won and painted
    every losing and draw score white. `.win-score` already had
    `!important` for the exact same reason, which is why wins looked
    fine while losses/draws didn't. Added `!important` to both
    (`.text-green-700` doesn't need it - GD only ever appears
    span-wrapped, never applied straight to a `<td>`, so it was never in
    this specific fight). Also fixed while in there: the "Last Draw at
    Home"-style section title in Last Time When used `.text-gray-600`
    for its draw color, which collided with that class's *other*,
    unrelated role as a general secondary-text utility already mapped
    to white in dark mode - switched to `.text-gray-400` to match the
    same muted grey draw scores use elsewhere, avoiding the collision
    instead of patching around it.

  Not independently browser-verified this round (a Chrome extension
  bridge glitch made every navigate/screenshot/exec call fail all
  session, confirmed not localhost-specific - even a plain external
  page wouldn't respond) - fix is from tracing the actual specificity
  math and confirming call sites by hand, not a live check. Flagged to
  the user to confirm visually.

  A third round, from user screenshots this time (light vs. dark side
  by side) rather than the audit's own scan: the visible card
  separation between the Match History visualization bars and the
  Match History table below them (and the equivalent Head-to-Head
  Record/Head-to-Head Match History pairing) disappeared in dark mode -
  the two boxes read as one merged card instead of two distinct ones,
  on both Continental and Domestic. Root cause: `#matchHistorySection`
  is a plain wrapper AROUND both the bars box and `#matchHistoryTable`
  (unlike `#h2hSection`/`#h2hMatchesTable`, which are siblings, not
  nested) - in light mode it has no background of its own, so the
  `mt-8` gap between its two children shows the page's own background.
  `[data-theme="dark"] #matchHistorySection, [data-theme="dark"]
  #h2hSection { background: var(--bg-white); }` gave it a dark
  background too, and since that gap is the ONLY place
  `#matchHistorySection`'s own background is ever visible, it painted
  the gap the exact same color as the two boxes on either side of it,
  erasing the separation. Split the two selectors apart -
  `#h2hSection` still needs the explicit dark background (it carries
  its own `bg-white` card styling in light mode too), `#matchHistorySection`
  does not, so it stays unset and the gap now shows `.main-card`'s
  own dark background (`var(--bg-gray-50)`) instead, distinct from the
  boxes again. Also gave `.league-table` (used by both H2H Match
  History and Match History's own table half, plus Team History and
  the standings table) an explicit `1px solid #444` border in dark
  mode: its card definition otherwise leans on `box-shadow: 0 10px
  15px -3px rgba(0,0,0,0.1)`, a subtle BLACK shadow tuned to read
  against a light page - on an already-dark page it has little room to
  visibly darken further, so a border gives it a crisp edge that
  doesn't depend on the shadow still doing its job. Same browser-tool
  outage as above; not independently re-verified live, but this one
  traces directly and precisely to the exact visual symptom in the
  user's own light/dark screenshots (the "merged card" boundary sits
  exactly where `#matchHistorySection`'s dark background would be
  painted), not a broader inference.

  A fourth round applied everything above to
  `ContinentalEuropeMobile.css`/`.html` and
  `DomesticEuropeMobile.css`/`.html`, which had never received any of
  it - confirmed structurally near-identical to what desktop looked
  like before all three rounds (same `:root`/`[data-theme="dark"]`
  variable block, same unscoped `handlePositionColors()`, same
  `!important`-less `.text-red-600`/`.text-gray-400`, same
  `#matchHistorySection`/`.league-table` gap issue, same
  `#000000`-hardcoded Team History team name on Continental only), so
  the same fixes applied directly. One thing genuinely different on
  mobile: `createStreakTableRow()`/`createMatchTableRow()`/
  `updateMatchHistoryTable()`/`createKnockoutMatchRow()`/
  `updateH2HMatchesTable()` all render team names with `display: none`
  on mobile (a compact "logo + H:A score" layout, showing team NAME
  text only for a draw's "D" indicator) - so the team-brand-color
  contrast problem (root cause 2, and the team1-highlight/team2-highlight
  pill regression that came with fixing it) simply doesn't manifest
  visually in these particular rows on mobile, and needed no JS changes
  there. It surfaced a real bug in a DIFFERENT function instead, missed
  in the earlier desktop rounds because those focused specifically on
  the 5 match-row functions: `populateResultSection()`'s "FC Barcelona
  Last Win at Home"-style section title colors team1Name/team2Name as
  plain page-background text (not row-based, not pill-wrapped) using
  raw `getTeamColor()` with no lightening at all - fixed on both
  desktop files too, not just mobile, once found. Mobile's extra
  viewport-specific `@media` rules for knockout/Last-Time-When/Team-
  Streaks table score coloring (present on Continental Mobile, using
  hardcoded `#059669`/`#dc2626` unconditionally regardless of theme)
  were also switched to `var(--positive)`/`var(--negative)` so they
  pick up the dark-mode lightened values instead of stalling on the
  unlightened ones inside that specific media query. Same browser-tool
  outage as the rest of this session (confirmed again, still not
  localhost-specific); not live-verified - confidence here comes from
  the mobile CSS/HTML being confirmed structurally identical to
  desktop's pre-fix state at every specific rule touched, verified via
  direct read before each edit, not assumed from file-level similarity.

  A fifth round, from a user report comparing Team Seasons (rows
  alternate) against Match History/Head-to-Head Match History (rows
  don't), both in dark mode. Not actually a dark-mode regression:
  Match History and H2H Match History never had alternating row
  striping in EITHER theme - unlike League Table/Team History, which
  compute a `rowBackgroundClass` (`bg-gray-50`/`bg-white` by
  `index % 2`) per row, these two tables' `<tr>` rendered with an empty
  or absent class the whole time. It just went unnoticed in light mode,
  where `--bg-white`/`--bg-gray-50` are two barely-distinguishable
  near-whites - dark mode's `#222`/`#333` pair makes the same missing
  feature obvious. Added the identical `rowBackgroundClass` pattern to
  both tables' row-rendering loops, in all four files (both already
  compute `index` via `.map((match, index) => ...)`, so no restructuring
  needed, just the same one-line addition already used elsewhere).
  Scoped to exactly what was reported (Match History, H2H Match
  History) - Team Streaks/Last Time When/the older non-bracket
  Knockout List View render through different, single-row-at-a-time
  functions and weren't touched. Same browser-tool outage as the rest
  of this session; not live-verified.

  A sixth round, from a user report that three stacked dark-mode
  sections (League Table, Match History/Head-to-Head bars, Match
  History/Head-to-Head table) look inconsistently shaded on Domestic
  but not on Continental. Root cause: Domestic's League Table/Team
  History row striping (`updateTableDisplay()`,
  `showTeamHistory()`/position-only and progression-equivalent
  variants - 4 spots per file) used a DIFFERENT class pair,
  `bg-gray-100`/`bg-gray-50`, than Continental's `bg-gray-50`/`bg-white`
  (and every other striped table on both pages) - a pre-existing
  divergence between the two pages' implementations, not something
  introduced this session, just invisible in light mode where both
  pairs are barely-distinguishable near-whites. In dark mode,
  `.bg-gray-100`'s value is literally `var(--bg-gray-50)` - the EXACT
  same color `#tableContainer .league-table`'s own container background
  already is - so every other row (the ones landing on `bg-gray-100`)
  blended invisibly into the container instead of alternating, and a
  single-row table (e.g. one team selected, matching the `bg-gray-50`
  branch of the ternary) rendered `#444444`, a visibly different shade
  from the `#222222` the Match History/Head-to-Head boxes right below
  it use. Switched all 4 spots per file (2 in desktop, already found 2
  more by grepping for the same pattern beyond just the one the
  screenshots showed) to the same `bg-gray-50`/`bg-white` pair
  Continental uses; confirmed Continental has zero `bg-gray-100`
  instances anywhere, so nothing needed changing there. Same
  browser-tool outage as the rest of this session; not live-verified.

  A follow-up report (H2H Match History's and Match History's own
  title-strip boxes still looked like slightly different grays)
  turned out not to be a bug: user-side DevTools check found both
  compute to the identical `rgb(68, 68, 68)` in dark mode (and the
  identical light-mode value beforehand too), so the CSS is correct -
  the perceived difference is a simultaneous-contrast illusion from
  the more saturated red/blue content directly above the H2H box,
  not a rendering discrepancy. No code change.

  Committed and pushed to origin/main (2026-09-23, commit `887da6b`).
  Still no full independent browser re-verification of the whole
  suite (the tool outage never resolved this session) - only this
  specific title-box question got a real empirical check, via the
  user's own DevTools, not mine.

- ~~Away-goals tiebreaker missing from two-legged tie results (List View)~~
  — done (2026-09-22): a two-legged Continental tie level on aggregate
  with no penalty shootout recorded was rendering as "TIE def. X & Y"
  instead of showing the actual winner - e.g. Atlético Madrid's 2015-16
  Quarter-Final away-goals win over Bayern München (1-0 home, 1-2 away,
  2-2 on aggregate) showed as a tie, since `calculateAggregateScore()`
  only ever considered aggregate goals, then a shootout - never UEFA's
  historical away-goals rule. Fixed by adding an away-goals check
  between those two steps, gated to the seasons the rule actually
  applied: 1966-67 through 2020-21 (`isAwayGoalsRuleActive()`, deriving
  each match's season from its own date rather than a separate season
  lookup). The summary line now reads "Atlético Madrid def. Bayern
  München 2-2, (Away Goals 1-0)". Verified against that exact example;
  synthetic tests confirmed post-2020-21 and pre-1966-67 ties still
  correctly fall through to the existing "shouldn't happen" TIE
  fallback (rather than wrongly applying away goals) and that
  penalty-shootout ties are unaffected; spot-checked season boundaries
  directly (1965-66: 0 away-goals decisions, 1970-71: 5, 2020-21: 1,
  2021-22: 0); no console errors.

- ~~Shareable filter state~~ — done (2026-09-03): a "🔗 Copy Link" button on
  each of League Tables & Head-to-Head, Team Seasons, The Last Time When, and
  Team Streaks copies a URL that reopens that exact tab with its filters
  restored, fully editable (no lock). Added to all four pages
  (Domestic/Continental, desktop/mobile). Uses its own param names
  (`view`/`t1`/`t2`/`season`/...), entirely separate from the Team
  Dashboard's `?league=&team=` locked-team scheme, so the two link types can
  never collide - a shared filter link never locks Team 1 or shows the
  dashboard header. Captures each tab's core selections (team(s),
  season/date, stage where applicable, and that tab's own defining filters
  like streak type/status) rather than every minor toggle, to stay
  maintainable. Restoration reuses each field's own change handler/dispatched
  event instead of duplicating their side effects, including the async
  league-load Continental's Team Seasons tab needs when the link specifies a
  different league than the current one. The button lives inside each tab's
  description box - beside the text on desktop, underneath it on mobile
  (where the longer wrapped text made a side-by-side button stretch or
  crowd the row).

- ~~Compare a team against a whole country (Continental-specific)~~ — done
  (2026-09-03): in League Tables & Head-to-Head, The Last Time When, and Team
  Streaks, Team 2 can now be a country (e.g. "🇩🇪 Germany") instead of a single
  club — the country option appears in the Team 2 dropdown once Team 1 is
  picked, and shows Team 1's results against every team from that country
  combined. Follows the same pattern as Domestic's "Big 6" group: a sentinel
  Team 2 value (`COUNTRY:<name>`), a shared match filter, and highlight/label
  helpers so match tables, H2H visualizations, and streak titles all display
  the country name and flag correctly. Countries are listed after all club
  teams in the Team 2 dropdown, not before. Team Seasons is unaffected (out
  of scope, as it has no Team 2 concept). Fixed a related bug in the process:
  Last Time When's per-match result classification was checking the exact
  Team 2 name, which would have silently shown no results for a country
  selection - it now classifies by whether Team 1 was home or away, which
  works for both a specific opponent and a country group.

- ~~Country field on the team registry (Continental-specific)~~ — done
  (2026-09-04): every `getTeamColors()` entry in
  `ContinentalEurope.html`/`ContinentalEuropeMobile.html` is now
  `[name, color, crestId, country]`. The 5 domestic buckets get their
  country mechanically (bucket = country); the 478 Champions-League-only
  clubs (Benfica, Ajax, Galatasaray, down to obscure qualifiers like
  `SS Murata`/`B68 Toftir`) were tagged by hand from football knowledge —
  no data source carries this. Added `getTeamCountry(teamName, league)`
  alongside `getTeamColor`/`getTeamLogoUrl`. The actual "compare vs. a
  country" UI/feature is still unbuilt — this is just the data layer for it.
  Four entries flagged as lower-confidence (`FC Rànger's`, `Víkingur`,
  `FC Dinamo City`, `FK Obilić`) were web-verified afterward — all correct.

- ~~Team dashboard/profile page~~ — done for Domestic (2026-09-03) and
  Continental (2026-09-03). Domestic: a search bar on `index.html` (embedded
  team directory, as-you-type filter) links to
  `DomesticEurope.html?league=&team=`, which locks Team 1 to that team and
  shows a snapshot header (crest, position, points, W-D-L, last 5 results,
  "Change Team"). The same search also lives directly on
  `DomesticEurope.html`/`DomesticEuropeMobile.html` (in place of the
  snapshot whenever no team is locked), switching league automatically and
  working from any tab without losing that tab's own state.
  Continental: the identical in-page search + locked-team + snapshot header
  mechanism, ported to `ContinentalEurope.html`/`ContinentalEuropeMobile.html`
  via `?team=` (no `league` param needed — Champions League is the only
  selectable competition there). The team directory merges all 6
  `getTeamColors()` buckets (the 5 domestic ones plus the Champions-League-
  only bucket of non-top-5-league clubs), deduped by name. `index.html`'s
  landing-page search intentionally stays Domestic-only, to avoid ambiguity
  for teams that appear in both (e.g. Real Madrid) — Continental's dashboard
  is reachable via its own in-page search, not from the landing page.

- ~~Finish the Continental mobile redesign for grouped-phase/knockout
  tables~~ — done (2026-09-03): merged W-D-L/GF:GA columns, sticky Pos/Team,
  arrows removed, applied to `displayGroupedPhasesTables` and
  `displayKnockoutMatchHistory`.

- ~~Add "Failed to Score" streak type~~ — done (2026-09-03): 0 goals scored,
  regardless of result, the mirror of Scoring Streak. Added to all four
  pages (Domestic/Continental, desktop/mobile). ("Both Teams Scored" was
  considered and dropped as not needed.)
