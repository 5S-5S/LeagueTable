# TODO

Feature ideas, not yet scheduled.

- **Team dashboard/profile page** — a single consolidated view per team
  (league position, current streaks, recent H2H, season history) instead of
  hopping across the League Table / Team Seasons / Last Time When / Streaks
  tabs. Mostly wiring together calc functions that already exist.

- **Biggest Win / Biggest Loss / Closest Match finders** — e.g. "Arsenal's
  biggest ever win" or "closest 1-goal games this season." Same match data,
  different sort/filter lens.

- **Shareable filter state** — encode the current league/team/date
  selections into the URL so a link reopens the exact same view.

## Done

- ~~Finish the Continental mobile redesign for grouped-phase/knockout
  tables~~ — done (2026-09-03): merged W-D-L/GF:GA columns, sticky Pos/Team,
  arrows removed, applied to `displayGroupedPhasesTables` and
  `displayKnockoutMatchHistory`.

- ~~Add "Failed to Score" streak type~~ — done (2026-09-03): 0 goals scored,
  regardless of result, the mirror of Scoring Streak. Added to all four
  pages (Domestic/Continental, desktop/mobile). ("Both Teams Scored" was
  considered and dropped as not needed.)
