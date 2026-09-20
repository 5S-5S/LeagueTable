// LeagueTable API - Cloudflare Worker
//
// Endpoints so far: single-team match history, head-to-head. Everything
// else (standings, Team Seasons filters, etc.) stays on the gist-based
// path in the frontend until each has its own endpoint here.
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
// GET /api/standings?div=E0&dateFrom=&dateTo=&dayOfWeek=&threePointSystem=&homeFilter=&awayFilter=
//   -> { div, matchDateRange: {start, end} | null, standings: [{ team, played, won, drawn, lost, goalsFor, goalsAgainst, points }, ...] }
//   Domestic only for now - Continental's table has season-specific
//   competition-phase grouping the frontend still computes itself. Points
//   are raw/undeducted - point deductions stay a client-side correction
//   (the table is hardcoded in the frontend, not duplicated here; see
//   backend/README.md's Data integrity section).

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

async function handleTeamHistory(url, env) {
    const div = url.searchParams.get('div');
    const team = url.searchParams.get('team');

    if (!div || !team) {
        return jsonResponse({ error: 'div and team query params are required' }, 400);
    }

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

    return jsonResponse({ team, div, matches });
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

    return jsonResponse({ team1, team2: opponents, div, matches });
}

// Historical point-system rule: 3 points for a win unless threePointSystem
// is false AND the match falls in one of these leagues' pre-3-point eras.
// Ligue 1's 1988-89 season used 3 points even though the surrounding years
// used 2 - that's the one carve-out. Mirrors winPointsFor() in
// backend/migration/standings-aggregate.mjs and calculateTable() in
// DomesticEurope.html exactly - keep all three in sync if this changes.
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
    return 3;
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

    let sql = `SELECT div, date, home_team, away_team, home_goals, away_goals FROM matches WHERE div = ?1`;
    const params = [div];
    if (dateFrom) { params.push(dateFrom); sql += ` AND date >= ?${params.length}`; }
    if (dateTo) { params.push(dateTo); sql += ` AND date <= ?${params.length}`; }
    if (dayOfWeek !== null) { params.push(dayOfWeek); sql += ` AND CAST(strftime('%w', date) AS INTEGER) = ?${params.length}`; }

    const { results } = await env.DB.prepare(sql).bind(...params).all();

    const matches = results.map(row => ({
        div: row.div, date: row.date, homeTeam: row.home_team, awayTeam: row.away_team,
        homeGoals: row.home_goals, awayGoals: row.away_goals,
    }));

    const { matchDateRange, standings } = aggregateStandings(matches, { threePointSystem, homeFilter, awayFilter });

    return jsonResponse({ div, matchDateRange, standings });
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

            return jsonResponse({ error: 'not found' }, 404);
        } catch (err) {
            return jsonResponse({ error: 'internal error', message: err.message, stack: err.stack }, 500);
        }
    },
};
