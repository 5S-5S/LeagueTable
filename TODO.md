# TODO

Feature ideas, not yet scheduled.

- **Biggest Win / Biggest Loss / Closest Match finders** — e.g. "Arsenal's
  biggest ever win" or "closest 1-goal games this season." Same match data,
  different sort/filter lens.

- **Shareable filter state** — encode the current league/team/date
  selections into the URL so a link reopens the exact same view.

## Done

- ~~Team dashboard/profile page~~ — done (2026-09-03), Domestic only for v1:
  a search bar on `index.html` (embedded team directory, as-you-type filter)
  links to `DomesticEurope.html?league=&team=`, which locks Team 1 to that
  team and shows a new snapshot header (crest, position, points, W-D-L, last
  5 results, "Change Team"). The same team search also lives directly on
  `DomesticEurope.html`/`DomesticEuropeMobile.html` (in place of the snapshot
  whenever no team is locked), switching league automatically if the picked
  team isn't in the currently selected one, so the dashboard doesn't require
  going through `index.html` first. Continental is a fast-follow, not yet
  done.

- ~~Finish the Continental mobile redesign for grouped-phase/knockout
  tables~~ — done (2026-09-03): merged W-D-L/GF:GA columns, sticky Pos/Team,
  arrows removed, applied to `displayGroupedPhasesTables` and
  `displayKnockoutMatchHistory`.

- ~~Add "Failed to Score" streak type~~ — done (2026-09-03): 0 goals scored,
  regardless of result, the mirror of Scoring Streak. Added to all four
  pages (Domestic/Continental, desktop/mobile). ("Both Teams Scored" was
  considered and dropped as not needed.)
