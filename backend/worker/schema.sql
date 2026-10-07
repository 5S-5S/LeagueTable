-- D1 schema for match data.
-- One table covers both Domestic and Continental apps, same shape as the
-- flat row objects the frontend currently works with in-memory. `div`
-- discriminates competition (E0/SP1/I1/D1/F1 for Domestic; C1/E1/C2 for
-- Continental), matching the Div codes already used throughout the
-- existing frontend JS.

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    div TEXT NOT NULL,
    date TEXT NOT NULL,              -- ISO 'YYYY-MM-DD'
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_goals INTEGER NOT NULL,
    away_goals INTEGER NOT NULL,
    competition_phase TEXT,          -- Continental only (e.g. 'Group Stage', 'Final'); NULL for Domestic
    is_qualifier INTEGER NOT NULL DEFAULT 0,  -- Continental only; 0/1
    additional_info TEXT              -- Continental only (e.g. 'pso 4:3' for penalty shootouts); NULL otherwise
);

-- The query patterns we need to serve fast:
--   1. Every match for one team (home or away), within one competition   -> team history
--   2. Every match between two specific teams                            -> head-to-head
--   3. Every match within one competition (to build a full table)        -> standings
CREATE INDEX IF NOT EXISTS idx_matches_div ON matches(div);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);

-- team-history/head-to-head's actual query shape is "div = ? AND
-- home_team = ?" (and the away_team equivalent) - this database has no
-- ANALYZE statistics, so D1/SQLite's query planner can't tell that's far
-- more selective than the div-only prefix of idx_matches_unique, and
-- picks that for every team lookup regardless (verified: read the whole
-- division - 51,381 rows - to return one team's ~4,400 matches, 8.6%
-- efficient). These composite indexes are forced explicitly via
-- INDEXED BY in src/index.js's queryTeamMatches()/
-- queryHeadToHeadMatches() rather than left for the planner to pick -
-- with them, the same lookup reads 4,407 rows for 4,405 actual matches.
CREATE INDEX IF NOT EXISTS idx_matches_home_team_div ON matches(home_team, div);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_div ON matches(away_team, div);

-- idx_matches_home_team/idx_matches_away_team (single-column, no div)
-- used to exist here too - dropped from production (2026-09-22),
-- superseded by the composite indexes above (a composite index already
-- serves any query filtering on just its leading column).

-- /api/teams' query ("every distinct team name in this division") has
-- no single equality target for an index to seek to the way team-
-- history/head-to-head do, so the fix there is different: these two
-- composite indexes (div leading, not trailing, unlike the pair above)
-- let src/index.js's queryDistinctTeams() walk distinct values directly
-- via a recursive-CTE loose index scan instead of reading the whole
-- division (verified: 266 rows read for E0's 65 teams, vs 102,892 for
-- the naive DISTINCT/UNION query it replaced - 387x fewer).
CREATE INDEX IF NOT EXISTS idx_matches_div_home_team ON matches(div, home_team);
CREATE INDEX IF NOT EXISTS idx_matches_div_away_team ON matches(div, away_team);

-- Lets the daily sync use INSERT OR IGNORE to add only genuinely new
-- matches without re-writing the whole table (D1's free tier caps writes
-- at 100,000 rows/day - well under our 166k+ total row count).
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique ON matches(div, date, home_team, away_team);

-- Upcoming fixtures for the home page's upcoming-matches strip - deliberately a
-- separate table from `matches`, which only ever holds played results
-- (every query there assumes a score). Refreshed daily by
-- scripts/update_fixtures.py from football-data.org: each run upserts
-- what it fetched (stamped with that run's fetched_at), then deletes rows
-- that weren't in the fetch (played, postponed or dropped) - so a run that
-- fails part-way leaves the previous day's fixtures in place rather than
-- an empty table. Team names are already mapped to the site's own names.
CREATE TABLE IF NOT EXISTS fixtures (
    match_id INTEGER PRIMARY KEY,     -- football-data.org match id (stable across reschedules)
    div TEXT NOT NULL,                -- E0/SP1/I1/D1/F1/C1, same codes as `matches`
    utc_date TEXT NOT NULL,           -- kick-off, ISO 8601 UTC ('2026-10-10T11:30:00Z')
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    matchday INTEGER,                 -- NULL when the API has none (e.g. CL knockouts)
    competition_phase TEXT,           -- Continental only, same strings as matches.competition_phase
    status TEXT NOT NULL,             -- 'SCHEDULED' or 'TIMED' (kick-off time confirmed)
    fetched_at TEXT NOT NULL          -- the run that last wrote this row
);

CREATE INDEX IF NOT EXISTS idx_fixtures_utc_date ON fixtures(utc_date);
