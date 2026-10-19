// Snapped streaks: every statistically significant streak that ended in a
// date window, for the home page's "Streaks snapped" card (snapped.js) -
// and the ones still going that an upcoming fixture puts on the line.
// Pure - takes each division's matches (and the fixtures), returns the
// lists - so it can be run against any data (snapped-streaks.mjs reads the
// live API).
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
//
// A club record is one as of the day it snapped. If the club has had a
// longer run of that kind since (snapped or still going), the streak
// carries it as recordNow ({ count, start, end - null while going }), so
// an old record says it was one then ("Club record then · now 13").
//
// Streaks on the line (the card's other view): runs still going after a
// club's latest match that one of its upcoming fixtures could extend or
// end - a home run only by a home fixture, a head-to-head run only by a
// fixture against that opponent, and only the next such fixture. They're
// judged by the same bars as if they ended at that fixture. Also listed: a
// run level with the club's record for its kind, if one more would pass
// the league-wide bars as a new club record ("near-record"). Scoring and
// conceding runs (SCORE_TYPES) have a higher bar on the line - long ones
// are common, and "conceded in 14 in a row" is less of a reason to watch:
// only a club record or the league's top 0.5%, never "rare for the club"
// or near-record (picked on 2026-10-12; they were two thirds of the list).
//
// Champions League stages (STAGES, added 2026-10-19): the same runs again
// within one stage - the group / league stage, the knock-out stage, and
// each single knockout round (Final, Semi-Finals, Quarter-Finals, Round of
// 16) - the Team Streaks tab's Competition Stage options. Each stage is
// judged against the runs in that stage only, and listed with a `stage`
// key; one entry per club per match still, across all of them. Qualifiers
// get none. A single round is a few games a season, so its club runs have
// their own bar: 4+ games and the club's longest of its kind in that round
// for 10+ years ("Real Madrid have won their last 9 Finals"); no
// head-to-head runs there. Runs in a stage span seasons by nature, so they
// carry no gap notes.

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
const SCORE_TYPES = new Set(['scoring', 'goals-conceded']);

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

// Champions League stages - the page's matchesStageCategory()
// (ContinentalEurope.html) for these options; qualifying rounds never fit
export const STAGES = {
    group: { single: false, fits: phase => /league phase|group|preliminary|intermediate/.test(phase) },
    knockout: { single: false, fits: phase => ['round of 16', 'quarter-finals', 'semi-finals', 'final', 'play-offs', '1. round', '2. round'].includes(phase) },
    // At a neutral ground: no home or away runs
    final: { single: true, neutral: true, fits: phase => phase === 'final' },
    semi: { single: true, fits: phase => phase === 'semi-finals' },
    quarter: { single: true, fits: phase => phase === 'quarter-finals' },
    r16: { single: true, fits: phase => phase === 'round of 16' },
};
const STAGE_DIVS = new Set(['C1']);

function inStage(competitionPhase, stage) {
    if (!competitionPhase || competitionPhase.startsWith('Qualification')) return false;
    return STAGES[stage].fits(competitionPhase.toLowerCase());
}

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
// snapped it. onOpen(type, firstIndex, count) - the run still going at the
// end of the list, if any, after that type's snapped runs.
function forEachRun(list, team, onRun, onOpen = null) {
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
        if (first >= 0 && onOpen) onOpen(type, first, list.length - first);
    }
}

function atLocation(list, team, loc) {
    if (loc === 'all') return list;
    return list.filter(m => (loc === 'home') === (m.homeTeam === team));
}

// Which bar a run passes (null: none) - see the top of the file. c needs
// kind, div, opp, type, count, pct and (club) longestSince, ownRuns,
// ownPct; end is the date it's judged on.
function sourceOf(c, end) {
    if (c.stage && STAGES[c.stage].single) {
        if (c.kind !== 'club') return null;
        const yearsSince = c.longestSince ? (new Date(end) - new Date(c.longestSince)) / YEAR_MS : Infinity;
        return c.count >= 4 && yearsSince >= 10 ? 'league' : null;
    }
    if (c.kind === 'club') {
        const yearsSince = c.longestSince ? (new Date(end) - new Date(c.longestSince)) / YEAR_MS : Infinity;
        if (c.pct >= 0.995 || (yearsSince >= 10 && c.pct >= 0.95 && c.count >= 6)) return 'league';
        if (c.ownRuns >= 40 && c.ownPct >= 0.98 && c.count >= 5) return 'club';
        return null;
    }
    if (c.pct >= 0.99 && c.count >= 6) return 'league';
    if (c.div !== 'C1' && BIG_CLUBS.has(c.opp) && RESULT_TYPES.has(c.type) && c.pct >= 0.97 && c.count >= 5) return 'big-opponent';
    return null;
}

// The club's past runs of one kind against a run of `count` judged on
// `end`: the latest at least as long, and where it falls among the ones
// that ended in the 20 years before
function clubHistory(past, count, end) {
    let longestSince = null;
    for (const r of past) if (r.count >= count && (!longestSince || r.end > longestSince)) longestSince = r.end;
    const twentyYearsBefore = `${Number(end.slice(0, 4)) - 20}${end.slice(4)}`;
    const own = past.filter(r => r.end >= twentyYearsBefore).map(r => r.count).sort((x, y) => x - y);
    return { longestSince, ownRuns: own.length, ownPct: own.length ? countBelow(own, count) / own.length : 0 };
}

// One per club per match, one per head-to-head meeting: a single
// knockout round's run first (a few a year, and the most telling - "won
// their last 9 Finals"), then the league-wide bars, then the rarest, then
// the longest. matchKey names the match (the date that snapped it, or the
// fixture on the line).
function bestPerMatch(picked, matchKey) {
    const best = new Map();
    const rank = s => (s.stage && STAGES[s.stage].single ? 2 : s.source === 'league' ? 1 : 0);
    for (const s of picked) {
        const key = s.kind === 'club'
            ? `club|${s.div}|${s.team}|${matchKey(s)}`
            : `h2h|${s.div}|${matchKey(s)}|${[s.team, s.opp].sort().join('|')}`;
        const b = best.get(key);
        if (!b || rank(s) > rank(b) || (rank(s) === rank(b) && (s.pct > b.pct || (s.pct === b.pct && s.count > b.count)))) best.set(key, s);
    }
    return [...best.values()];
}

// Breaks of more than a summer (or two, head-to-head home/away) between
// a run's matches
function gapsIn(s, matches) {
    if (s.stage) return [];
    const dates = matches.map(m => m.date);
    const limit = s.kind === 'club' ? GAP_DAYS.club : s.loc === 'all' ? GAP_DAYS.h2hAll : GAP_DAYS.h2hVenue;
    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
        if (daysBetween(dates[i - 1], dates[i]) > limit) gaps.push({ from: dates[i - 1], to: dates[i] });
    }
    return gaps;
}

// matchesByDiv: { E0: [{ date, homeTeam, awayTeam, homeGoals, awayGoals, competitionPhase }], ... }
// fixtures: upcoming matches ([{ matchId, div, utcDate, homeTeam, awayTeam,
// competitionPhase }], /api/upcoming's) - the ones already in the results
// are skipped, so a list a day old is fine.
// Returns { snapped: the significant runs snapped between from and to (ISO
// dates, inclusive), newest first; onTheLine: the significant runs still
// going that a fixture could end, soonest kickoff first }.
export function findStreaks(matchesByDiv, { from, to, fixtures = [] }) {
    const groups = new Map();   // `${kind}|${div}|${type}|${loc}` -> run lengths since 1995
    const candidates = [];      // runs that snapped inside the window
    const open = [];            // runs still going, with the fixture on the line
    const clubBest = new Map(); // `${div}|${team}|${loc}|${type}` -> the club's longest run of the kind, ever
    const noteBest = (key, count, start, end) => {
        const best = clubBest.get(key);
        if (!best || count > best.count) clubBest.set(key, { count, start, end });
    };

    const addToGroup = (key, count, endDate) => {
        if (endDate < ERA_START) return;
        let arr = groups.get(key);
        if (!arr) groups.set(key, arr = []);
        arr.push(count);
    };

    for (const [div, unsorted] of Object.entries(matchesByDiv)) {
        const sorted = [...unsorted].sort((a, b) => a.date.localeCompare(b.date));
        // The whole competition, then (the Champions League) each stage
        const scopes = [['', sorted], ...(STAGE_DIVS.has(div) ? Object.keys(STAGES).map(stage => [stage, sorted.filter(m => inStage(m.competitionPhase, stage))]) : [])];
        for (const [stage, matches] of scopes) {
            const g = stage ? `${div}:${stage}` : div; // the group key's competition part
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

            // This competition's fixtures not yet in the results (a result is
            // dated by local kickoff, so up to a day off the UTC date), soonest
            // first
            const played = new Set(matches.map(m => `${m.date}|${m.homeTeam}|${m.awayTeam}`));
            const dayAround = (iso, days) => {
                const d = new Date(`${iso}T12:00:00Z`);
                d.setUTCDate(d.getUTCDate() + days);
                return d.toISOString().slice(0, 10);
            };
            const upcoming = fixtures
                .filter(f => f.div === div && (!stage || inStage(f.competitionPhase, stage)))
                .filter(f => ![-1, 0, 1].some(days => played.has(`${dayAround(f.utcDate.slice(0, 10), days)}|${f.homeTeam}|${f.awayTeam}`)))
                .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
            // The next fixture that could end a run: the club's next one at
            // that location (against that opponent, head-to-head)
            const nextFixture = (team, opp, loc) => upcoming.find(f => {
                if (f.homeTeam !== team && f.awayTeam !== team) return false;
                if (opp && f.homeTeam !== opp && f.awayTeam !== opp) return false;
                return loc === 'all' || (loc === 'home') === (f.homeTeam === team);
            });

            // Club runs: also the club's own history of each kind, for "longest
            // since" and "unusual for the club"
            for (const [team, teamMatches] of byTeam) {
                for (const loc of stage && STAGES[stage].neutral ? ['all'] : LOCATIONS) {
                    const list = atLocation(teamMatches, team, loc);
                    const history = {}; // type -> [{ end, count }] in order
                    forEachRun(list, team, (type, first, count, endIndex) => {
                        const end = list[endIndex].date;
                        const start = list[first].date;
                        addToGroup(`club|${g}|${type}|${loc}`, count, end);
                        noteBest(`${g}|${team}|${loc}|${type}`, count, start, end);
                        const past = history[type] || (history[type] = []);
                        if (end >= from && end <= to) {
                            candidates.push({
                                kind: 'club', div, stage, team, opp: null, loc, type, count, start, end,
                                ...clubHistory(past, count, end),
                                list, first, endIndex,
                            });
                        }
                        past.push({ end, count });
                    }, (type, first, count) => {
                        noteBest(`${g}|${team}|${loc}|${type}`, count, list[first].date, null);
                        const fixture = nextFixture(team, null, loc);
                        if (!fixture) return;
                        const past = history[type] || [];
                        const on = fixture.utcDate.slice(0, 10);
                        const record = past.length ? Math.max(...past.map(r => r.count)) : null;
                        open.push({
                            kind: 'club', div, stage, team, opp: null, loc, type, count, start: list[first].date, on,
                            ...clubHistory(past, count, on), record,
                            // Level with the club record: one more is a new one
                            next: record === count ? clubHistory(past, count + 1, on) : null,
                            list, first, fixture,
                        });
                    });
                }
            }

            // Head-to-head runs: one club's games against one opponent (none
            // within a single round)
            if (stage && STAGES[stage].single) continue;
            for (const [pairKey, pairMatches] of byPair) {
                const [team, opp] = pairKey.split('\u0000');
                for (const loc of LOCATIONS) {
                    const list = atLocation(pairMatches, team, loc);
                    forEachRun(list, team, (type, first, count, endIndex) => {
                        const end = list[endIndex].date;
                        addToGroup(`h2h|${g}|${type}|${loc}`, count, end);
                        if (end >= from && end <= to) {
                            candidates.push({ kind: 'h2h', div, stage, team, opp, loc, type, count, start: list[first].date, end, list, first, endIndex });
                        }
                    }, (type, first, count) => {
                        const fixture = nextFixture(team, opp, loc);
                        if (!fixture) return;
                        open.push({ kind: 'h2h', div, stage, team, opp, loc, type, count, start: list[first].date, on: fixture.utcDate.slice(0, 10), list, first, fixture });
                    });
                }
            }
        }
    }

    for (const arr of groups.values()) arr.sort((x, y) => x - y);
    const pctOf = (c, count) => {
        const group = groups.get(`${c.kind}|${c.stage ? `${c.div}:${c.stage}` : c.div}|${c.type}|${c.loc}`) || [];
        return group.length ? countBelow(group, count) / group.length : 0;
    };

    const picked = [];
    for (const c of candidates) {
        c.pct = pctOf(c, c.count);
        const source = sourceOf(c, c.end);
        if (source) picked.push({ ...c, source });
    }

    // In a single round, a run that is also a winning (losing) run of the
    // same matches says so: "won their last 9 Finals", not "unbeaten in"
    const sameRun = s => `${s.kind}|${s.div}|${s.stage}|${s.team}|${s.opp}|${s.loc}|${s.start}|${s.count}`;
    const subsumed = list => {
        const strong = new Set(list.filter(s => s.stage && STAGES[s.stage].single && (s.type === 'winning' || s.type === 'losing'))
            .map(s => `${s.type}|${sameRun(s)}`));
        return list.filter(s => !(s.stage && STAGES[s.stage].single
            && ((s.type === 'unbeaten' && strong.has(`winning|${sameRun(s)}`)) || (s.type === 'winless' && strong.has(`losing|${sameRun(s)}`)))));
    };

    const pickedOpen = [];
    for (const c of open) {
        c.pct = pctOf(c, c.count);
        let source = sourceOf(c, c.on);
        if (!source && c.next && sourceOf({ ...c, ...c.next, count: c.count + 1, pct: pctOf(c, c.count + 1) }, c.on) === 'league') {
            source = 'near-record';
        }
        if (SCORE_TYPES.has(c.type) && !(source === 'league' && (c.pct >= 0.995 || (c.kind === 'club' && !c.longestSince)))) {
            source = null;
        }
        if (source) pickedOpen.push({ ...c, source });
    }

    const snapped = bestPerMatch(subsumed(picked), s => s.end)
        .sort((a, b) => b.end.localeCompare(a.end) || b.pct - a.pct)
        .map(s => {
            const ended = s.list[s.endIndex];
            // A record then, beaten since
            const best = s.kind === 'club' && !s.longestSince ? clubBest.get(`${s.stage ? `${s.div}:${s.stage}` : s.div}|${s.team}|${s.loc}|${s.type}`) : null;
            return {
                kind: s.kind, div: s.div, ...(s.stage ? { stage: s.stage } : {}), team: s.team, opp: s.opp, loc: s.loc, type: s.type,
                count: s.count, start: s.start, end: s.end,
                endedBy: {
                    date: ended.date, homeTeam: ended.homeTeam, awayTeam: ended.awayTeam,
                    homeGoals: ended.homeGoals, awayGoals: ended.awayGoals, competitionPhase: ended.competitionPhase || null,
                },
                pct: Math.round(s.pct * 10000) / 10000,
                longestSince: s.kind === 'club' ? s.longestSince : undefined,
                recordNow: best && best.count > s.count ? best : undefined,
                source: s.source,
                gaps: gapsIn(s, s.list.slice(s.first, s.endIndex + 1)),
            };
        });

    const onTheLine = bestPerMatch(subsumed(pickedOpen), s => s.fixture.matchId)
        .sort((a, b) => a.fixture.utcDate.localeCompare(b.fixture.utcDate) || b.pct - a.pct)
        .map(s => {
            const f = s.fixture;
            return {
                kind: s.kind, div: s.div, ...(s.stage ? { stage: s.stage } : {}), team: s.team, opp: s.opp, loc: s.loc, type: s.type,
                count: s.count, start: s.start, last: s.list[s.list.length - 1].date,
                fixture: {
                    matchId: f.matchId, utcDate: f.utcDate, homeTeam: f.homeTeam, awayTeam: f.awayTeam,
                    competitionPhase: f.competitionPhase || null,
                },
                pct: Math.round(s.pct * 10000) / 10000,
                longestSince: s.kind === 'club' ? s.longestSince : undefined,
                // The club's longest run of this kind before this one (null: none)
                record: s.kind === 'club' ? s.record : undefined,
                source: s.source,
                gaps: gapsIn(s, s.list.slice(s.first)),
            };
        });

    return { snapped, onTheLine };
}

export function findSnappedStreaks(matchesByDiv, { from, to }) {
    return findStreaks(matchesByDiv, { from, to }).snapped;
}
