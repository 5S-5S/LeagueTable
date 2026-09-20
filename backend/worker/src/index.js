// LeagueTable API - Cloudflare Worker
//
// First endpoint only: single-team match history. Everything else
// (head-to-head, standings, Team Seasons filters, etc.) stays on the
// gist-based path in the frontend until each has its own endpoint here.
//
// GET /api/team-history?div=E0&team=Arsenal%20FC
//   -> { team, div, matches: [{ date, homeTeam, awayTeam, homeGoals, awayGoals, competitionPhase, isQualifier, additionalInfo }, ...] }

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

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);

        if (url.pathname === '/api/team-history') {
            return handleTeamHistory(url, env);
        }

        return jsonResponse({ error: 'not found' }, 404);
    },
};
