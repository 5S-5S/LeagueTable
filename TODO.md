# TODO

Feature ideas, not yet scheduled.

- **Biggest Win / Biggest Loss / Closest Match finders** — e.g. "Arsenal's
  biggest ever win" or "closest 1-goal games this season." Same match data,
  different sort/filter lens.

- **Shareable filter state** — encode the current league/team/date
  selections into the URL so a link reopens the exact same view.

- **Country field on the team registry (Continental-specific)** — add a
  country to each team's entry in the `getTeamColors()`-style logo matrix
  (currently `[name, color, crestId]` per league) so a team's performance
  can be compared against all teams from another country, not just a single
  league/club. Continental competitions mix teams across countries, so this
  only makes sense there.

## Done

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
