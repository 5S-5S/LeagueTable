# TODO

Feature ideas, not yet scheduled.

- **Biggest Win / Biggest Loss / Closest Match finders** — e.g. "Arsenal's
  biggest ever win" or "closest 1-goal games this season." Same match data,
  different sort/filter lens.

- **Multi-team table filter** — extend Team 2 selection beyond two teams (or
  beyond the fixed Big 6/country group) to an arbitrary custom list, so users
  can build their own comparison group on the fly. Reuses the existing
  `teamsToShow` mechanism already in place for Big 6/country mode.

- **Side-by-side Team Seasons** — a split view comparing two teams'
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

- Maybe: **"On this day"** — a small widget (dashboard or landing page)
  showing historical matches that happened on today's date, using existing
  match data with a date filter.

- Maybe: **Pinned/favorite team** — remember a user's team via
  `localStorage` so the landing-page search can offer a one-click shortcut
  back to their dashboard instead of retyping every visit.

- Maybe: **Team progression chart** — a line chart (points or league
  position per season) on the Team Dashboard for Domestic and Continental,
  possibly with a second team overlaid for comparison. Also interesting:
  a visual knockout bracket for Continental (Round of 16 through Final).

## Done

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
