// Snapped streaks: every statistically significant streak that ended in a
// date window, for the home page's "Streaks snapped" card (snapped.js).
// Pure - takes each division's matches, returns the list - so it can be
// run against any data (snapped-streaks.mjs reads the live API).
//
// A streak is the sport pages' own: one club's consecutive matches within
// one competition that fit a type (checkStreakContinuation() in
// DomesticEurope.html), over all its matches, home only or away only, or
// only those against one opponent (head-to-head). It "snaps" at the first
// match that doesn't fit, which is the date it's listed under.
//
// Significance (picked on 2026-10-09 by replaying three seasons week by
// week - about 6 a week across all six competitions). A streak is listed
// when any of these holds:
//   - Club, rare in the league: longer than 99.5% of the competition's
//     runs of the same type and location since 1995.
//   - Club, rare for its history: its longest of that kind in 10+ years
//     (or ever), in the league's top 5%, and 6+ games.
//   - Club, unusual for the club: in the top 2% of the club's own runs of
//     that kind that ended in the 20 years before (it needs 40+ of them),
//     and 5+ games. This is what lists a big club's slump (Liverpool's 6
//     without a win) that the league-wide bar never reaches.
//   - Head-to-head: in the league's top 1% of head-to-head runs of that
//     type and location, and 6+ games.
//   - Head-to-head against a big club (BIG_CLUBS, domestic only): result
//     runs (winning / unbeaten / winless / losing) in the top 3%, 5+ games
//     - "first win against Liverpool in 10".
// Each club appears once per match (its strongest run), and so does each
// head-to-head meeting.

export const STREAK_TYPES = {
    'winning': (result) => result === 'win',
    'unbeaten': (result) => result === 'win' || result === 'draw',
    'draw': (result) => result === 'draw',
    'winless': (result) => result === 'draw' || result === 'loss',
    'losing': (result) => result === 'loss',
    'clean-sheet': (result, teamScore, opponentScore) => opponentScore === 0,
    'goals-conceded': (result, teamScore, opponentScore) => opponentScore >= 1,
    'scoring': (result, teamScore) => teamScore >= 1,
    'no-score': (result, teamScore) => teamScore === 0,
};

const LOCATIONS = ['all', 'home', 'away'];
const RESULT_TYPES = new Set(['winning', 'unbeaten', 'winless', 'losing']);

// Clubs whose head-to-head result runs get the looser bar: a run against
// them is news because of who they are. Names as the data spells them.
// Check once a season (a club out of the league just doesn't show up).
export const BIG_CLUBS = new Set([
    'Arsenal FC', 'Chelsea FC', 'Liverpool FC', 'Manchester City', 'Manchester United', 'Tottenham Hotspur', 'Newcastle United', 'Aston Villa',
    'FC Barcelona', 'Atlético Madrid', 'Real Madrid', 'Athletic Club', 'Valencia CF', 'Sevilla FC', 'Real Sociedad', 'Real Betis',
    'Juventus', 'Inter', 'AC Milan', 'AS Roma', 'SSC Napoli', 'Lazio Roma', 'Atalanta',
    'Bayern München', 'Borussia Dortmund', 'FC Schalke 04', '1. FC Köln', 'Eintracht Frankfurt', 'Hamburger SV', 'VfB Stuttgart', 'Bor. Mönchengladbach',
    'Olympique Marseille', 'AS Monaco', 'Olympique Lyonnais', 'Lille OSC', 'Paris Saint-Germain',
]);

const ERA_START = '1995-08-01';
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * DAY_MS;

// Breaks inside a run that get a note on the card ("Includes 2001-2025
// outside the Premier League"): longer than a summer for a club, or for a
// head-to-head home/away run (one meeting a season) longer than two years
const GAP_DAYS = { club: 400, h2hAll: 400, h2hVenue: 800 };

function daysBetween(a, b) {
    return (new Date(b) - new Date(a)) / DAY_MS;
}

function countBelow(sorted, value) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < value) lo = mid + 1; else hi = mid;
    }
    return lo;
}

// Every run in one list of a club's matches (oldest first), for every type.
// onRun(type, firstIndex, count, endIndex) - endIndex is the match that
// snapped it; runs still going at the end of the list are not reported.
function forEachSnappedRun(list, team, onRun) {
    for (const [type, fits] of Object.entries(STREAK_TYPES)) {
        let first = -1;
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            const isHome = m.homeTeam === team;
            const teamScore = isHome ? m.homeGoals : m.awayGoals;
            const opponentScore = isHome ? m.awayGoals : m.homeGoals;
            const result = teamScore > opponentScore ? 'win' : teamScore === opponentScore ? 'draw' : 'loss';
            if (fits(result, teamScore, opponentScore)) {
                if (first < 0) first = i;
                continue;
            }
            if (first >= 0) onRun(type, first, i - first, i);
            first = -1;
        }
    }
}

function atLocation(list, team, loc) {
    if (loc === 'all') return list;
    return list.filter(m => (loc === 'home') === (m.homeTeam === team));
}

// matchesByDiv: { E0: [{ date, homeTeam, awayTeam, homeGoals, awayGoals, competitionPhase }], ... }
// Returns the significant runs snapped between from and to (ISO dates,
// inclusive), newest first.
export function findSnappedStreaks(matchesByDiv, { from, to }) {
    const groups = new Map();   // `${kind}|${div}|${type}|${loc}` -> run lengths since 1995
    const candidates = [];      // runs that snapped inside the window

    const addToGroup = (key, count, endDate) => {
        if (endDate < ERA_START) return;
        let arr = groups.get(key);
        if (!arr) groups.set(key, arr = []);
        arr.push(count);
    };

    for (const [div, unsorted] of Object.entries(matchesByDiv)) {
        const matches = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
        const byTeam = new Map();
        const byPair = new Map();
        for (const m of matches) {
            for (const [team, opp] of [[m.homeTeam, m.awayTeam], [m.awayTeam, m.homeTeam]]) {
                if (!byTeam.has(team)) byTeam.set(team, []);
                byTeam.get(team).push(m);
                const pairKey = `${team}\u0000${opp}`;
                if (!byPair.has(pairKey)) byPair.set(pairKey, []);
                byPair.get(pairKey).push(m);
            }
        }

        // Club runs: also the club's own history of each kind, for "longest
        // since" and "unusual for the club"
        for (const [team, teamMatches] of byTeam) {
            for (const loc of LOCATIONS) {
                const list = atLocation(teamMatches, team, loc);
                const history = {}; // type -> [{ end, count }] in order
                forEachSnappedRun(list, team, (type, first, count, endIndex) => {
                    const end = list[endIndex].date;
                    const start = list[first].date;
                    addToGroup(`club|${div}|${type}|${loc}`, count, end);
                    const past = history[type] || (history[type] = []);
                    if (end >= from && end <= to) {
                        let longestSince = null;
                        for (const r of past) if (r.count >= count && (!longestSince || r.end > longestSince)) longestSince = r.end;
                        const twentyYearsBefore = `${Number(end.slice(0, 4)) - 20}${end.slice(4)}`;
                        const own = past.filter(r => r.end >= twentyYearsBefore).map(r => r.count).sort((x, y) => x - y);
                        candidates.push({
                            kind: 'club', div, team, opp: null, loc, type, count, start, end,
                            longestSince, ownRuns: own.length, ownPct: own.length ? countBelow(own, count) / own.length : 0,
                            list, first, endIndex,
                        });
                    }
                    past.push({ end, count });
                });
            }
        }

        // Head-to-head runs: one club's games against one opponent
        for (const [pairKey, pairMatches] of byPair) {
            const [team, opp] = pairKey.split('\u0000');
            for (const loc of LOCATIONS) {
                const list = atLocation(pairMatches, team, loc);
                forEachSnappedRun(list, team, (type, first, count, endIndex) => {
                    const end = list[endIndex].date;
                    addToGroup(`h2h|${div}|${type}|${loc}`, count, end);
                    if (end >= from && end <= to) {
                        candidates.push({ kind: 'h2h', div, team, opp, loc, type, count, start: list[first].date, end, list, first, endIndex });
                    }
                });
            }
        }
    }

    for (const arr of groups.values()) arr.sort((x, y) => x - y);

    const picked = [];
    for (const c of candidates) {
        const group = groups.get(`${c.kind}|${c.div}|${c.type}|${c.loc}`) || [];
        c.pct = group.length ? countBelow(group, c.count) / group.length : 0;
        let source = null;
        if (c.kind === 'club') {
            const yearsSince = c.longestSince ? (new Date(c.end) - new Date(c.longestSince)) / YEAR_MS : Infinity;
            if (c.pct >= 0.995 || (yearsSince >= 10 && c.pct >= 0.95 && c.count >= 6)) source = 'league';
            else if (c.ownRuns >= 40 && c.ownPct >= 0.98 && c.count >= 5) source = 'club';
        } else if (c.pct >= 0.99 && c.count >= 6) {
            source = 'league';
        } else if (c.div !== 'C1' && BIG_CLUBS.has(c.opp) && RESULT_TYPES.has(c.type) && c.pct >= 0.97 && c.count >= 5) {
            source = 'big-opponent';
        }
        if (source) picked.push({ ...c, source });
    }

    // One per club per match, one per head-to-head meeting: the league-wide
    // bars first, then the rarest, then the longest
    const best = new Map();
    const rank = s => (s.source === 'league' ? 1 : 0);
    for (const s of picked) {
        const key = s.kind === 'club'
            ? `club|${s.div}|${s.team}|${s.end}`
            : `h2h|${s.div}|${s.end}|${[s.team, s.opp].sort().join('|')}`;
        const b = best.get(key);
        if (!b || rank(s) > rank(b) || (rank(s) === rank(b) && (s.pct > b.pct || (s.pct === b.pct && s.count > b.count)))) best.set(key, s);
    }

    return [...best.values()]
        .sort((a, b) => b.end.localeCompare(a.end) || b.pct - a.pct)
        .map(s => {
            const ended = s.list[s.endIndex];
            const dates = s.list.slice(s.first, s.endIndex + 1).map(m => m.date);
            const limit = s.kind === 'club' ? GAP_DAYS.club : s.loc === 'all' ? GAP_DAYS.h2hAll : GAP_DAYS.h2hVenue;
            const gaps = [];
            for (let i = 1; i < dates.length; i++) {
                if (daysBetween(dates[i - 1], dates[i]) > limit) gaps.push({ from: dates[i - 1], to: dates[i] });
            }
            return {
                kind: s.kind, div: s.div, team: s.team, opp: s.opp, loc: s.loc, type: s.type,
                count: s.count, start: s.start, end: s.end,
                endedBy: {
                    date: ended.date, homeTeam: ended.homeTeam, awayTeam: ended.awayTeam,
                    homeGoals: ended.homeGoals, awayGoals: ended.awayGoals, competitionPhase: ended.competitionPhase || null,
                },
                pct: Math.round(s.pct * 10000) / 10000,
                longestSince: s.kind === 'club' ? s.longestSince : undefined,
                source: s.source,
                gaps,
            };
        });
}
