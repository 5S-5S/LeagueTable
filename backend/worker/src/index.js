// LeagueTable API - Cloudflare Worker
//
// GET /api/team-history?div=E0&team=Arsenal%20FC
//   -> { team, div, matches: [{ date, homeTeam, awayTeam, homeGoals, awayGoals, competitionPhase, isQualifier, additionalInfo }, ...] }
//
// GET /api/head-to-head?div=E0&team1=Arsenal%20FC&team2=Liverpool%20FC
//   -> { team1, team2, div, matches: [...] }
//   team2 may be a comma-separated list of opponents (e.g. a "Big 6" or
//   country grouping) - the frontend resolves which teams that means
//   client-side (unchanged) and just sends the resolved names here.
//   -> { team1, team2: [...], div, matches: [...] }
//
// GET /api/standings?div=E0&dateFrom=&dateTo=&dayOfWeek=&threePointSystem=&homeFilter=&awayFilter=&excludeQualifiers=&excludeMainStage=&competitionStage=
//   -> { div, matchCount, matchDateRange: {start, end} | null, standings: [{ team, played, won, drawn, lost, goalsFor, goalsAgainst, points }, ...] }
//   excludeQualifiers/excludeMainStage/competitionStage are Continental-
//   only and cover the FLAT (non-grouped) table - the branch
//   calculateTable() in ContinentalEurope.html takes when no specific
//   season is selected (no season, or an era filter). Points are
//   raw/undeducted - point deductions stay a client-side correction (the
//   table is hardcoded in the frontend, not duplicated here).
//
// GET /api/season-matches?div=C1&dateFrom=&dateTo=
//   -> { div, matches: [{ date, homeTeam, awayTeam, homeGoals, awayGoals, competitionPhase, isQualifier, additionalInfo }, ...] }
//   Raw match rows (same shape as team-history/head-to-head) for one
//   division bounded to a date range - used for Continental's
//   grouped-by-competition-phase standings view, which needs match-level
//   granularity (competitionPhase, individual scores) to build its
//   per-phase mini-tables and knockout match-history display client-side.
//   Always called with a single season's date range, so the result stays
//   small (one season's matches, not the full division history).
//
// POST /api/season-standings  body: { div, seasons: [{season, start, end}, ...], excludeQualifiers?, excludeMainStage? }
//   -> { div, seasons: [{ season, matchCount, standings: [{ team, played, won, drawn, lost, goalsFor, goalsAgainst, points, lastMatch }, ...] }, ...] }
//   Batch version of /api/standings for Team Seasons: buckets one
//   division's entire match history into the given season date ranges in
//   a single query/pass, returning each season's full (all-teams,
//   raw/undeducted) standings. The client applies point deductions and
//   ranking overrides itself (unchanged, hardcoded, never duplicated
//   here) to find the requested team's final position per season - this
//   endpoint only supplies the compact per-team-per-season aggregates.
//   excludeQualifiers/excludeMainStage are Continental-only. lastMatch
//   (each team's chronologically final match that season - date,
//   homeTeam, awayTeam, scores, competitionPhase, additionalInfo, or null)
//   is also Continental-only, used to determine tournament progression
//   (e.g. did the team win the Final) without a second per-team request.
//
// Caching: every endpoint above is cached in KV (see
// withCache()/getCacheVersion() below) rather than re-reading D1 on every
// request - /api/standings and /api/season-standings because they each
// scan an entire division, and /api/team-history and /api/head-to-head
// because even a "cheap, single-team" read adds up once traffic (or
// heavy testing) sends enough of them in a day. Invalidation is
// version-based, not a blind TTL - sync.mjs bumps the 'cache-version' KV
// key as its last step, once its D1 writes for the day commit, so cached
// results are never more stale than "since the last sync" (the same lag
// that already exists in the data itself).

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

// Response cache for the two full-division-scan endpoints (/api/standings
// and /api/season-standings) - both read the entire division from D1 on
// every call today, which is fine for one request but doesn't scale with
// traffic (every visitor viewing League Table's default view or Team
// Seasons pays the full read again). Match data only changes once a day
// (the sync workflow), so there's nothing to gain from re-reading D1 more
// often than that.
//
// Invalidation is version-based rather than a blind TTL: sync.mjs bumps
// the 'cache-version' key in KV as its last step, after its D1 writes
// commit, and every cache key here folds that version in - so entries
// from before today's sync become unreachable immediately rather than
// serving stale data until an arbitrary timer expires. CACHE_TTL_SECONDS
// below is just a backstop so orphaned old-version entries eventually get
// garbage collected even if nothing ever re-reads them.
const CACHE_TTL_SECONDS = 60 * 60 * 48;

async function getCacheVersion(env) {
    return (await env.CACHE.get('cache-version')) || '0';
}

// Wraps an expensive compute step with a KV cache keyed by an endpoint
// name plus caller-supplied key parts (which must include every request
// parameter that affects the result - the classic caching bug is a
// parameter that's missing from the key, causing one query's response to
// be silently served for a different one). A cache write failure doesn't
// fail the request - caching is an optimization, not a correctness
// requirement, so the response is still returned either way.
async function withCache(env, keyParts, compute) {
    const version = await getCacheVersion(env);
    const key = `v${version}:${keyParts.join(':')}`;

    const cached = await env.CACHE.get(key);
    if (cached !== null) {
        return JSON.parse(cached);
    }

    const result = await compute();
    try {
        await env.CACHE.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS });
    } catch (err) {
        console.error('Failed to write cache entry:', err);
    }
    return result;
}

// Canonical, order-independent representation of a request's query
// params, for use as a cache key - sorted so ?div=E0&dateFrom=X and
// ?dateFrom=X&div=E0 hit the same cache entry.
function canonicalQueryKey(url) {
    return [...url.searchParams.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
}

async function handleTeamHistory(url, env) {
    const div = url.searchParams.get('div');
    const team = url.searchParams.get('team');

    if (!div || !team) {
        return jsonResponse({ error: 'div and team query params are required' }, 400);
    }

    const body = await withCache(env, ['team-history', canonicalQueryKey(url)], async () => {
        const { results } = await env.DB.prepare(
            `SELECT date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier, additional_info
             FROM matches
             WHERE div = ?1 AND (home_team = ?2 OR away_team = ?2)
             ORDER BY date ASC`
        ).bind(div, team).all();

        const matches = results.map(row => ({
            date: row.date,
            homeTeam: row.home_team,
            awayTeam: row.away_team,
            homeGoals: row.home_goals,
            awayGoals: row.away_goals,
            competitionPhase: row.competition_phase,
            isQualifier: !!row.is_qualifier,
            additionalInfo: row.additional_info,
        }));

        return { team, div, matches };
    });

    return jsonResponse(body);
}

async function handleHeadToHead(url, env) {
    const div = url.searchParams.get('div');
    const team1 = url.searchParams.get('team1');
    const team2Param = url.searchParams.get('team2');

    if (!div || !team1 || !team2Param) {
        return jsonResponse({ error: 'div, team1, and team2 query params are required' }, 400);
    }

    const opponents = team2Param.split(',').map(t => t.trim()).filter(Boolean);
    if (opponents.length === 0) {
        return jsonResponse({ error: 'team2 must contain at least one team name' }, 400);
    }

    const body = await withCache(env, ['head-to-head', canonicalQueryKey(url)], async () => {
        const placeholders = opponents.map(() => '?').join(', ');
        const { results } = await env.DB.prepare(
            `SELECT date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier, additional_info
             FROM matches
             WHERE div = ?
               AND (
                 (home_team = ? AND away_team IN (${placeholders}))
                 OR (away_team = ? AND home_team IN (${placeholders}))
               )
             ORDER BY date ASC`
        ).bind(div, team1, ...opponents, team1, ...opponents).all();

        const matches = results.map(row => ({
            date: row.date,
            homeTeam: row.home_team,
            awayTeam: row.away_team,
            homeGoals: row.home_goals,
            awayGoals: row.away_goals,
            competitionPhase: row.competition_phase,
            isQualifier: !!row.is_qualifier,
            additionalInfo: row.additional_info,
        }));

        return { team1, team2: opponents, div, matches };
    });

    return jsonResponse(body);
}

// Historical point-system rule: 3 points for a win unless threePointSystem
// is false AND the match falls in one of these leagues' pre-3-point eras.
// Ligue 1's 1988-89 season used 3 points even though the surrounding years
// used 2 - that's the one carve-out. C1 (Champions League) is much
// simpler: 2 points through the 1994-95 season, 3 from 1995-96 on.
// Mirrors winPointsFor() in backend/migration/standings-aggregate.mjs and
// calculateTable()/getHistoricalPointSystem() in DomesticEurope.html/
// ContinentalEurope.html exactly - keep all copies in sync if this changes.
function winPointsFor(div, isoDate, threePointSystem) {
    if (threePointSystem) return 3;
    if (div === 'I1' && isoDate <= '1994-06-30') return 2;
    if (div === 'SP1' && isoDate <= '1995-06-30') return 2;
    if (div === 'D1' && isoDate <= '1995-06-30') return 2;
    if (div === 'F1' && isoDate <= '1994-06-30') {
        if (isoDate >= '1988-07-01' && isoDate <= '1989-06-30') return 3;
        return 2;
    }
    if (div === 'E0' && isoDate <= '1981-06-30') return 2;
    if (div === 'C1' && isoDate < '1995-07-01') return 2;
    return 3;
}

// Continental-only pre-filtering: qualifier exclusion, main-stage-only,
// and competition-stage (group/knockout/specific phase). Mirrors the flat
// branch of calculateTable() in ContinentalEurope.html. Mirrors
// filterContinentalMatches()/matchesStageCategory() in
// backend/migration/standings-aggregate.mjs exactly.
const KNOCKOUT_PHASES = [
    'Round Of 16', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final',
    'Play-Offs', '1. Round', '2. Round',
];

function matchesStageCategory(competitionPhase, stageCategory) {
    if (!competitionPhase || !stageCategory) return false;
    const phase = competitionPhase.toLowerCase();
    switch (stageCategory) {
        case 'League/Group Stage':
            return phase.includes('league phase') || phase.includes('group') ||
                phase.includes('preliminary') || phase.includes('intermediate') ||
                /group [a-z]/i.test(competitionPhase) ||
                /preliminary gr\. [a-z]/i.test(competitionPhase) ||
                /intermediate gr\. [a-z]/i.test(competitionPhase);
        case 'Knock-Out Stage':
            return phase.includes('final') || phase.includes('semi-final') ||
                phase.includes('quarter-final') || phase.includes('round of 16') ||
                phase.includes('play-off') || phase.includes('2. round') || phase.includes('1. round');
        case 'Final': return phase === 'final';
        case 'Semi-Finals': return phase === 'semi-finals';
        case 'Quarter-Finals': return phase === 'quarter-finals';
        case 'Round Of 16':
        case 'Round of 16': return phase === 'round of 16';
        case 'Play-Offs': return phase === 'play-offs';
        case '2. Round': return phase === '2. round';
        case '1. Round': return phase === '1. round';
        default: return false;
    }
}

function filterContinentalMatches(matches, { excludeQualifiers, excludeMainStage, competitionStage }) {
    let filtered = matches;

    if (excludeQualifiers) filtered = filtered.filter(m => !m.isQualifier);
    if (excludeMainStage) filtered = filtered.filter(m => m.isQualifier);

    if (competitionStage) {
        if (competitionStage === 'group-stage') {
            filtered = filtered.filter(m => !KNOCKOUT_PHASES.includes(m.competitionPhase || ''));
        } else if (competitionStage === 'knockout-stage') {
            filtered = filtered.filter(m => KNOCKOUT_PHASES.includes(m.competitionPhase || ''));
        } else {
            filtered = filtered.filter(m => matchesStageCategory(m.competitionPhase, competitionStage));
        }
    }

    return filtered;
}

// Mirrors aggregateStandings() in backend/migration/standings-aggregate.mjs
// exactly (verified offline there against the gists before this endpoint
// was ever deployed - see verify-standings.mjs).
function aggregateStandings(matches, { threePointSystem, homeFilter, awayFilter }) {
    if (matches.length === 0) return { matchDateRange: null, standings: [] };

    const table = new Map();
    const getRow = team => {
        if (!table.has(team)) {
            table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
        }
        return table.get(team);
    };

    let minDate = matches[0].date, maxDate = matches[0].date;

    for (const m of matches) {
        if (m.date < minDate) minDate = m.date;
        if (m.date > maxDate) maxDate = m.date;

        const winPoints = winPointsFor(m.div, m.date, threePointSystem);

        if (homeFilter) {
            const row = getRow(m.homeTeam);
            row.played++;
            row.goalsFor += m.homeGoals;
            row.goalsAgainst += m.awayGoals;
            if (m.homeGoals > m.awayGoals) { row.won++; row.points += winPoints; }
            else if (m.homeGoals < m.awayGoals) { row.lost++; }
            else { row.drawn++; row.points += 1; }
        }

        if (awayFilter) {
            const row = getRow(m.awayTeam);
            row.played++;
            row.goalsFor += m.awayGoals;
            row.goalsAgainst += m.homeGoals;
            if (m.awayGoals > m.homeGoals) { row.won++; row.points += winPoints; }
            else if (m.awayGoals < m.homeGoals) { row.lost++; }
            else { row.drawn++; row.points += 1; }
        }
    }

    const standings = [...table.values()].filter(row => row.played > 0);
    return { matchDateRange: { start: minDate, end: maxDate }, standings };
}

function parseBoolParam(url, name, defaultValue) {
    const raw = url.searchParams.get(name);
    if (raw === null) return defaultValue;
    return raw === 'true' || raw === '1';
}

async function handleStandings(url, env) {
    const div = url.searchParams.get('div');
    if (!div) {
        return jsonResponse({ error: 'div query param is required' }, 400);
    }

    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const dayOfWeekParam = url.searchParams.get('dayOfWeek');
    const dayOfWeek = dayOfWeekParam !== null && dayOfWeekParam !== '' ? parseInt(dayOfWeekParam, 10) : null;
    if (dayOfWeek !== null && (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)) {
        return jsonResponse({ error: 'dayOfWeek must be 0-6 (0=Sunday, matching JS Date.getDay())' }, 400);
    }

    const threePointSystem = parseBoolParam(url, 'threePointSystem', true);
    const homeFilter = parseBoolParam(url, 'homeFilter', true);
    const awayFilter = parseBoolParam(url, 'awayFilter', true);
    const excludeQualifiers = parseBoolParam(url, 'excludeQualifiers', false);
    const excludeMainStage = parseBoolParam(url, 'excludeMainStage', false);
    const competitionStage = url.searchParams.get('competitionStage') || '';

    const body = await withCache(env, ['standings', canonicalQueryKey(url)], async () => {
        let sql = `SELECT div, date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier FROM matches WHERE div = ?1`;
        const params = [div];
        if (dateFrom) { params.push(dateFrom); sql += ` AND date >= ?${params.length}`; }
        if (dateTo) { params.push(dateTo); sql += ` AND date <= ?${params.length}`; }
        if (dayOfWeek !== null) { params.push(dayOfWeek); sql += ` AND CAST(strftime('%w', date) AS INTEGER) = ?${params.length}`; }

        const { results } = await env.DB.prepare(sql).bind(...params).all();

        let matches = results.map(row => ({
            div: row.div, date: row.date, homeTeam: row.home_team, awayTeam: row.away_team,
            homeGoals: row.home_goals, awayGoals: row.away_goals,
            competitionPhase: row.competition_phase, isQualifier: !!row.is_qualifier,
        }));

        if (excludeQualifiers || excludeMainStage || competitionStage) {
            matches = filterContinentalMatches(matches, { excludeQualifiers, excludeMainStage, competitionStage });
        }

        const { matchDateRange, standings } = aggregateStandings(matches, { threePointSystem, homeFilter, awayFilter });

        return { div, matchCount: matches.length, matchDateRange, standings };
    });

    return jsonResponse(body);
}

async function handleSeasonMatches(url, env) {
    const div = url.searchParams.get('div');
    if (!div) {
        return jsonResponse({ error: 'div query param is required' }, 400);
    }

    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let sql = `SELECT date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier, additional_info FROM matches WHERE div = ?1`;
    const params = [div];
    if (dateFrom) { params.push(dateFrom); sql += ` AND date >= ?${params.length}`; }
    if (dateTo) { params.push(dateTo); sql += ` AND date <= ?${params.length}`; }
    sql += ` ORDER BY date ASC`;

    const { results } = await env.DB.prepare(sql).bind(...params).all();

    const matches = results.map(row => ({
        date: row.date,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        competitionPhase: row.competition_phase,
        isQualifier: !!row.is_qualifier,
        additionalInfo: row.additional_info,
    }));

    return jsonResponse({ div, matches });
}

// Buckets a sorted match list into sorted, possibly slightly-overlapping
// season date ranges (a handful of leagues have deliberately-extended
// COVID/post-war season boundaries that overlap their neighbor by a few
// days - see the `seasons` table in the frontend). A single forward
// pointer keeps this O(matches + seasons): for each match we advance past
// any seasons fully behind it, then test membership in the season the
// pointer landed on plus its immediate neighbors (overlaps never reach
// beyond one season away).
function bucketMatchesBySeason(matches, seasons) {
    const sorted = [...seasons].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
    const buckets = sorted.map(() => []);
    let i = 0;

    for (const m of matches) {
        while (i < sorted.length - 1 && m.date > sorted[i].end && m.date >= sorted[i + 1].start) {
            i++;
        }
        for (const j of [i - 1, i, i + 1]) {
            if (j < 0 || j >= sorted.length) continue;
            if (m.date >= sorted[j].start && m.date <= sorted[j].end) {
                buckets[j].push(m);
            }
        }
    }

    return sorted.map((s, idx) => ({ season: s.season, matches: buckets[idx] }));
}

async function handleSeasonStandings(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'request body must be JSON' }, 400);
    }

    const { div, seasons, excludeQualifiers, excludeMainStage } = body || {};
    if (!div || !Array.isArray(seasons) || seasons.length === 0) {
        return jsonResponse({ error: 'div and a non-empty seasons array are required' }, 400);
    }
    if (seasons.length > 400) {
        return jsonResponse({ error: 'too many seasons requested (max 400)' }, 400);
    }
    for (const s of seasons) {
        if (!s || typeof s.season !== 'string' || typeof s.start !== 'string' || typeof s.end !== 'string') {
            return jsonResponse({ error: 'each season entry needs season, start, and end strings' }, 400);
        }
    }

    // Cached by div + exclude flags only, not the season list itself - the
    // frontend always requests every real season a division has
    // (ensureSeasonStandingsLoaded ignores any era filter when building
    // the request), so for a given div/flag combination the season list
    // is effectively constant in practice. A caller sending a different
    // or partial season list for the same div+flags would get back this
    // cached full-season response instead of its own narrower one - fine
    // for this endpoint's only consumer, but worth knowing if it's ever
    // reused elsewhere.
    const responseBody = await withCache(env, ['season-standings', div, !!excludeQualifiers, !!excludeMainStage], async () => {
        const { results } = await env.DB.prepare(
            `SELECT date, home_team, away_team, home_goals, away_goals, is_qualifier, competition_phase, additional_info
             FROM matches WHERE div = ?1 ORDER BY date ASC`
        ).bind(div).all();

        let matches = results.map(row => ({
            div, date: row.date, homeTeam: row.home_team, awayTeam: row.away_team,
            homeGoals: row.home_goals, awayGoals: row.away_goals, isQualifier: !!row.is_qualifier,
            competitionPhase: row.competition_phase, additionalInfo: row.additional_info,
        }));

        if (excludeQualifiers) matches = matches.filter(m => !m.isQualifier);
        if (excludeMainStage) matches = matches.filter(m => m.isQualifier);

        const buckets = bucketMatchesBySeason(matches, seasons);

        // Continental's Team Seasons view needs each team's chronologically
        // last match of the season (its competitionPhase, score, and
        // additionalInfo) to determine how far they progressed (e.g. did they
        // win the Final -> Champions). Matches within each bucket are already
        // date-sorted (inherited from the ORDER BY above), so a single
        // forward pass per bucket - overwriting each team's entry as we go -
        // lands on the right match with no extra sorting.
        function lastMatchPerTeam(seasonMatches) {
            const last = new Map();
            for (const m of seasonMatches) {
                last.set(m.homeTeam, m);
                last.set(m.awayTeam, m);
            }
            return last;
        }

        const seasonResults = buckets.map(({ season, matches: seasonMatches }) => {
            const { standings } = aggregateStandings(seasonMatches, { threePointSystem: false, homeFilter: true, awayFilter: true });
            const lastByTeam = lastMatchPerTeam(seasonMatches);
            const standingsWithLastMatch = standings.map(row => {
                const lm = lastByTeam.get(row.team);
                return {
                    ...row,
                    lastMatch: lm ? {
                        date: lm.date, homeTeam: lm.homeTeam, awayTeam: lm.awayTeam,
                        homeGoals: lm.homeGoals, awayGoals: lm.awayGoals,
                        competitionPhase: lm.competitionPhase, additionalInfo: lm.additionalInfo,
                    } : null,
                };
            });
            return { season, matchCount: seasonMatches.length, standings: standingsWithLastMatch };
        });

        return { div, seasons: seasonResults };
    });

    return jsonResponse(responseBody);
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        try {
            if (url.pathname === '/api/team-history') {
                return await handleTeamHistory(url, env);
            }

            if (url.pathname === '/api/head-to-head') {
                return await handleHeadToHead(url, env);
            }

            if (url.pathname === '/api/standings') {
                return await handleStandings(url, env);
            }

            if (url.pathname === '/api/season-matches') {
                return await handleSeasonMatches(url, env);
            }

            if (url.pathname === '/api/season-standings' && request.method === 'POST') {
                return await handleSeasonStandings(request, env);
            }

            return jsonResponse({ error: 'not found' }, 404);
        } catch (err) {
            return jsonResponse({ error: 'internal error', message: err.message, stack: err.stack }, 500);
        }
    },
};
