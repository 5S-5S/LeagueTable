# TODO

Feature ideas, not yet scheduled.

- On hold: **Biggest Win / Biggest Loss / Closest Match finders** — shelved
  (2026-09-23), same reason as the mini-league item below: one open question
  before starting. "Arsenal's biggest ever win" (team-scoped) and "closest
  1-goal games this season" (league-wide, no team implied) are two different
  features wearing one description:
  - **Team-scoped** is cheap - it's `calculateLastTimeWhen()`'s exact shape
    with the sort key swapped (max/min `|homeGoals - awayGoals|` instead of
    max date), reusing the same team-scoped match cache, day-of-week/
    location filters, and one-card-per-category rendering. Fits as a new
    mode inside The Last Time When... tab.
  - **League-wide** ("closest games this season," no team required) doesn't
    fit there at all - that tab hard-requires Team 1 before it loads
    anything. Needs a different data source (a full division/season scan,
    closer to League Table's no-team-selected view) and probably a ranked
    top-N list UI instead of single-card-per-category.
  - Decide which (or both) before starting - team-only is the cheap path,
    league-wide is a real second feature bolted onto the same name.

- On hold: **Multi-team table filter / mini-league** — scoped out
  (2026-09-04), paused while other ideas are explored. Turned out to be a
  genuine fork, not a simple Team 2 extension:
  - **Not** "Team 1 vs a custom group" (which would've been a third flavor
    of the existing Big 6/Country pattern - one aggregated row, reusing
    `filterMatchesByOpponent`/`teamsToShow`).
  - **Is** a mini-league: pick 3+ teams, filter the match data down to only
    games where *both* home and away teams are in the selected group, then
    run the existing standings computation on that subset. No Team 1/Team 2
    pairing, no aggregated row, no phantom-sentinel trick - each selected
    team gets its own real row, computed normally, just from a smaller match
    set. E.g. if Arsenal played 15 total matches but only 5 each vs Chelsea/
    Spurs/West Ham (the other selected teams), Arsenal's mini-league row
    shows 15 GP (5+5+5), not its real season total.
  - Open questions before starting: (1) League Table only, or also extend to
    Last Time When/Team Streaks? (a "mini-league" doesn't map onto those the
    same way Big 6/Country did, since a streak or "last time" is inherently
    two-team, not group-standings). (2) Minimum team count (3+, since 2 is
    already H2H) and any practical max. (3) The multi-select UI itself is
    genuinely new - no multi-pick control exists anywhere in the app today
    (every team picker is single-select); likely shape is a new "add
    team"/chip control, separate from the existing Team 1/Team 2 comboboxes.

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
  possibly with a second team overlaid for comparison.

## Done

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
