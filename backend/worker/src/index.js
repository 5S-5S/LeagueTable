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

            return jsonResponse({ error: 'not found' }, 404);
        } catch (err) {
            return jsonResponse({ error: 'internal error', message: err.message, stack: err.stack }, 500);
        }
    },
};
