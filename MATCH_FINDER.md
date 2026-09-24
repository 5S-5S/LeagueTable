# Match Finder — Feature Spec & Build Plan

Status: **single-match mode built across all four surfaces
(Continental/Domestic × desktop/mobile), not yet visually verified in
a live browser.** Double-Legged Tie mode (Continental only) is not
built yet. Do not consider this feature done until the remaining
unchecked items below are complete.

## Build checklist

- [x] Add "Match Finder" tab (2nd position, right after "League Tables
      & Head to Head Stats") to `ContinentalEurope.html`
- [x] Add "Match Finder" tab (2nd position) to `DomesticEurope.html`
- [x] Add "Match Finder" tab (2nd position) to `ContinentalEuropeMobile.html`
- [x] Add "Match Finder" tab (2nd position) to `DomesticEuropeMobile.html`
- [x] Build the shared filter bar (league/competition selector, season,
      date range, day of week, competition stage, Team 1 + Team 2
      comboboxes, Home/Away/Penalty-Shootout checkboxes, Exclude
      Qualifiers/Exclude Main Stage), matching each surface's own
      existing filter-bar conventions. Point-Deductions checkbox was
      deliberately dropped - it only affects standings-points
      calculations, which don't apply to a raw match list. Domestic
      has no Stage/Exclude-Qualifiers/Exclude-Main-Stage/
      Penalty-Shootout controls at all (matching its own League
      Filters bar - domestic league matches carry no
      competition-phase/qualifier/shootout data to begin with).
- [x] Enforce the Team 1-required gate (same empty-state UX as The
      Last Time When... and Team Streaks - no results render until a
      team is picked)
- [x] Implement single-match category computation: Biggest Victory,
      Biggest Defeat, Highest-Scoring Draw, Most Total Goals, each
      with a Home/Away split
- [ ] Add the Continental-only "Single Match" / "Double-Legged Tie"
      mode toggle (not shown on Domestic - Domestic has no multi-leg
      ties, ever)
- [ ] Implement two-legged tie aggregate computation for Continental's
      tie mode - reuse/adapt `computeTieBreakdown()` from the
      `knockout-bracket-view` branch (already handles aggregate score,
      AET, penalties, and the single-leg-pairing edge case via
      `isSingleLeg`) rather than reimplementing tie logic from scratch.
      Still an open question (per the spec's original note) whether to
      depend on that branch, port a minimal standalone copy of just
      the tie-breakdown logic, or wait for it to merge.
- [ ] All four categories become aggregate-based in tie mode (Biggest
      Aggregate Victory/Defeat, Highest-Scoring Aggregate Tie, Most
      Total Aggregate Goals) - Home/Away hidden entirely in this mode,
      since a two-legged tie has no single "home" venue
- [x] Classify a single match decided by penalties as a **Draw**,
      using the regulation/AET score (not the shootout score) for goal
      totals - only occurs for Finals (always single-match) and the
      2019-20 COVID-format knockout rounds
- [x] Results table: show the full matching list (no pagination/top-N
      cap), sorted by the category's metric descending, ties broken by
      most-recent match first - reuse the existing sortable
      `.league-table` component (same one Match History/H2H Match
      History already use) rather than a new table pattern
- [x] Add a value column to the results table showing the metric the
      category is actually ranked by (Margin for Victories/Defeats,
      Total Goals for Draws/Most Total Goals), colored using the
      existing win/draw/loss color scheme
- [x] Dark mode correct from day one: built entirely from existing
      classes/variables already audited this session
      (`--text-primary`/`--text-secondary`/`--positive`/`--negative`,
      `.league-table`, `.win-score`/`.text-red-600`/`.text-gray-400`,
      `.form-input`, `.checkbox`) - no new CSS was needed in any of
      the 4 files.
- [x] Shareable filter link ("Copy Link") support, consistent with
      every other tab
- [ ] UI pass: confirm filter bar, buttons, table styling, fonts, and
      spacing all match the rest of the site exactly - no new visual
      patterns introduced (needs a live look; environment's browser
      tool has been unavailable all session, so this has only been
      checked via static code review + actual JS syntax validation,
      not visually)
- [ ] Verify across all four surfaces (Continental/Domestic ×
      desktop/mobile) in both light and dark mode before calling it done

## Overview

A new tab, **Match Finder**, letting a user find standout individual
matches (or, for Continental, standout knockout *ties*) for a team or
a specific team pairing: biggest wins, biggest losses, highest-scoring
draws, and highest-scoring matches overall.

This directly replaces the earlier shelved "Biggest Win / Biggest
Loss / Closest Match finders" backlog item - see TODO.md's entry for
why that got stuck (team-scoped and league-wide were two different
features under one name) and how requiring a team here resolves it.

## Tab placement

Second tab, immediately after "League Tables & Head to Head Stats,"
before "Team Seasons." Present on all four pages: Continental and
Domestic, desktop and mobile.

## Scope requirement: Team 1 is mandatory

Unlike League Tables & Head-to-Head (where Team 1 is optional), Match
Finder **requires** Team 1 to be selected before anything renders -
same UX pattern as The Last Time When... and Team Streaks. This was a
deliberate late decision, not an oversight:

- It resolves the original team-scoped-vs-league-wide fork that
  shelved this feature - there's no more "no team, league-wide" mode
  to design a separate UI/data path for.
- It means Match Finder can reuse the same team-scoped/H2H-scoped
  match caches (`teamHistoryApiCache`/`h2hApiCache`) that Last Time
  When and Team Streaks already load, which are proven to handle a
  team's entire multi-decade history without needing new backend work
  or a full-competition data pull (Champions League alone has 8,900+
  matches across 70+ years - "biggest win of all time, no team
  filter" would have needed a dedicated backend query neither this nor
  any other feature currently has).

Team 2 stays optional, same as League Tables & Head-to-Head:

- **Team 1 only**: results span all of Team 1's matches, any
  opponent, narrowed by whatever filters are active.
- **Team 1 + Team 2**: results narrow to matches specifically between
  the two (H2H-scoped) - e.g. "Arsenal vs Chelsea, Biggest Victory,
  Home" means Arsenal's biggest home win specifically against Chelsea.

## Filter bar

Reuses League Tables & Head-to-Head's filter bar as closely as
possible: league/competition selector, season, date range, day of
week, competition stage, Team 1 (required) + Team 2 (optional)
comboboxes, Home/Away/Point-Deductions checkboxes, Penalty Shootouts
checkbox, Exclude Qualifiers/Exclude Main Stage checkboxes. No new
filter-control patterns.

## Categories

Four categories, each with an optional Home/Away split:

1. **Biggest Victories**
2. **Biggest Defeats**
3. **Highest-Scoring Draws**
4. **Most Total Goals**

All four are always available once Team 1 is selected (an earlier
draft had "Biggest Defeats" hidden when no team was selected, back
when league-wide-no-team was still in scope - now that Team 1 is
always required, that condition never triggers, so all four categories
are simply always shown).

### Home/Away split semantics

Home/Away is relative to **Team 1's** side in the match, not an
abstract "which side of the fixture" tag - same convention as H2H's
existing Home/Away checkboxes and Last Time When's "Last Win at
Home"/"Last Win Away" cards. "Biggest Victories (Home)" with Arsenal
as Team 1 means Arsenal's biggest win while playing at home,
regardless of who the opponent was (or specifically against Team 2, if
one is set).

## Continental-specific: Single Match vs. Double-Legged Tie mode

Domestic matches are always single games - no mode toggle needed
there. Continental knockout rounds (Round of 16 onward, except the
Final) are two legs per tie, so Continental gets an extra toggle:

- **Single Match mode** (default): the four categories operate on
  individual match results, exactly as described above. Home/Away
  applies normally.
- **Double-Legged Tie mode**: the four categories become aggregate-tie
  versions - Biggest Aggregate Victory/Defeat, Highest-Scoring
  Aggregate Tie, Most Total Aggregate Goals - computed across both
  legs of a tie rather than per match. **Home/Away is hidden entirely
  in this mode**: a two-legged tie has no single home venue for Team 1
  (they're home in one leg, away in the other), so the concept simply
  doesn't apply, the same way it doesn't apply when no team is
  selected elsewhere on the site.

Tie-mode computation should reuse `computeTieBreakdown()` (built for
the Knockout Bracket feature on the `knockout-bracket-view` branch)
rather than reimplementing aggregate/AET/penalty logic from scratch -
it already handles the single-leg-pairing edge case (a Final, or an
early round where only one leg exists in the data) via its
`isSingleLeg` flag, which double-legged tie mode would otherwise need
to solve again from scratch. If that branch hasn't merged by the time
Match Finder is built, decide then whether to depend on it, port a
minimal copy of the relevant logic, or wait.

## Penalty shootouts

A single match (not a two-legged tie) decided by a penalty shootout is
classified as a **Draw**. Goal totals for ranking purposes use the
regulation/AET score, not the shootout score. This is a narrow case in
practice - single-match knockout games only happen in Finals (always
one match) or the 2019-20 season, when COVID forced the remaining
Champions League/Europa League knockout rounds into a single-elimination,
single-match format.

## Ranking, ties, and result count

- Show the **full** list of matching results for a category - no
  top-N cap, no pagination. Nothing else on the site paginates either,
  so this stays consistent.
- Sort by the category's metric, descending.
- Ties (equal metric value, e.g. two 6-0 wins) are broken by
  **most recent match first**.
- Reuse the existing sortable `.league-table` table component (the
  same one Match History and H2H Match History already use) for
  displaying results, pre-sorted by the category's metric - users can
  still click other column headers to re-sort, same as those tables
  already allow.

## Result table: value column

The table needs to visibly show the value each category is actually
ranked by - otherwise the user has to mentally subtract scores to see
why one row outranks another. The column's label and content change by
category rather than always showing the same thing:

- **Biggest Victories / Biggest Defeats** → a **Margin** column,
  signed (`+4`, `-7`), same `+`/`-` formatting the existing GD column
  already uses.
- **Highest-Scoring Draws / Most Total Goals** → a **Total Goals**
  column instead - margin is always 0 for a draw and isn't the sort
  key for "Most Total Goals," so it isn't the useful number there.
- **Double-Legged Tie mode** → the aggregate version of the same
  idea - **Aggregate Margin** or **Aggregate Total Goals**, matching
  whichever category is active.

Colored using the same win/draw/loss scheme already used everywhere
else on the site (`.win-score` green / `.text-gray-400` gray /
`.text-red-600` red) - not a single fixed color for the whole column:

- In the Margin column, a positive margin (Team 1 won) is green, a
  negative margin (Team 1 lost) is red.
- In the Total Goals column, color follows that row's actual result
  relative to Team 1 - green if Team 1 won, gray if it was a draw, red
  if Team 1 lost. This matters most for "Most Total Goals," which can
  mix wins, losses, and draws in the same list; for "Highest-Scoring
  Draws" every row is a draw, so the column is gray throughout by
  definition.

## UI consistency

Explicit requirement, not just an assumption: Match Finder should look
and behave like it already belongs on the site, not like a bolted-on
new feature.

- Filter bar: identical layout/styling to League Tables &
  Head-to-Head's.
- Results table: the same `.league-table` component, same header
  styling, same row striping, same hover states.
- Tab button: same styling as the other four tab buttons.
- Team colors/logos, win-score/draw-score/loss coloring: reuse the
  existing `.win-score`/`.text-red-600`/`.text-gray-400` classes and
  `pickTeamTextColor()` dark-mode lightening, not new color logic.
- Copy Link shareable-state support, consistent with every other tab.
- Dark mode correct at launch, using the variable scheme
  (`--text-primary`/`--text-secondary`/`--positive`/`--negative`) and
  patterns (`.league-table` dark border, `bg-white`/`bg-gray-50`
  striping) already established - see TODO.md's dark mode entries for
  the specific pitfalls already found and fixed once (e.g. a class
  applied directly to a `<td>` needs `!important` to beat the generic
  dark-mode `.league-table td` rule; a class on a wrapping `<span>`
  does not).
