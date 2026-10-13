// Team overview on the home page (index.html?team=<club>&lg=<competition>):
// what the search's "<club>" result opens - a bit of everything about one
// club, each section ending in questions to ask next, which open their
// answers in search. Sections:
//   - This season: the club's next match as one of the upcoming strip's
//     cards (any competition, opening the match view), and five rows of
//     this season's table around it.
//   - Then, for its domestic league or the Champions League (one switch;
//     domestic first): the last five seasons, the all-time record (bars,
//     home and away, the Premier League's two eras), titles and finishes,
//     active streaks, and its biggest win, heaviest defeat and
//     highest-scoring match.
//   - A link to the old full-page Team Dashboard.
//
// Data: the same endpoints the sport pages use - the club's match history
// per competition, and every season's standings (season-standings, the
// same request Team Seasons makes), turned into finishes by the pages' own
// rules (season-rules-domestic.js / season-rules-continental.js). The
// card, this season's table and form, and the active streaks come from
// upcoming.js; the questions from search.js. Needs team-registry.js too.
(function () {
    'use strict';

    const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
    const DIVS = { 'premier-league': 'E0', 'la-liga': 'SP1', 'serie-a': 'I1', 'bundesliga': 'D1', 'ligue-1': 'F1', 'champions-league': 'C1' };
    const TABLE_ROWS = 5;
    const LAST_SEASONS = 5;
    const TITLE_YEARS = 8;
    const UPCOMING = 2;
    // The words the search reads as each streak type ("Arsenal FC scoring streak")
    const STREAK_WORDS = {
        'winning': 'winning', 'unbeaten': 'unbeaten', 'draw': 'draw', 'winless': 'winless', 'losing': 'losing',
        'clean-sheet': 'clean sheet', 'goals-conceded': 'conceding', 'scoring': 'scoring', 'no-score': 'failed to score'
    };

    const phoneQuery = window.matchMedia('(max-width: 640px)');
    const parts = () => window.UpcomingMatches.overview;

    const state = {
        team: '',
        lg: '',                 // the competition the search was in (this season's table)
        info: undefined,        // LeagueSearch.teamInfo(), null if no such club
        sides: [],              // ['domestic', 'continental'], those the club has
        side: 'domestic',
        era: 'pl',              // Premier League all-time record: 'pl' | 'all'
        upcoming: undefined,    // its next fixtures (up to UPCOMING), [] if none in the window
        history: {},            // div -> match rows (newest first) | 'loading' | 'error'
        seasons: {},            // div -> [season rows, newest first] | 'loading' | 'error'
        table: {},              // div -> upcoming.js season data | 'loading' | 'error'
        open: new Set()         // chevrons open: 'season|<div>|<season>', 'streak|<div>|<type>'
    };
    let els = null;

    // --- Helpers ----------------------------------------------------------

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    const comp = div => parts().competitions[div];
    const slugOf = div => comp(div).slug;
    const sideDiv = side => side === 'continental' ? 'C1' : (state.info && state.info.league ? DIVS[state.info.league] : null);
    const todayIso = () => new Date().toISOString().slice(0, 10);

    function currentSeasonKey() {
        const now = new Date();
        const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
    }

    function crest(team, div, size = '') {
        const url = getTeamLogoUrl(team, slugOf(div));
        return url ? `<img src="${url}" alt="" class="${size}" onerror="this.style.display='none'">` : '';
    }

    function teamName(team, div, bold = false) {
        const color = getTeamColor(team, slugOf(div));
        const style = `${color ? `color: ${pickTeamTextColor(color, '')};` : ''}${bold ? ' font-weight: 800;' : ''}`;
        return `<span class="to-team-name" style="${style}">${escapeHtml(team)}</span>`;
    }

    const longDate = date => date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    // Questions to ask next, as links to their answers - only the ones the
    // search answers. [question, competition key]
    function asks(questions) {
        const links = questions
            .filter(Boolean)
            .map(([question, scope]) => {
                const href = window.LeagueSearch && LeagueSearch.answerHref(question, scope);
                return href ? `<a class="to-ask" href="${escapeHtml(href)}">${escapeHtml(question)} →</a>` : '';
            })
            .join('');
        return links ? `<div class="to-asks">${links}</div>` : '';
    }

    // A row's chevron, and the match list it opens under the row
    function chevron(key, title) {
        const isOpen = state.open.has(key);
        return `<button type="button" class="season-expand-btn${isOpen ? ' expanded' : ''}" data-open="${escapeHtml(key)}" aria-expanded="${isOpen}" title="${escapeHtml(title)}">▸</button>`;
    }

    const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // A season's matches, oldest first: league dates, or for the Champions
    // League the qualifiers too (June to May, as its seasons count them)
    function seasonMatches(div, s) {
        const history = state.history[div];
        if (!Array.isArray(history)) return null;
        const startYear = Number(s.season.slice(0, 4));
        const [from, to] = div === 'C1' ? [`${startYear}-06-01`, `${startYear + 1}-05-31`] : [s.start, s.end];
        return history.filter(m => { const d = isoDate(m.dateObj); return d >= from && d <= to; }).reverse();
    }

    function matchListRow(matches, div, colspan) {
        if (!matches) return `<tr class="season-matches-row"><td colspan="${colspan}">${loading('the matches')}</td></tr>`;
        return parts().matchListRow(matches, state.team, div, colspan);
    }

    const loading = what => `<p class="um-none">Loading ${what}...</p>`;
    const failed = what => `<p class="um-none">Couldn't load ${what}.</p>`;

    // --- Data -------------------------------------------------------------

    async function postJson(url, body) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return res.json();
    }

    async function loadHistory(div) {
        if (state.history[div]) return;
        state.history[div] = 'loading';
        try {
            const res = await fetch(`${API_BASE}/api/team-history?div=${div}&team=${encodeURIComponent(state.team)}`);
            if (!res.ok) throw new Error(res.status);
            state.history[div] = parts().toMatchRows((await res.json()).matches || []);
        } catch (err) {
            console.error('Team overview history failed:', err);
            state.history[div] = 'error';
        }
        render();
    }

    // Every season's finish, the way Team Seasons works it out: the same
    // season-standings request, then the shared rules - deductions, the
    // tie-break sort and ranking overrides (domestic), or the stage from
    // the club's last match of the season (Champions League)
    async function loadSeasons(div) {
        if (state.seasons[div]) return;
        state.seasons[div] = 'loading';
        try {
            state.seasons[div] = div === 'C1' ? await continentalSeasons() : await domesticSeasons(div);
        } catch (err) {
            console.error('Team overview seasons failed:', err);
            state.seasons[div] = 'error';
        }
        render();
    }

    async function domesticSeasons(div) {
        const rules = window.DomesticSeasonRules;
        const league = state.info.league;
        const dates = rules.seasons[league];
        const keys = Object.keys(dates).sort().reverse();
        const data = await postJson(`${API_BASE}/api/season-standings`, {
            div, seasons: keys.map(season => ({ season, start: dates[season].start, end: dates[season].end }))
        });
        const today = todayIso();
        return data.seasons
            .filter(s => s.standings.some(row => row.team === state.team))
            .map(s => {
                const table = rules.seasonFinalTable(s, s.season, dates[s.season], league, div);
                const row = table.find(r => r.team === state.team);
                return {
                    season: s.season, start: dates[s.season].start, end: dates[s.season].end,
                    inProgress: dates[s.season].end >= today && dates[s.season].start <= today,
                    position: row.position, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
                    gf: row.goalsFor, ga: row.goalsAgainst, points: row.points,
                    stripped: rules.isStrippedChampion(state.team, div, s.season, row.position, true, true)
                };
            })
            .sort((a, b) => b.season.localeCompare(a.season));
    }

    async function continentalSeasons() {
        const rules = window.ContinentalSeasonRules;
        const dates = rules.seasons['champions-league'];
        const today = todayIso();
        const keys = Object.keys(dates).sort().reverse().filter(season => dates[season].start <= today);
        const data = await postJson(`${API_BASE}/api/season-standings`, {
            div: 'C1',
            seasons: keys.map(season => {
                const startYear = Number(season.slice(0, 4));
                return { season, start: dates[season].start, end: dates[season].end, qualifiersStart: `${startYear}-06-01`, qualifiersEnd: `${startYear + 1}-05-31` };
            }),
            excludeQualifiers: false,
            excludeMainStage: false
        });
        return data.seasons
            .map(s => ({ s, row: s.standings.find(r => r.team === state.team) }))
            .filter(({ row }) => row)
            .map(({ s, row }) => {
                const last = row.lastMatch;
                const [y, m, d] = last ? last.date.split('-').map(Number) : [];
                const stage = rules.calculateTournamentProgression(state.team, last ? [{
                    dateObj: new Date(y, m - 1, d), HomeTeam: last.homeTeam, AwayTeam: last.awayTeam,
                    FTHG: last.homeGoals, FTAG: last.awayGoals, CompetitionPhase: last.competitionPhase, AdditionalInfo: last.additionalInfo
                }] : []);
                let points = row.points;
                rules.pointDeductions.forEach(deduction => {
                    if (deduction.team === state.team && deduction.league === 'C1' &&
                        dates[s.season].start <= deduction.endDate && dates[s.season].end >= deduction.startDate) points -= deduction.points;
                });
                return {
                    season: s.season, start: dates[s.season].start, end: dates[s.season].end,
                    inProgress: dates[s.season].end >= today,
                    stage, stageRank: rules.getProgressionRank(stage),
                    played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
                    gf: row.goalsFor, ga: row.goalsAgainst, points
                };
            })
            .sort((a, b) => b.season.localeCompare(a.season));
    }

    async function loadThisSeason() {
        const lgDiv = DIVS[state.lg];
        try {
            const fixtures = await parts().fixtures();
            const now = Date.now();
            state.upcoming = fixtures
                .filter(f => new Date(f.utcDate).getTime() > now && (f.homeTeam === state.team || f.awayTeam === state.team))
                .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
                .slice(0, UPCOMING);
        } catch (err) {
            state.upcoming = [];
        }
        render();
        // Positions and form for the cards, and this season's table
        const divs = new Set([lgDiv, ...state.upcoming.map(f => f.div)]);
        await Promise.all([...divs].map(async div => {
            state.table[div] = 'loading';
            state.table[div] = await parts().seasonData(div);
        }));
        render();
    }

    // --- This season ----------------------------------------------------------

    // Five rows around the club (the top five if it's in the top three, the
    // bottom five near the bottom), it in bold
    function tableSlice(div) {
        const data = state.table[div];
        if (!data || data === 'loading') return loading('the table');
        if (data === 'error') return failed('the table');
        const all = data.table.map((row, i) => ({ ...row, position: i + 1 }));
        const index = all.findIndex(row => row.team === state.team);
        if (index < 0) return notThisSeason(div);
        const start = Math.max(0, Math.min(index - Math.floor(TABLE_ROWS / 2), all.length - TABLE_ROWS));
        const rows = all.slice(start, start + TABLE_ROWS);
        const phone = phoneQuery.matches;
        // The match view's table: same columns, the club in bold in its colour
        const body = rows.map((row, i) => {
            const focus = row.team === state.team;
            const color = focus ? getTeamColor(row.team, slugOf(div)) : null;
            const nameStyle = focus ? `font-weight: 700; ${color ? `color: ${pickTeamTextColor(color, '')};` : ''}` : 'font-weight: 400;';
            const gd = row.gf - row.ga;
            return `
                <tr class="border-b ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}${focus ? ' um-table-focus' : ''}">
                    <td class="text-center font-bold text-gray-600">${row.position}</td>
                    <td><div class="um-cell-team">${crest(row.team, div)}<span class="um-cell-name" style="${nameStyle}">${escapeHtml(row.team)}</span></div></td>
                    <td class="text-center">${row.played}</td>
                    ${phone ? `
                    <td class="text-center">${row.won}-${row.drawn}-${row.lost}</td>
                    <td class="text-center">${row.gf}:${row.ga}</td>` : `
                    <td class="text-center">${row.won}</td>
                    <td class="text-center">${row.drawn}</td>
                    <td class="text-center">${row.lost}</td>
                    <td class="text-center">${row.gf}</td>
                    <td class="text-center">${row.ga}</td>`}
                    <td class="text-center"><span class="font-bold ${gd > 0 ? 'text-green-700' : gd < 0 ? 'text-red-600' : ''}">${gd > 0 ? '+' : ''}${gd}</span></td>
                    <td class="text-center"><span class="points-badge">${row.points}</span></td>
                </tr>`;
        }).join('');
        return `
            <div class="league-table um-streaks um-table to-slice${phone ? ' um-phone' : ''}">
                <table>
                    <thead><tr>
                        <th class="text-center">Pos</th><th style="text-align: left;">Team</th><th class="text-center">P</th>
                        ${phone ? '<th class="text-center">W-D-L</th><th class="text-center">GF:GA</th>'
                            : '<th class="text-center">W</th><th class="text-center">D</th><th class="text-center">L</th><th class="text-center">GF</th><th class="text-center">GA</th>'}
                        <th class="text-center">GD</th><th class="text-center">Pts</th>
                    </tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    // Not in this competition this season: where it last was
    function notThisSeason(div) {
        const seasons = state.seasons[div];
        const name = div === 'C1' ? 'the Champions League' : comp(div).inText;
        const last = Array.isArray(seasons) ? seasons.find(s => !s.inProgress) : null;
        if (!last) return `<p class="um-none">Not in ${escapeHtml(name)} this season.</p>`;
        const finish = div === 'C1' ? stageText(last.stage) : ordinal(last.position);
        return `<p class="um-none">Not in ${escapeHtml(name)} this season - last there in ${escapeHtml(last.season)} (${escapeHtml(finish)}).</p>`;
    }

    function thisSeasonSection() {
        const lgDiv = DIVS[state.lg];
        const season = currentSeasonKey();
        const next = state.upcoming && state.upcoming[0];
        const card = state.upcoming === undefined ? loading('the upcoming matches')
            : state.upcoming.length ? `<div class="to-next">${state.upcoming.map(f => parts().cardHtml(f, { withDay: true })).join('')}</div>` : '';
        const nextOpponent = next ? (next.homeTeam === state.team ? next.awayTeam : next.homeTeam) : null;
        return `
            <h3>This season</h3>
            <div class="to-now${card ? '' : ' to-now-table'}">
                ${card ? `<div><div class="to-sub">Upcoming matches</div>${card}</div>` : ''}
                <div>
                    <div class="to-sub">${lgDiv === 'C1' ? 'League phase table' : `${escapeHtml(comp(lgDiv).name)} table`} · ${escapeHtml(season)}</div>
                    ${tableSlice(lgDiv)}
                </div>
            </div>
            ${asks([
                [`${state.team} ${season}`, state.lg],
                [`${comp(lgDiv).name} ${season}`, state.lg],
                nextOpponent && [`${state.team} vs ${nextOpponent}`, slugOf(next.div)]
            ])}`;
    }

    // --- The domestic / continental sections --------------------------------

    function stageText(stage) {
        return stage === 'Group Stage' ? 'Group stage' : stage;
    }

    // A season's finish as the Team Seasons tab shows it: gold, silver and
    // bronze for the top three (NR for a revoked title); the stage reached
    // in its colours for the Champions League
    function positionCell(s) {
        const revoked = s.stripped && s.position === 1;
        const style = revoked ? 'color: #6b7280;'
            : s.position === 1 ? 'color: #d97706; background-color: #fef3c7;'
            : s.position === 2 ? 'color: #374151; background-color: #e5e7eb;'
            : s.position === 3 ? 'color: #b45309; background-color: #fef7ed;'
            : 'color: #6b7280;';
        return `<td class="text-center font-bold to-finish"${revoked ? ' title="Title revoked"' : ''} style="${style}">${revoked ? 'NR' : s.position}</td>`;
    }

    const STAGE_STYLES = {
        'Champions': 'color: #d97706; background-color: #fef3c7;',
        'Final': 'color: #374151; background-color: #e5e7eb;',
        'Semi-Finals': 'color: #b45309; background-color: #fef7ed;',
        'Quarter-Finals': 'color: #059669; background-color: #d1fae5;',
        'Round Of 16': 'color: #2563eb; background-color: #dbeafe;'
    };

    function stageCell(s) {
        const stage = s.stage || 'Group Stage';
        return `<td class="text-center font-bold to-finish" style="${STAGE_STYLES[stage] || 'color: #6b7280; background-color: #f9fafb;'}">${escapeHtml(stage)}</td>`;
    }

    function seasonsSection(div, scope) {
        const seasons = state.seasons[div];
        const continental = div === 'C1';
        let body;
        if (!seasons || seasons === 'loading') body = loading('the seasons');
        else if (seasons === 'error') body = failed('the seasons');
        else if (!seasons.length) body = '<p class="um-none">No seasons yet.</p>';
        else {
            const phone = phoneQuery.matches;
            // The Team Seasons tab's columns: Season (its chevron), P, W, D,
            // L, GF, GA, GD, Pts, then the finish in its medal colours - Pos,
            // or the stage reached in the Champions League; the Mobile
            // pages' W-D-L and GF:GA on phone
            const colspan = phone ? 7 : 9;
            const rows = seasons.slice(0, LAST_SEASONS).map((s, i) => {
                const gd = s.gf - s.ga;
                const key = `season|${div}|${s.season}`;
                return `
                    <tr class="border-b ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
                        <td class="font-semibold text-left">${chevron(key, "Show this season's matches")}${escapeHtml(s.season)}${s.inProgress ? '<span class="to-so-far"> (so far)</span>' : ''}</td>
                        <td class="text-center">${s.played}</td>
                        ${phone ? `
                        <td class="text-center">${s.won}-${s.drawn}-${s.lost}</td>
                        <td class="text-center">${s.gf}:${s.ga}</td>` : `
                        <td class="text-center">${s.won}</td>
                        <td class="text-center">${s.drawn}</td>
                        <td class="text-center">${s.lost}</td>
                        <td class="text-center">${s.gf}</td>
                        <td class="text-center">${s.ga}</td>`}
                        <td class="text-center"><span class="font-bold ${gd > 0 ? 'text-green-700' : gd < 0 ? 'text-red-600' : 'text-black'}">${gd > 0 ? '+' : ''}${gd}</span></td>
                        <td class="text-center"><span class="points-badge">${s.points}</span></td>
                        ${continental ? stageCell(s) : positionCell(s)}
                    </tr>
                    ${state.open.has(key) ? matchListRow(seasonMatches(div, s), div, colspan) : ''}`;
            }).join('');
            body = `
                <div class="league-table um-streaks um-table to-seasons${phone ? ' um-phone' : ''}">
                    <table>
                        <thead><tr>
                            <th style="text-align: left;">Season</th><th class="text-center">P</th>
                            ${phone ? '<th class="text-center">W-D-L</th><th class="text-center">GF:GA</th>'
                                : '<th class="text-center">W</th><th class="text-center">D</th><th class="text-center">L</th><th class="text-center">GF</th><th class="text-center">GA</th>'}
                            <th class="text-center">GD</th><th class="text-center">Pts</th>
                            <th class="text-center">${continental ? (phone ? 'Stage' : 'Progression') : 'Pos'}</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        }
        return `
            <h3>Seasons</h3>
            ${body}
            ${asks([
                [`${state.team} seasons`, scope],
                [`${state.team} most points in a season`, scope],
                [`${state.team} most goals in a season`, scope]
            ])}`;
    }

    // W/D/L bars, as the match view's team records
    function recordBar(label, matches, div) {
        let wins = 0, draws = 0, losses = 0;
        matches.forEach(m => {
            const f = m.HomeTeam === state.team ? m.FTHG : m.FTAG;
            const a = m.HomeTeam === state.team ? m.FTAG : m.FTHG;
            if (f > a) wins++; else if (f < a) losses++; else draws++;
        });
        const total = matches.length;
        if (!total) return '';
        const color = getTeamColor(state.team, slugOf(div));
        const winStyle = color ? `background: ${color} !important; color: ${getContrastColor(color)} !important;` : 'background: #059669 !important; color: white !important;';
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
    }

    // The opponent it has played most (the first met, on a tie)
    function mostPlayedOpponent(matches) {
        const counts = new Map();
        matches.forEach(m => {
            const opp = m.HomeTeam === state.team ? m.AwayTeam : m.HomeTeam;
            counts.set(opp, (counts.get(opp) || 0) + 1);
        });
        let best = null;
        counts.forEach((n, opp) => { if (!best || n > best[1]) best = [opp, n]; });
        return best ? best[0] : null;
    }

    function allTimeSection(div, scope) {
        const history = state.history[div];
        const plEra = div === 'E0' && state.era === 'pl';
        const eraChips = div === 'E0' ? `
            <div class="um-filters um-era">
                ${[['pl', parts().eraLabels.pl], ['all', parts().eraLabels.all]].map(([era, label]) =>
                    `<button type="button" class="um-chip${state.era === era ? ' active' : ''}" data-era="${era}">${escapeHtml(label)}</button>`).join('')}
            </div>` : '';
        let body;
        if (!history || history === 'loading') body = loading('the record');
        else if (history === 'error') body = failed('the record');
        else {
            const matches = plEra ? history.filter(m => m.dateObj >= parts().premierLeagueEraStart) : history;
            if (!matches.length) body = '<p class="um-none">No matches in the Premier League era.</p>';
            else {
                let gf = 0, ga = 0, wins = 0;
                matches.forEach(m => {
                    const f = m.HomeTeam === state.team ? m.FTHG : m.FTAG;
                    const a = m.HomeTeam === state.team ? m.FTAG : m.FTHG;
                    gf += f; ga += a; if (f > a) wins++;
                });
                const seasons = Array.isArray(state.seasons[div])
                    ? state.seasons[div].filter(s => !plEra || s.start >= '1992-07-01') : [];
                const first = seasons.length ? seasons[seasons.length - 1].season : null;
                body = `
                    <dl class="to-stats">
                        <div><dt>Played</dt><dd>${matches.length.toLocaleString()}</dd></div>
                        <div><dt>Win rate</dt><dd>${Math.round(wins / matches.length * 100)}%</dd></div>
                        <div><dt>Goals</dt><dd>${gf.toLocaleString()} - ${ga.toLocaleString()}</dd></div>
                        ${seasons.length ? `<div><dt>Seasons</dt><dd>${seasons.length}${first ? ` <span class="to-dim">since ${escapeHtml(first)}</span>` : ''}</dd></div>` : ''}
                    </dl>
                    ${recordBar('Overall', matches, div)}
                    ${recordBar('Home', matches.filter(m => m.HomeTeam === state.team), div)}
                    ${recordBar('Away', matches.filter(m => m.AwayTeam === state.team), div)}`;
            }
        }
        const opponent = Array.isArray(history) ? mostPlayedOpponent(history) : null;
        return `
            <h3>All-time record</h3>
            ${eraChips}
            ${body}
            ${asks([
                [`${state.team} record`, scope],
                [`${state.team} home record`, scope],
                [`${state.team} away record`, scope],
                opponent && [`${state.team} vs ${opponent}`, scope]
            ])}`;
    }

    function titlesSection(div, scope) {
        const seasons = state.seasons[div];
        let body;
        if (!seasons || seasons === 'loading') body = loading('the titles');
        else if (seasons === 'error') body = failed('the titles');
        else {
            const done = seasons.filter(s => !s.inProgress);
            if (div === 'C1') {
                const titles = done.filter(s => s.stage === 'Champions');
                const finals = done.filter(s => s.stage === 'Champions' || s.stage === 'Final');
                const semis = done.filter(s => s.stageRank <= 2);
                const best = done.reduce((b, s) => (!b || s.stageRank < b.stageRank ? s : b), null);
                body = `
                    <dl class="to-stats">
                        <div><dt>Titles</dt><dd>${titles.length}${titles.length ? ` <span class="to-dim">last ${escapeHtml(titles[0].season)}</span>` : ''}</dd></div>
                        <div><dt>Finals</dt><dd>${finals.length}</dd></div>
                        <div><dt>Semi-finals or better</dt><dd>${semis.length}</dd></div>
                        ${!titles.length && best ? `<div><dt>Best</dt><dd>${escapeHtml(stageText(best.stage))} <span class="to-dim">${escapeHtml(best.season)}</span></dd></div>` : ''}
                    </dl>
                    ${titleYears(titles, div, scope)}`;
            } else {
                // Championships from before the league's records start
                // (historic seasons), counted as the titles answer counts
                // them - Serie A and the Bundesliga only
                const historic = ['I1', 'D1'].includes(div)
                    ? window.DomesticSeasonRules.historicSeasonsData
                        .filter(([season, d, pos, team]) => d === div && pos === 1 && team === state.team)
                        .map(([season]) => ({ season, historic: true }))
                    : [];
                const titles = [...done.filter(s => s.position === 1 && !s.stripped), ...historic]
                    .sort((a, b) => b.season.localeCompare(a.season));
                const second = done.filter(s => s.position === 2);
                const top4 = done.filter(s => s.position <= 4);
                const best = done.reduce((b, s) => (!b || s.position < b.position ? s : b), null);
                body = `
                    <dl class="to-stats">
                        <div><dt>Titles</dt><dd>${titles.length}${titles.length ? ` <span class="to-dim">last ${escapeHtml(titles[0].season)}</span>` : ''}</dd></div>
                        <div><dt>Runner-up</dt><dd>${second.length}</dd></div>
                        <div><dt>Top 4</dt><dd>${top4.length} <span class="to-dim">of ${done.length} seasons</span></dd></div>
                        ${!titles.length && best ? `<div><dt>Best finish</dt><dd>${ordinal(best.position)} <span class="to-dim">${escapeHtml(best.season)}</span></dd></div>` : ''}
                    </dl>
                    ${titleYears(titles, div, scope)}`;
            }
        }
        const questions = div === 'C1'
            ? [[`${state.team} titles`, scope], [`${state.team} finals`, scope], [`${state.team} semi finals`, scope]]
            : [[`${state.team} titles`, scope], [`${state.team} runner up finishes`, scope], [`${state.team} top 4 finishes`, scope]];
        return `
            <h3>Titles &amp; finishes</h3>
            ${body}
            ${asks(questions)}`;
    }

    // The title seasons (the latest few), each opening that season's table
    function titleYears(titles, div, scope) {
        if (!titles.length) return '';
        const shown = titles.slice(0, TITLE_YEARS);
        const links = shown.map(s => {
            const href = !s.historic && window.LeagueSearch && LeagueSearch.answerHref(`${comp(div).name} ${s.season}`, scope);
            return href ? `<a class="to-year" href="${escapeHtml(href)}">${escapeHtml(s.season)}</a>` : `<span class="to-year">${escapeHtml(s.season)}</span>`;
        }).join('');
        const more = titles.length > shown.length ? `<span class="to-dim"> and ${titles.length - shown.length} more</span>` : '';
        return `<div class="to-years"><span class="to-years-label">Titles:</span>${links}${more}</div>`;
    }

    function streaksSection(div, scope) {
        const history = state.history[div];
        let body;
        let streaks = [];
        if (!history || history === 'loading') body = loading('the streaks');
        else if (history === 'error') body = failed('the streaks');
        else {
            streaks = parts().activeStreaks(history, state.team);
            if (!streaks.length) body = `<p class="um-none">No active streaks of ${parts().minStreak}+ games.</p>`;
            else {
                const rows = streaks.map((s, i) => {
                    const start = s.matches[s.matches.length - 1].dateObj;
                    const key = `streak|${div}|${s.type}`;
                    return `
                        <tr class="border-b ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
                            <td style="width: 2rem;">${chevron(key, "Show this streak's matches")}</td>
                            <td class="text-center">${escapeHtml(parts().streakLabels[s.type])}</td>
                            <td class="text-center font-bold">${s.matches.length}</td>
                            <td class="text-center">${escapeHtml(start.toLocaleDateString())}</td>
                        </tr>
                        ${state.open.has(key) ? matchListRow(s.matches, div, 4) : ''}`;
                }).join('');
                body = `
                    <div class="league-table um-streaks to-streaks">
                        <table>
                            <thead><tr><th></th><th class="text-center">Streak</th><th class="text-center">Games</th><th class="text-center">Since</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`;
            }
        }
        return `
            <h3>Streaks going now</h3>
            ${body}
            ${asks([
                ...streaks.slice(0, 2).map(s => [`${state.team} ${STREAK_WORDS[s.type]} streak`, scope]),
                [`${state.team} longest unbeaten runs`, scope],
                [`${state.team} longest winning runs`, scope]
            ])}`;
    }

    // Its biggest win, heaviest defeat and highest-scoring match (the most
    // recent of any tie), each saying how many others share the record
    function extremes(history) {
        const rows = history.map(m => {
            const home = m.HomeTeam === state.team;
            const f = home ? m.FTHG : m.FTAG, a = home ? m.FTAG : m.FTHG;
            return { m, margin: f - a, scored: f, conceded: a, total: f + a };
        });
        const pick = (list, better, same) => {
            let best = null, ties = 0;
            list.forEach(r => {
                if (!best || better(r, best)) { best = r; ties = 0; }
                else if (same(r, best)) ties++;
            });
            return best ? { ...best, ties } : null;
        };
        // history is newest first, so a tie keeps the most recent
        return {
            win: pick(rows.filter(r => r.margin > 0), (r, b) => r.margin > b.margin || (r.margin === b.margin && r.scored > b.scored), (r, b) => r.margin === b.margin && r.scored === b.scored),
            defeat: pick(rows.filter(r => r.margin < 0), (r, b) => r.margin < b.margin || (r.margin === b.margin && r.conceded > b.conceded), (r, b) => r.margin === b.margin && r.conceded === b.conceded),
            goals: pick(rows, (r, b) => r.total > b.total, (r, b) => r.total === b.total)
        };
    }

    function matchRow(label, record, div, note) {
        if (!record) return '';
        const m = record.m;
        const stage = div === 'C1' && m.CompetitionPhase ? ` · ${escapeHtml(m.CompetitionPhase)}` : '';
        return `
            <div class="to-match">
                <div class="to-match-label">${escapeHtml(label)}</div>
                <div class="to-match-teams">
                    <span class="to-match-side to-home">${teamName(m.HomeTeam, div, m.HomeTeam === state.team)}${crest(m.HomeTeam, div)}</span>
                    <span class="to-match-score">${m.FTHG}-${m.FTAG}</span>
                    <span class="to-match-side">${crest(m.AwayTeam, div)}${teamName(m.AwayTeam, div, m.AwayTeam === state.team)}</span>
                </div>
                <div class="to-match-when">${escapeHtml(longDate(m.dateObj))}${stage}${record.ties ? ` · <span class="to-dim">${escapeHtml(note(record.ties))}</span>` : ''}</div>
            </div>`;
    }

    function biggestSection(div, scope) {
        const history = state.history[div];
        let body;
        if (!history || history === 'loading') body = loading('the matches');
        else if (history === 'error') body = failed('the matches');
        else if (!history.length) body = '<p class="um-none">No matches yet.</p>';
        else {
            const { win, defeat, goals } = extremes(history);
            const others = n => `and ${n} other${n === 1 ? '' : 's'}`;
            body = `
                <div class="to-matches">
                    ${matchRow('Biggest win', win, div, others)}
                    ${matchRow('Heaviest defeat', defeat, div, others)}
                    ${matchRow(goals ? `Most goals (${goals.total})` : 'Most goals', goals, div, others)}
                </div>`;
        }
        return `
            <h3>Biggest wins &amp; matches</h3>
            ${body}
            ${asks([
                [`${state.team} biggest victories`, scope],
                [`${state.team} heaviest defeats`, scope],
                [`${state.team} highest scoring matches`, scope]
            ])}`;
    }

    // --- The overview ---------------------------------------------------------

    function render() {
        if (!els || !state.team) return;
        document.title = `${state.team} - League Table Statistics`;
        if (state.info === undefined) {
            els.view.innerHTML = `<p class="um-none">Loading ${escapeHtml(state.team)}...</p>`;
            return;
        }
        if (state.info === null) {
            els.view.innerHTML = `
                <div class="um-view-bar"><a class="um-back" href="index.html">← Home</a></div>
                <p class="um-none">No club called "${escapeHtml(state.team)}" in the site's competitions.</p>`;
            return;
        }
        const lgDiv = DIVS[state.lg];
        const div = sideDiv(state.side);
        const scope = slugOf(div);
        const switchHtml = state.sides.length > 1 ? `
            <div class="um-filters to-switch" role="group" aria-label="Domestic or continental">
                ${state.sides.map(side => {
                    const name = comp(sideDiv(side)).name;
                    return `<button type="button" class="um-chip${state.side === side ? ' active' : ''}" data-side="${side}">${side === 'domestic' ? 'Domestic' : 'Continental'} · ${escapeHtml(name)}</button>`;
                }).join('')}
            </div>` : '';
        els.view.innerHTML = `
            <div class="um-view-bar">
                <a class="um-back" href="index.html">← Home</a>
            </div>
            <div class="to-head">
                ${crest(state.team, lgDiv, 'to-crest')}
                <div>
                    <h2 class="to-title">${teamName(state.team, lgDiv)}</h2>
                    <div class="um-view-meta">${comp(lgDiv).flag} ${escapeHtml(comp(lgDiv).name)}</div>
                </div>
            </div>
            ${thisSeasonSection()}
            ${switchHtml || `<div class="to-side-label">${comp(div).flag} ${escapeHtml(comp(div).name)}</div>`}
            ${seasonsSection(div, scope)}
            <div class="to-pair">
                <section>${allTimeSection(div, scope)}</section>
                <section>${titlesSection(div, scope)}</section>
            </div>
            ${streaksSection(div, scope)}
            ${biggestSection(div, scope)}
            <div class="to-foot"><a href="${escapeHtml(state.info.dashboardUrl)}">Open the full Team Dashboard (tabs) →</a></div>`;
    }

    function handleClick(event) {
        const toggle = event.target.closest('[data-open]');
        if (toggle) {
            const key = toggle.dataset.open;
            if (state.open.has(key)) state.open.delete(key); else state.open.add(key);
            render();
            return;
        }
        const card = event.target.closest('[data-match]');
        if (card) {
            window.UpcomingMatches.openMatch(Number(card.dataset.match));
            return;
        }
        const side = event.target.closest('[data-side]');
        if (side) {
            state.side = side.dataset.side;
            const div = sideDiv(state.side);
            loadHistory(div);
            loadSeasons(div);
            render();
            return;
        }
        const era = event.target.closest('[data-era]');
        if (era) {
            state.era = era.dataset.era;
            render();
        }
    }

    async function open(team, lg) {
        state.team = team;
        render();
        state.info = window.LeagueSearch ? await LeagueSearch.teamInfo(team) : null;
        if (!state.info) { render(); return; }
        state.sides = [state.info.league && 'domestic', state.info.continental && 'continental'].filter(Boolean);
        state.side = state.sides[0] || 'domestic';
        state.lg = DIVS[lg] ? lg : (state.info.league || 'champions-league');
        // This season's competition can be the other side (a club opened
        // from the Champions League dropdown): its seasons say where it
        // last was when it isn't in this season's table
        const lgDiv = DIVS[state.lg];
        render();
        loadThisSeason();
        const div = sideDiv(state.side);
        loadHistory(div);
        loadSeasons(div);
        if (lgDiv !== div) loadSeasons(lgDiv);
    }

    // view: where the overview goes. Shown when the address has ?team=;
    // the page hides its strip, examples and streaks card meanwhile (body
    // class to-viewing), and the match view hides it in turn.
    function mount(view) {
        const params = new URLSearchParams(window.location.search);
        const team = params.get('team');
        if (!team) return false;
        els = { view };
        document.body.classList.add('to-viewing');
        view.hidden = false;
        view.addEventListener('click', handleClick);
        new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        phoneQuery.addEventListener('change', render);
        // Back from the match view: upcoming.js resets the title
        window.addEventListener('popstate', render);
        open(team, params.get('lg'));
        return true;
    }

    window.TeamOverview = { mount };
})();
