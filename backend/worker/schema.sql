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
    is_qualifier INTEGER NOT NULL DEFAULT 0  -- Continental only; 0/1
);

-- The query patterns we need to serve fast:
--   1. Every match for one team (home or away), within one competition   -> team history
--   2. Every match between two specific teams                            -> head-to-head
--   3. Every match within one competition (to build a full table)        -> standings
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team);
CREATE INDEX IF NOT EXISTS idx_matches_div ON matches(div);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);

-- Lets the daily sync use INSERT OR IGNORE to add only genuinely new
-- matches without re-writing the whole table (D1's free tier caps writes
-- at 100,000 rows/day - well under our 166k+ total row count).
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique ON matches(div, date, home_team, away_team);
