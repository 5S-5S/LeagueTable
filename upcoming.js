// Upcoming matches on the home page (index.html): a strip of the next
// week's fixtures above the search bar - day tabs, a competition filter
// and one card per match (kick-off, both teams' league position and last-5
// form) - and, when a card is clicked, that one match's full view in place
// of the search card: this season's table, the head-to-head, each team's
// record this season and all-time, and every active streak between them
// and for each team on its own. The view's address is index.html?match=<id>,
// so the browser's back button and shared links work; the back arrow
// returns to the strip.
//
// Fixtures come from /api/upcoming (scripts/update_fixtures.py refreshes
// them daily from football-data.org). Everything else is worked out here
// from the same endpoints the sport pages use: this season's matches per
// competition (positions, form, the table), and for an opened match the
// head-to-head and both teams' histories. Streaks follow the Team Streaks
// tab's rules. Needs team-registry.js (crests and club colors).
(function () {
    'use strict';

    const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
    const STRIP_DAYS = 7;
    const MIN_STREAK = 3;

    // `slug` is the league key used by the team registry and the sport
    // pages' links; `page` is where the "full head-to-head" / "streaks"
    // links go
    const COMPETITIONS = {
        E0: { slug: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', page: 'DomesticEurope.html', inText: 'the Premier League' },
        SP1: { slug: 'la-liga', name: 'La Liga', flag: '🇪🇸', page: 'DomesticEurope.html', inText: 'La Liga' },
        I1: { slug: 'serie-a', name: 'Serie A', flag: '🇮🇹', page: 'DomesticEurope.html', inText: 'Serie A' },
        D1: { slug: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', page: 'DomesticEurope.html', inText: 'the Bundesliga' },
        F1: { slug: 'ligue-1', name: 'Ligue 1', flag: '🇫🇷', page: 'DomesticEurope.html', inText: 'Ligue 1' },
        C1: { slug: 'champions-league', name: 'Champions League', flag: '🇪🇺', page: 'ContinentalEurope.html', inText: 'the Champions League' }
    };
    const COMPETITION_ORDER = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];

    // A Premier League match's all-time numbers can cover the Premier League
    // era (the default, as in League Tables) or every English top-flight
    // season - the same two eras as the Domestic page
    const PREMIER_LEAGUE_ERA_START = new Date(1992, 7, 1);
    const ERA_LABELS = { pl: 'Premier League Era (1992-)', all: 'All English Seasons (1888-)' };

    const STREAK_TYPES = ['winning', 'unbeaten', 'draw', 'winless', 'losing', 'clean-sheet', 'goals-conceded', 'scoring', 'no-score'];
    // Head-to-head streaks are listed once, from the side that's doing
    // well: Arsenal "unbeaten in 6" vs Leeds is the same run as Leeds
    // "winless in 6" vs Arsenal, so only these four (plus draws, shared by
    // both) are checked for each team
    const H2H_STREAK_TYPES = ['winning', 'unbeaten', 'scoring', 'clean-sheet'];
    const STREAK_LABELS = {
        'winning': 'Winning', 'unbeaten': 'Unbeaten', 'draw': 'Draw', 'winless': 'Winless', 'losing': 'Losing',
        'clean-sheet': 'Clean Sheet', 'goals-conceded': 'Goals Conceded', 'scoring': 'Scoring', 'no-score': 'Failed to Score'
    };

    // Stat columns, as in the Team Streaks tab's historic table. That tab
    // shows one streak type at a time and only the stats that vary for it;
    // these tables mix types, so they show every column and leave a dash
    // where the Team Streaks tab would hide it.
    const STREAK_AGGREGATE_COLUMNS = {
        'winning': ['gf', 'ga', 'gd', 'cleanSheets'],
        'unbeaten': ['gf', 'ga', 'gd', 'cleanSheets', 'ppg'],
        'draw': ['gf', 'ga', 'cleanSheets'],
        'winless': ['gf', 'ga', 'gd', 'failedToScore', 'ppg'],
        'losing': ['gf', 'ga', 'gd', 'failedToScore'],
        'clean-sheet': ['gf', 'ppg'],
        'goals-conceded': ['gf', 'ga', 'gd', 'ppg'],
        'scoring': ['gf', 'ga', 'gd', 'ppg'],
        'no-score': ['ga', 'ppg']
    };
    const AGGREGATE_KEYS = ['gf', 'ga', 'gd', 'cleanSheets', 'failedToScore', 'ppg'];
    const AGGREGATE_LABELS = {
        gf: { label: 'GF', title: 'Goals For' },
        ga: { label: 'GA', title: 'Goals Against' },
        gd: { label: 'GD', title: 'Goal Difference' },
        cleanSheets: { label: 'Clean Sheets', title: 'Clean Sheets' },
        failedToScore: { label: 'Failed to Score', title: 'Failed to Score' },
        ppg: { label: 'PPG', title: 'Points Per Game' }
    };

    const state = {
        fixtures: [],          // from /api/upcoming
        loaded: false,
        filterDiv: 'all',
        day: null,             // the strip's day tab (local 'YYYY-M-D')
        seasonData: {},        // div -> { positions, points, form (Maps), matches (this season, newest first), table }, or 'error'
        h2h: {},               // match id -> match rows (newest first), 'loading' or 'error'
        teamHistory: {},       // `${div}::${team}` -> match rows (newest first), 'loading' or 'error'
        // The open match and its view's switches (reset for each match)
        match: null,
        allEnglishEra: false,
        fullTable: false,
        byLocation: false,
        openStreaks: new Set()
    };

    let els = {};

    // --- Data -----------------------------------------------------------

    const jsonCache = new Map();
    function fetchJson(url) {
        if (!jsonCache.has(url)) {
            jsonCache.set(url, fetch(url).then(res => {
                if (!res.ok) throw new Error(`${res.status} ${url}`);
                return res.json();
            }).catch(err => {
                jsonCache.delete(url);
                throw err;
            }));
        }
        return jsonCache.get(url);
    }

    // API rows -> the match shape the streak logic uses (as on the sport
    // pages), newest first
    function toMatchRows(apiMatches) {
        return apiMatches.map(m => {
            const [y, mo, d] = m.date.split('-').map(Number);
            return {
                dateObj: new Date(y, mo - 1, d),
                HomeTeam: m.homeTeam,
                AwayTeam: m.awayTeam,
                FTHG: m.homeGoals,
                FTAG: m.awayGoals,
                CompetitionPhase: m.competitionPhase,
                AdditionalInfo: m.additionalInfo
            };
        }).sort((a, b) => b.dateObj - a.dateObj);
    }

    // The season a date falls in (seasons run July-June), as API dates
    function seasonRange(date) {
        const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
        return { from: `${startYear}-07-01`, to: `${startYear + 1}-06-30` };
    }

    // Current league positions, the table and last-5 form for one
    // competition, from this season's matches. Champions League positions
    // and table use the league phase only, but form uses every CL match.
    const seasonLoads = {};
    function loadSeasonData(div) {
        if (!seasonLoads[div]) {
            seasonLoads[div] = (async () => {
                const { from, to } = seasonRange(new Date());
                try {
                    const data = await fetchJson(`${API_BASE}/api/season-matches?div=${div}&dateFrom=${from}&dateTo=${to}`);
                    state.seasonData[div] = buildSeasonData(div, toMatchRows(data.matches));
                } catch (err) {
                    console.error(`Season data failed for ${div}:`, err);
                    state.seasonData[div] = 'error';
                }
                renderAll();
            })();
        }
        return seasonLoads[div];
    }

    function buildSeasonData(div, matches) {
        const tableMatches = div === 'C1' ? matches.filter(m => m.CompetitionPhase === 'League Phase') : matches;
        const table = new Map();
        const row = team => {
            if (!table.has(team)) table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gf: 0, ga: 0 });
            return table.get(team);
        };
        tableMatches.forEach(m => {
            const home = row(m.HomeTeam), away = row(m.AwayTeam);
            home.gf += m.FTHG; home.ga += m.FTAG;
            away.gf += m.FTAG; away.ga += m.FTHG;
            home.played++; away.played++;
            if (m.FTHG > m.FTAG) { home.points += 3; home.won++; away.lost++; }
            else if (m.FTHG < m.FTAG) { away.points += 3; away.won++; home.lost++; }
            else { home.points += 1; away.points += 1; home.drawn++; away.drawn++; }
        });
        // Points, then goal difference, then goals scored - the same order
        // as the League Tables view (no deductions this season)
        const ranked = [...table.values()].sort((a, b) =>
            b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        const positions = new Map(ranked.map((r, i) => [r.team, i + 1]));
        const points = new Map(ranked.map(r => [r.team, r.points]));

        const form = new Map();
        matches.forEach(m => {
            [[m.HomeTeam, m.FTHG, m.FTAG, m.AwayTeam], [m.AwayTeam, m.FTAG, m.FTHG, m.HomeTeam]].forEach(([team, f, a, opp]) => {
                const list = form.get(team) || [];
                if (list.length < 5) list.push({ result: f > a ? 'W' : f === a ? 'D' : 'L', score: `${f}-${a}`, opponent: opp });
                form.set(team, list);
            });
        });
        return { positions, points, form, matches, table: ranked };
    }

    async function loadHeadToHead(fixture) {
        if (state.h2h[fixture.matchId]) return;
        state.h2h[fixture.matchId] = 'loading';
        try {
            const url = `${API_BASE}/api/head-to-head?div=${fixture.div}&team1=${encodeURIComponent(fixture.homeTeam)}&team2=${encodeURIComponent(fixture.awayTeam)}`;
            state.h2h[fixture.matchId] = toMatchRows((await fetchJson(url)).matches);
        } catch (err) {
            console.error('Head-to-head failed:', err);
            state.h2h[fixture.matchId] = 'error';
        }
        renderView();
    }

    async function loadTeamHistory(div, team) {
        const key = `${div}::${team}`;
        if (state.teamHistory[key]) return;
        state.teamHistory[key] = 'loading';
        try {
            const url = `${API_BASE}/api/team-history?div=${div}&team=${encodeURIComponent(team)}`;
            state.teamHistory[key] = toMatchRows((await fetchJson(url)).matches);
        } catch (err) {
            console.error('Team history failed:', err);
            state.teamHistory[key] = 'error';
        }
        renderView();
    }

    // --- Streaks (same rules as the Team Streaks tab) --------------------

    function checkStreakContinuation(result, streakType, teamScore, opponentScore) {
        switch (streakType) {
            case 'winning': return result === 'win';
            case 'unbeaten': return result === 'win' || result === 'draw';
            case 'draw': return result === 'draw';
            case 'winless': return result === 'draw' || result === 'loss';
            case 'losing': return result === 'loss';
            case 'clean-sheet': return opponentScore === 0;
            case 'goals-conceded': return opponentScore >= 1;
            case 'scoring': return teamScore >= 1;
            case 'no-score': return teamScore === 0;
            default: return false;
        }
    }

    // The active streak: from the most recent match back until one breaks
    // it. `matches` must be newest first.
    function calculateStreak(matches, team, streakType) {
        const streak = [];
        for (const match of matches) {
            const isHome = match.HomeTeam === team;
            const teamScore = isHome ? match.FTHG : match.FTAG;
            const opponentScore = isHome ? match.FTAG : match.FTHG;
            const result = teamScore > opponentScore ? 'win' : teamScore === opponentScore ? 'draw' : 'loss';
            if (!checkStreakContinuation(result, streakType, teamScore, opponentScore)) break;
            streak.push(match);
        }
        return streak;
    }

    function activeStreaks(matches, team, types) {
        return types
            .map(type => ({ type, team, matches: calculateStreak(matches, team, type) }))
            .filter(s => s.matches.length >= MIN_STREAK);
    }

    function headToHeadStreaks(fixture, matches) {
        return [
            ...activeStreaks(matches, fixture.homeTeam, H2H_STREAK_TYPES),
            ...activeStreaks(matches, fixture.awayTeam, H2H_STREAK_TYPES),
            // A draw run belongs to neither side - listed once
            ...activeStreaks(matches, fixture.homeTeam, ['draw']).map(s => ({ ...s, team: null }))
        ].sort((a, b) => b.matches.length - a.matches.length);
    }

    // Totals across a streak's matches from `team`'s side - same as the
    // Team Streaks tab (3 points a win, 1 a draw)
    function streakAggregates(matches, team) {
        let gf = 0, ga = 0, cleanSheets = 0, failedToScore = 0, points = 0;
        matches.forEach(m => {
            const f = m.HomeTeam === team ? m.FTHG : m.FTAG;
            const a = m.HomeTeam === team ? m.FTAG : m.FTHG;
            gf += f; ga += a;
            if (a === 0) cleanSheets++;
            if (f === 0) failedToScore++;
            points += f > a ? 3 : f === a ? 1 : 0;
        });
        return { gf, ga, gd: gf - ga, cleanSheets, failedToScore, ppg: points / matches.length };
    }

    function formatAggregate(key, value) {
        if (key === 'gd') return value > 0 ? `+${value}` : `${value}`;
        if (key === 'ppg') return value.toFixed(2);
        return `${value}`;
    }

    // --- Small helpers ----------------------------------------------------

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function slugOf(div) {
        return COMPETITIONS[div].slug;
    }

    function logoImg(team, div) {
        const url = getTeamLogoUrl(team, slugOf(div));
        return url ? `<img src="${url}" alt="" onerror="this.style.display='none'">` : '';
    }

    function teamName(team, div, extraClass = '') {
        const color = getTeamColor(team, slugOf(div));
        const style = color ? `color: ${pickTeamTextColor(color, '')};` : '';
        return `<span class="um-team-name ${extraClass}" style="${style}">${escapeHtml(team)}</span>`;
    }

    function dayKey(date) {
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    function kickoffTime(fixture) {
        return new Date(fixture.utcDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    function longDay(date) {
        return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // "Today", "Tomorrow", else "Sat 10"
    function dayLabel(date) {
        const today = new Date();
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        if (dayKey(date) === dayKey(today)) return 'Today';
        if (dayKey(date) === dayKey(tomorrow)) return 'Tomorrow';
        return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${date.getDate()}`;
    }

    function formDots(fixture, team) {
        const data = state.seasonData[fixture.div];
        const form = (data && data !== 'error' && data.form.get(team)) || [];
        // Oldest on the left, most recent on the right
        return `<span class="um-form">${[...form].reverse().map(f =>
            `<span class="um-form-dot ${f.result}" title="${f.result} ${f.score} vs ${escapeHtml(f.opponent)}">${f.result}</span>`
        ).join('')}</span>`;
    }

    function positionText(fixture, team) {
        const data = state.seasonData[fixture.div];
        if (!data || data === 'error') return '';
        const pos = data.positions.get(team);
        if (!pos) return '';
        const pts = data.points.get(team);
        const where = fixture.div === 'C1' ? 'in the league phase' : `in ${COMPETITIONS[fixture.div].inText}`;
        return `<span class="um-position" title="${ordinal(pos)} ${where}, ${pts} point${pts === 1 ? '' : 's'}">${ordinal(pos)} · ${pts} pts</span>`;
    }

    // Matchday or Champions League stage
    function roundText(fixture) {
        if (fixture.div === 'C1') return fixture.competitionPhase || '';
        return fixture.matchday ? `Matchday ${fixture.matchday}` : '';
    }

    // --- The strip --------------------------------------------------------

    function upcomingFixtures() {
        const now = Date.now();
        return state.fixtures
            .filter(f => new Date(f.utcDate).getTime() > now)
            .filter(f => state.filterDiv === 'all' || f.div === state.filterDiv)
            .sort((a, b) => a.utcDate.localeCompare(b.utcDate) || COMPETITION_ORDER.indexOf(a.div) - COMPETITION_ORDER.indexOf(b.div));
    }

    // The days the strip offers: every day in the next STRIP_DAYS with a
    // match. With none (an international break), the first day there is
    // one, flagged so the strip can say how long the wait is.
    function stripDays(fixtures) {
        const today = new Date();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + STRIP_DAYS);
        const days = new Map();
        fixtures.forEach(f => {
            const date = new Date(f.utcDate);
            const key = dayKey(date);
            if (!days.has(key)) days.set(key, { key, date, fixtures: [] });
            days.get(key).fixtures.push(f);
        });
        const all = [...days.values()];
        const soon = all.filter(d => d.date < end);
        if (soon.length) return { days: soon, waiting: false };
        return { days: all.slice(0, 1), waiting: all.length > 0 };
    }

    function cardHtml(fixture) {
        const comp = COMPETITIONS[fixture.div];
        // Crest, the name with its league position underneath, form dots
        const teamLine = team => `
            <span class="um-team">
                ${logoImg(team, fixture.div)}
                <span class="um-team-text">
                    ${teamName(team, fixture.div)}
                    ${positionText(fixture, team)}
                </span>
            </span>
            ${formDots(fixture, team)}`;
        return `
            <button type="button" class="um-card" data-match="${fixture.matchId}" aria-label="${escapeHtml(`${fixture.homeTeam} vs ${fixture.awayTeam}, ${kickoffTime(fixture)}`)}">
                <span class="um-card-top">
                    <span class="um-card-comp">${comp.flag} ${escapeHtml(comp.name)}</span>
                    <span class="um-kickoff">${escapeHtml(kickoffTime(fixture))}</span>
                </span>
                <span class="um-card-teams">
                    ${teamLine(fixture.homeTeam)}
                    ${teamLine(fixture.awayTeam)}
                </span>
            </button>`;
    }

    function renderStrip() {
        if (!els.strip) return;
        if (!state.loaded || !state.fixtures.length) {
            els.strip.hidden = true;
            return;
        }
        const fixtures = upcomingFixtures();
        const { days, waiting } = stripDays(fixtures);
        if (!days.some(d => d.key === state.day)) state.day = days.length ? days[0].key : null;
        const day = days.find(d => d.key === state.day);

        // Positions and form for the competitions on show
        if (day) [...new Set(day.fixtures.map(f => f.div))].forEach(loadSeasonData);

        const chips = [['all', 'All'], ...COMPETITION_ORDER.map(div => [div, `${COMPETITIONS[div].flag} ${COMPETITIONS[div].name}`])];
        const status = !day
            ? `No upcoming ${state.filterDiv === 'all' ? '' : COMPETITIONS[state.filterDiv].name + ' '}matches right now.`
            : waiting
                ? `No matches until ${longDay(day.date)}.`
                : `${day.fixtures.length} match${day.fixtures.length === 1 ? '' : 'es'} ${dayLabel(day.date) === 'Today' ? 'today' : dayLabel(day.date) === 'Tomorrow' ? 'tomorrow' : `on ${longDay(day.date)}`}. Times are in your local timezone.`;

        const scrollLeft = els.strip.querySelector('.um-row')?.scrollLeft || 0;
        els.strip.hidden = false;
        els.strip.innerHTML = `
            <div class="um-strip-head">
                <h2 class="um-strip-title">Upcoming matches</h2>
                <div class="um-filters" role="group" aria-label="Competition">${chips.map(([div, label]) =>
                    `<button type="button" class="um-chip${state.filterDiv === div ? ' active' : ''}" data-div="${div}">${label}</button>`
                ).join('')}</div>
            </div>
            ${days.length > 1 || waiting ? `<div class="um-days" role="tablist">${days.map(d =>
                `<button type="button" role="tab" class="um-day-tab${d.key === state.day ? ' active' : ''}" aria-selected="${d.key === state.day}" data-day="${d.key}">${escapeHtml(waiting ? longDay(d.date) : dayLabel(d.date))}</button>`
            ).join('')}</div>` : ''}
            <p class="um-status">${escapeHtml(status)}</p>
            ${day ? `<div class="um-row">${day.fixtures.map(cardHtml).join('')}</div>` : ''}`;
        const row = els.strip.querySelector('.um-row');
        if (row) row.scrollLeft = scrollLeft;
    }

    // --- One match's view -------------------------------------------------

    function eraOf(fixture) {
        if (fixture.div !== 'E0') return null;
        return state.allEnglishEra ? 'all' : 'pl';
    }

    function inEra(fixture, matches) {
        return eraOf(fixture) === 'pl' ? matches.filter(m => m.dateObj >= PREMIER_LEAGUE_ERA_START) : matches;
    }

    function chipGroup(name, options, current) {
        return `<div class="um-filters um-era">${options.map(([value, label]) =>
            `<button type="button" class="um-chip${value === current ? ' active' : ''}" data-${name}="${value}">${escapeHtml(label)}</button>`
        ).join('')}</div>`;
    }

    // This season's table: just the two teams' rows, or the full table with
    // the two teams in bold (their club colors). Same columns as the League
    // Tables tab; Champions League uses the league-phase table.
    function leagueTableSection(fixture) {
        const data = state.seasonData[fixture.div];
        if (!data) return '<p class="um-none">Loading the table...</p>';
        if (data === 'error') return '<p class="um-none">Couldn\'t load the table.</p>';
        const full = state.fullTable;
        const isFocus = team => team === fixture.homeTeam || team === fixture.awayTeam;
        const rows = data.table
            .map((row, i) => ({ ...row, position: i + 1 }))
            .filter(row => full || isFocus(row.team));
        const toggle = chipGroup('table-view', [['two', 'These two teams'], ['full', 'Full table']], full ? 'full' : 'two');
        if (!rows.length) return toggle + '<p class="um-none">No matches played yet this season.</p>';

        const body = rows.map((row, i) => {
            const focus = isFocus(row.team);
            const color = focus ? getTeamColor(row.team, slugOf(fixture.div)) : null;
            const nameStyle = focus ? `font-weight: 700; ${color ? `color: ${pickTeamTextColor(color, '')};` : ''}` : 'font-weight: 400;';
            const gd = row.gf - row.ga;
            const background = rows.length >= 3 && i % 2 === 1 ? 'bg-gray-50' : 'bg-white';
            return `
                <tr class="border-b ${background}${focus ? ' um-table-focus' : ''}">
                    <td class="text-center font-bold text-gray-600">${row.position}</td>
                    <td><div class="um-cell-team">${logoImg(row.team, fixture.div)}<span style="${nameStyle}">${escapeHtml(row.team)}</span></div></td>
                    <td class="text-center">${row.played}</td>
                    <td class="text-center">${row.won}</td>
                    <td class="text-center">${row.drawn}</td>
                    <td class="text-center">${row.lost}</td>
                    <td class="text-center">${row.gf}</td>
                    <td class="text-center">${row.ga}</td>
                    <td class="text-center"><span class="font-bold ${gd > 0 ? 'text-green-700' : gd < 0 ? 'text-red-600' : ''}">${gd > 0 ? '+' : ''}${gd}</span></td>
                    <td class="text-center"><span class="points-badge">${row.points}</span></td>
                </tr>`;
        }).join('');
        return `
            ${toggle}
            <div class="league-table um-streaks um-table">
                <table>
                    <thead><tr>
                        <th class="text-center">Pos</th>
                        <th style="text-align: left;">Team</th>
                        <th class="text-center">P</th>
                        <th class="text-center">W</th>
                        <th class="text-center">D</th>
                        <th class="text-center">L</th>
                        <th class="text-center">GF</th>
                        <th class="text-center">GA</th>
                        <th class="text-center">GD</th>
                        <th class="text-center">Pts</th>
                    </tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    function headToHeadBar(fixture, matches) {
        let homeWins = 0, draws = 0, awayWins = 0;
        matches.forEach(m => {
            const homeGoals = m.HomeTeam === fixture.homeTeam ? m.FTHG : m.FTAG;
            const awayGoals = m.HomeTeam === fixture.homeTeam ? m.FTAG : m.FTHG;
            if (homeGoals > awayGoals) homeWins++;
            else if (homeGoals < awayGoals) awayWins++;
            else draws++;
        });
        const total = matches.length;
        const segment = (count, team, extraClass = '') => {
            if (!count) return '';
            const color = team ? getTeamColor(team, slugOf(fixture.div)) : null;
            const style = color ? `background: ${color}; color: ${getContrastColor(color)};` : (team ? 'background: #374151; color: white;' : '');
            return `<div class="h2h-segment ${extraClass}" style="width: ${count / total * 100}%; ${style}" title="${team ? escapeHtml(team) + ' wins' : 'Draws'}: ${count}">${count}</div>`;
        };
        return `
            <div class="h2h-viz-bar">
                ${segment(homeWins, fixture.homeTeam)}${segment(draws, null, 'h2h-draws')}${segment(awayWins, fixture.awayTeam)}
            </div>
            <div class="um-h2h-note">
                ${total} meeting${total === 1 ? '' : 's'}: ${escapeHtml(fixture.homeTeam)} ${homeWins} · Draws ${draws} · ${escapeHtml(fixture.awayTeam)} ${awayWins}
            </div>`;
    }

    // All-time head-to-head, then just the meetings the same way round as
    // this match (home team at home, away team away)
    function headToHeadBars(fixture) {
        let matches = state.h2h[fixture.matchId];
        if (!matches || matches === 'loading') return '<p class="um-none">Loading the head-to-head...</p>';
        if (matches === 'error') return '<p class="um-none">Couldn\'t load the head-to-head.</p>';
        if (matches.length === 0) return `<p class="um-none">First meeting in ${COMPETITIONS[fixture.div].inText}.</p>`;
        matches = inEra(fixture, matches);
        if (matches.length === 0) return '<p class="um-none">No meetings in the Premier League era.</p>';
        const sameWayRound = matches.filter(m => m.HomeTeam === fixture.homeTeam);
        return `
            <div>
                <div class="um-bar-label">All meetings</div>
                ${headToHeadBar(fixture, matches)}
            </div>
            <div>
                <div class="um-bar-label">${escapeHtml(fixture.homeTeam)} (Home) vs ${escapeHtml(fixture.awayTeam)} (Away)</div>
                ${sameWayRound.length ? headToHeadBar(fixture, sameWayRound) : `<p class="um-none">${escapeHtml(fixture.homeTeam)} haven't hosted ${escapeHtml(fixture.awayTeam)} in ${COMPETITIONS[fixture.div].inText} before.</p>`}
            </div>`;
    }

    // One team's record over `history` (all-time or this season), overall
    // and on the side of this match they're on (home or away) - the same
    // bars as Match History's Team Record
    function teamRecordBars(fixture, team, side, history) {
        if (!history || history === 'loading') return '<p class="um-none">Loading the record...</p>';
        if (history === 'error') return '<p class="um-none">Couldn\'t load this record.</p>';
        history = history.filter(m => m.HomeTeam === team || m.AwayTeam === team);
        if (!history.length) return '<p class="um-none">No matches yet.</p>';

        const color = getTeamColor(team, slugOf(fixture.div));
        const winStyle = color ? `background: ${color} !important; color: ${getContrastColor(color)} !important;` : 'background: #059669 !important; color: white !important;';
        const bar = (label, matches) => {
            let wins = 0, draws = 0, losses = 0;
            matches.forEach(m => {
                const f = m.HomeTeam === team ? m.FTHG : m.FTAG;
                const a = m.HomeTeam === team ? m.FTAG : m.FTHG;
                if (f > a) wins++; else if (f < a) losses++; else draws++;
            });
            const total = matches.length;
            if (!total) return '';
            return `
                <div class="um-record">
                    <div class="um-record-head">
                        <span class="um-bar-label">${escapeHtml(label)}</span>
                        <span class="um-record-numbers">${wins}W - ${draws}D - ${losses}L</span>
                    </div>
                    <div class="h2h-viz-bar">
                        <div class="h2h-segment h2h-wins" style="width: ${wins / total * 100}%; ${winStyle}">${wins || ''}</div>
                        <div class="h2h-segment h2h-draws" style="width: ${draws / total * 100}%;">${draws || ''}</div>
                        <div class="h2h-segment h2h-losses" style="width: ${losses / total * 100}%;">${losses || ''}</div>
                    </div>
                </div>`;
        };
        const sideMatches = history.filter(m => (side === 'home' ? m.HomeTeam : m.AwayTeam) === team);
        return bar(`${team} - Overall Record`, history) + bar(`${team} (${side === 'home' ? 'Home' : 'Away'})`, sideMatches);
    }

    // A streak's matches, in the Match History format the Team Streaks
    // tab's chevron lists use: separate score columns (winner's score green,
    // loser's red, draws grey), the winner's name and crest in the Result
    // column, and the usual team1/team2 highlight pills
    function streakMatchesRow(streak, fixture, section, colspan) {
        const focus = streak.team || fixture.homeTeam;
        // Head-to-head lists highlight both sides, as the Team Streaks tab
        // does with two teams picked; team lists just the one team
        const opponent = section === 'h2h' ? (focus === fixture.homeTeam ? fixture.awayTeam : fixture.homeTeam) : null;
        const slug = slugOf(fixture.div);
        const isCL = fixture.div === 'C1';
        const teamSpan = (team, highlight) => {
            const color = getTeamColor(team, slug);
            const style = color ? `color: ${pickTeamTextColor(color, highlight)} !important; font-weight: bold;` : 'font-weight: bold;';
            return `<div class="um-cell-team um-cell-center">${logoImg(team, fixture.div)}<span class="${highlight}" style="${style}">${escapeHtml(team)}</span></div>`;
        };
        const rows = streak.matches.map((m, i) => {
            const winner = m.FTHG > m.FTAG ? m.HomeTeam : m.FTAG > m.FTHG ? m.AwayTeam : null;
            const [homeScoreClass, awayScoreClass] = !winner
                ? ['text-gray-400 font-bold draw-score', 'text-gray-400 font-bold draw-score']
                : winner === m.HomeTeam
                    ? ['font-bold win-score', 'text-red-600 font-bold']
                    : ['text-red-600 font-bold', 'font-bold win-score'];
            const highlight = team => team === focus ? 'team1-highlight' : team === opponent ? 'team2-highlight' : '';
            let result;
            if (winner) {
                const color = getTeamColor(winner, slug);
                const style = color ? `color: ${pickTeamTextColor(color, highlight(winner))} !important; font-weight: bold;` : 'color: #059669 !important; font-weight: bold;';
                result = `<div class="um-cell-team um-cell-center">${logoImg(winner, fixture.div)}<span class="${highlight(winner)}" style="${style}">${escapeHtml(winner)}</span></div>`;
            } else {
                result = '<span style="color: #9ca3af !important; font-weight: bold;">Draw</span>';
            }
            const background = streak.matches.length >= 3 && i % 2 === 1 ? 'bg-gray-50' : 'bg-white';
            return `
                <tr class="border-b ${background}">
                    <td class="text-center text-sm">${m.dateObj.toLocaleDateString()}</td>
                    ${isCL ? `<td class="text-center text-sm">${escapeHtml(m.CompetitionPhase || '')}</td>` : ''}
                    <td class="text-center">${teamSpan(m.HomeTeam, highlight(m.HomeTeam))}</td>
                    <td class="text-center text-lg ${homeScoreClass}">${m.FTHG}</td>
                    <td class="text-center">${teamSpan(m.AwayTeam, highlight(m.AwayTeam))}</td>
                    <td class="text-center text-lg ${awayScoreClass}">${m.FTAG}</td>
                    <td class="text-center">${result}</td>
                </tr>`;
        }).join('');
        return `
            <tr class="season-matches-row streak-matches-row">
                <td colspan="${colspan}">
                    <div class="league-table season-matches">
                        <table>
                            <thead><tr>
                                <th class="text-center">Date</th>
                                ${isCL ? '<th class="text-center">Stage</th>' : ''}
                                <th class="text-center">Home Team</th>
                                <th class="text-center">Home Score</th>
                                <th class="text-center">Away Team</th>
                                <th class="text-center">Away Score</th>
                                <th class="text-center">Result</th>
                            </tr></thead>
                            <tbody class="team1-selected">${rows}</tbody>
                        </table>
                    </div>
                </td>
            </tr>`;
    }

    function streakTable(fixture, section, streaks) {
        if (streaks === null) return '<p class="um-none">Loading streaks...</p>';
        if (streaks === 'error') return '<p class="um-none">Couldn\'t load these streaks.</p>';
        if (streaks.length === 0) return `<p class="um-none">No active streaks of ${MIN_STREAK}+ games.</p>`;
        const slug = slugOf(fixture.div);
        // Crest only (name on hover); the name itself if there's no crest
        const teamCell = team => {
            const url = getTeamLogoUrl(team, slug);
            const color = getTeamColor(team, slug);
            const style = color ? `color: ${pickTeamTextColor(color, '')};` : '';
            return `<td class="text-center um-logo-cell" title="${escapeHtml(team)}">${url
                ? `<img src="${url}" alt="${escapeHtml(team)}" onerror="this.replaceWith(Object.assign(document.createElement('span'), { textContent: this.alt, style: 'font-weight: bold' }))">`
                : `<span style="font-weight: bold; ${style}">${escapeHtml(team)}</span>`}</td>`;
        };
        // Head-to-head: Team 1 is the side on the streak (the home side for
        // a shared draw streak); team tables: just that team
        const teamColumns = section === 'h2h' ? 2 : 1;
        // chevron, Streak, team(s), Count, Start Date, stats, Length (Days)
        const colspan = 1 + 1 + teamColumns + 1 + 1 + AGGREGATE_KEYS.length + 1;
        // Length runs from the streak's first match to this match's (local)
        // date: how old the streak will be at kick-off. Both are local
        // midnights; round() absorbs a daylight-saving change.
        const kickoff = new Date(fixture.utcDate);
        const kickoffDay = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate());
        const rows = streaks.map(streak => {
            const key = `${section}|${streak.team || ''}|${streak.type}|${state.byLocation ? 'loc' : 'all'}`;
            const isOpen = state.openStreaks.has(key);
            const team1 = streak.team || (section === 'away' ? fixture.awayTeam : fixture.homeTeam);
            const team2 = team1 === fixture.homeTeam ? fixture.awayTeam : fixture.homeTeam;
            const start = streak.matches[streak.matches.length - 1].dateObj;
            const lengthInDays = Math.round((kickoffDay - start) / (1000 * 60 * 60 * 24));
            const stats = streakAggregates(streak.matches, team1);
            const shown = STREAK_AGGREGATE_COLUMNS[streak.type];
            return `
                <tr>
                    <td style="width: 2rem;"><button type="button" class="season-expand-btn${isOpen ? ' expanded' : ''}" data-streak="${escapeHtml(key)}" aria-expanded="${isOpen}" title="Show this streak's matches">▸</button></td>
                    <td class="text-center">${STREAK_LABELS[streak.type]}</td>
                    ${teamCell(team1)}
                    ${section === 'h2h' ? teamCell(team2) : ''}
                    <td class="text-center font-bold">${streak.matches.length}</td>
                    <td class="text-center">${start.toLocaleDateString()}</td>
                    ${AGGREGATE_KEYS.map(k => `<td class="text-center">${shown.includes(k) ? formatAggregate(k, stats[k]) : '–'}</td>`).join('')}
                    <td class="text-center">${lengthInDays}</td>
                </tr>
                ${isOpen ? streakMatchesRow(streak, fixture, section, colspan) : ''}`;
        }).join('');
        return `
            <div class="league-table um-streaks">
                <table>
                    <thead><tr>
                        <th></th>
                        <th class="text-center">Streak</th>
                        ${section === 'h2h' ? '<th class="text-center">Team 1</th><th class="text-center">Team 2</th>' : '<th class="text-center">Team</th>'}
                        <th class="text-center">Count</th>
                        <th class="text-center">Start Date</th>
                        ${AGGREGATE_KEYS.map(k => `<th class="text-center" title="${AGGREGATE_LABELS[k].title}">${AGGREGATE_LABELS[k].label}</th>`).join('')}
                        <th class="text-center" title="Days from the streak's first match to this match">Length (Days)</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // With the location switch on, the home team's streaks count only its
    // home matches and the away team's only its away matches
    function teamStreaksFor(fixture, team) {
        let history = state.teamHistory[`${fixture.div}::${team}`];
        if (!history || history === 'loading') return null;
        if (history === 'error') return 'error';
        if (state.byLocation) {
            history = history.filter(m => team === fixture.homeTeam ? m.HomeTeam === team : m.AwayTeam === team);
        }
        return activeStreaks(history, team, STREAK_TYPES).sort((a, b) => b.matches.length - a.matches.length);
    }

    // When this match was last refreshed from football-data.org, in the
    // visitor's own timezone
    function updatedText(fixture) {
        if (!fixture.fetchedAt) return '';
        const updated = new Date(fixture.fetchedAt).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
        });
        return `<span class="um-updated">Fixture updated ${escapeHtml(updated)}</span>`;
    }

    // "Full head-to-head" opens the head-to-head as a search answer - the
    // question a visitor would type ("Arsenal FC vs Leeds United"), in this
    // competition's dropdown - rather than the bare League Tables tab. A
    // Premier League match asks for the era the view is showing. Falls back
    // to the tab if the search finds nothing.
    function headToHeadHref(fixture) {
        const comp = COMPETITIONS[fixture.div];
        const tab = `${comp.page}?${new URLSearchParams({ lg: comp.slug, view: 'league-filters', t1: fixture.homeTeam, t2: fixture.awayTeam })}`;
        if (!window.LeagueSearch) return tab;
        const question = `${fixture.homeTeam} vs ${fixture.awayTeam}${eraOf(fixture) === 'pl' ? ' Premier League' : ''}`;
        const result = (LeagueSearch.searchFor(question, comp.slug).results || [])[0];
        if (!result || result.kind !== 'h2h') return tab;
        return `${result.href}&${new URLSearchParams({ search: result.kind, q: question, scope: comp.slug })}`;
    }

    function viewTeamBlock(fixture, team) {
        const url = getTeamLogoUrl(team, slugOf(fixture.div));
        return `
            <div class="um-view-team">
                ${url ? `<img src="${url}" alt="" class="um-view-crest" onerror="this.style.display='none'">` : ''}
                ${teamName(team, fixture.div, 'um-view-name')}
                ${positionText(fixture, team) || '<span class="um-position">&nbsp;</span>'}
                ${formDots(fixture, team)}
            </div>`;
    }

    function viewHtml(fixture) {
        const comp = COMPETITIONS[fixture.div];
        const h2h = state.h2h[fixture.matchId];
        const byLocation = state.byLocation;
        // Location view: only meetings the same way round as this match
        const h2hStreaks = !h2h || h2h === 'loading' ? null : h2h === 'error' ? 'error'
            : headToHeadStreaks(fixture, byLocation ? h2h.filter(m => m.HomeTeam === fixture.homeTeam) : h2h);
        const seasonData = state.seasonData[fixture.div];
        const season = !seasonData ? 'loading' : seasonData === 'error' ? 'error' : seasonData.matches;
        const allTime = team => {
            const history = state.teamHistory[`${fixture.div}::${team}`];
            return Array.isArray(history) ? inEra(fixture, history) : history;
        };
        const era = eraOf(fixture);
        const link = params => `${comp.page}?${new URLSearchParams({ lg: comp.slug, ...params })}`;
        const kickoff = new Date(fixture.utcDate);
        const round = roundText(fixture);
        return `
            <div class="um-view-bar">
                <button type="button" class="um-back" data-back aria-label="Back to the home page">← Back</button>
                ${updatedText(fixture)}
            </div>
            <div class="um-view-head">
                <div class="um-view-meta">${comp.flag} ${escapeHtml(comp.name)}${round ? ` · ${escapeHtml(round)}` : ''}</div>
                <div class="um-view-when">${escapeHtml(longDay(kickoff))} · ${escapeHtml(kickoffTime(fixture))}</div>
                <div class="um-view-teams">
                    ${viewTeamBlock(fixture, fixture.homeTeam)}
                    <span class="um-view-vs">vs</span>
                    ${viewTeamBlock(fixture, fixture.awayTeam)}
                </div>
            </div>

            <h3>${fixture.div === 'C1' ? 'League phase table' : `${escapeHtml(comp.name)} table`}</h3>
            ${leagueTableSection(fixture)}

            ${era ? chipGroup('era', [['pl', ERA_LABELS.pl], ['all', ERA_LABELS.all]], era) : ''}
            <h3>Head-to-head${era ? ` - ${ERA_LABELS[era]}` : ''}</h3>
            <div class="um-h2h">${headToHeadBars(fixture)}</div>

            <h3>This season in ${escapeHtml(comp.inText)}</h3>
            <div class="um-records">
                <div>${teamRecordBars(fixture, fixture.homeTeam, 'home', season)}</div>
                <div>${teamRecordBars(fixture, fixture.awayTeam, 'away', season)}</div>
            </div>

            <h3>All-time record ${era ? `- ${ERA_LABELS[era]}` : `in ${escapeHtml(comp.inText)}`}</h3>
            <div class="um-records">
                <div>${teamRecordBars(fixture, fixture.homeTeam, 'home', allTime(fixture.homeTeam))}</div>
                <div>${teamRecordBars(fixture, fixture.awayTeam, 'away', allTime(fixture.awayTeam))}</div>
            </div>

            ${chipGroup('location', [['all', 'Overall'], ['loc', 'Home / Away']], byLocation ? 'loc' : 'all')}
            <h3>Head-to-head streaks${byLocation ? ` - ${escapeHtml(fixture.homeTeam)} (Home) vs ${escapeHtml(fixture.awayTeam)} (Away)` : ''} (active, ${MIN_STREAK}+ games)</h3>
            ${streakTable(fixture, 'h2h', h2hStreaks)}
            <h3>${escapeHtml(fixture.homeTeam)}${byLocation ? ' (Home)' : ''}: active streaks (${MIN_STREAK}+ games)</h3>
            ${streakTable(fixture, 'home', teamStreaksFor(fixture, fixture.homeTeam))}
            <h3>${escapeHtml(fixture.awayTeam)}${byLocation ? ' (Away)' : ''}: active streaks (${MIN_STREAK}+ games)</h3>
            ${streakTable(fixture, 'away', teamStreaksFor(fixture, fixture.awayTeam))}

            <div class="um-links">
                <a href="${escapeHtml(headToHeadHref(fixture))}">Full head-to-head →</a>
                <a href="${escapeHtml(link({ view: 'team-streaks', t1: fixture.homeTeam }))}">${escapeHtml(fixture.homeTeam)} streaks →</a>
                <a href="${escapeHtml(link({ view: 'team-streaks', t1: fixture.awayTeam }))}">${escapeHtml(fixture.awayTeam)} streaks →</a>
            </div>`;
    }

    function renderView() {
        if (!els.view) return;
        const id = state.match;
        document.body.classList.toggle('um-viewing', id !== null);
        if (id === null) {
            els.view.hidden = true;
            els.view.innerHTML = '';
            document.title = els.homeTitle;
            return;
        }
        els.view.hidden = false;
        if (!state.loaded) {
            els.view.innerHTML = '<div class="um-view-bar"><button type="button" class="um-back" data-back>← Back</button></div><p class="um-none">Loading the match...</p>';
            return;
        }
        const fixture = state.fixtures.find(f => f.matchId === id);
        if (!fixture) {
            els.view.innerHTML = '<div class="um-view-bar"><button type="button" class="um-back" data-back>← Back</button></div><p class="um-none">This match isn\'t in the upcoming fixtures any more - it has probably been played. Its result will be on the League Tables tab after the next daily update.</p>';
            return;
        }
        document.title = `${fixture.homeTeam} vs ${fixture.awayTeam} - League Table Statistics`;
        loadSeasonData(fixture.div);
        loadHeadToHead(fixture);
        loadTeamHistory(fixture.div, fixture.homeTeam);
        loadTeamHistory(fixture.div, fixture.awayTeam);
        els.view.innerHTML = viewHtml(fixture);
    }

    function renderAll() {
        renderStrip();
        if (state.match !== null) renderView();
    }

    // --- Navigation -------------------------------------------------------

    function matchFromUrl() {
        const value = new URLSearchParams(window.location.search).get('match');
        return value && /^\d+$/.test(value) ? Number(value) : null;
    }

    let pushedView = false;

    function openMatch(id) {
        state.match = id;
        state.allEnglishEra = false;
        state.fullTable = false;
        state.byLocation = false;
        state.openStreaks = new Set();
        history.pushState({ match: id }, '', `${window.location.pathname}?match=${id}`);
        pushedView = true;
        renderView();
        window.scrollTo(0, 0);
    }

    function closeMatch() {
        // Back to the page the visitor came from when that was the strip;
        // straight to the home page from a shared match link
        if (pushedView) {
            history.back();
            return;
        }
        history.replaceState(null, '', window.location.pathname);
        state.match = null;
        renderView();
        renderStrip();
    }

    function handleStripClick(event) {
        const chip = event.target.closest('[data-div]');
        if (chip) {
            state.filterDiv = chip.dataset.div;
            state.day = null;
            renderStrip();
            return;
        }
        const tab = event.target.closest('[data-day]');
        if (tab) {
            state.day = tab.dataset.day;
            renderStrip();
            return;
        }
        const card = event.target.closest('[data-match]');
        if (card) openMatch(Number(card.dataset.match));
    }

    function handleViewClick(event) {
        if (event.target.closest('[data-back]')) { closeMatch(); return; }
        const pick = (name, apply) => {
            const button = event.target.closest(`[data-${name}]`);
            if (!button) return false;
            apply(button.getAttribute(`data-${name}`));
            renderView();
            return true;
        };
        if (pick('table-view', v => { state.fullTable = v === 'full'; })) return;
        if (pick('era', v => { state.allEnglishEra = v === 'all'; })) return;
        if (pick('location', v => { state.byLocation = v === 'loc'; })) return;
        pick('streak', key => { state.openStreaks.has(key) ? state.openStreaks.delete(key) : state.openStreaks.add(key); });
    }

    async function loadFixtures() {
        try {
            const data = await fetchJson(`${API_BASE}/api/upcoming`);
            state.fixtures = data.fixtures || [];
        } catch (err) {
            console.error('Upcoming fixtures failed:', err);
            state.fixtures = [];
        }
        state.loaded = true;
        renderAll();
    }

    // strip: where the strip goes; view: where one match's view goes (the
    // page hides its other content while body has class um-viewing)
    function mount({ strip, view }) {
        els = { strip, view, homeTitle: document.title };
        strip.hidden = true;
        view.hidden = true;
        strip.addEventListener('click', handleStripClick);
        view.addEventListener('click', handleViewClick);
        window.addEventListener('popstate', () => {
            state.match = matchFromUrl();
            pushedView = state.match !== null && pushedView;
            renderView();
            renderStrip();
        });
        // Team text colors depend on the theme
        new MutationObserver(renderAll).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        state.match = matchFromUrl();
        renderView();
        loadFixtures();
    }

    window.UpcomingMatches = { mount };
})();
