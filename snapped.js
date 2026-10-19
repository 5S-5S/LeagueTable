// Snapped streaks on the home page (index.html): a card under the search
// card listing every statistically significant streak that ended in the
// last year, newest first, with the last 7 days outlined. A competition
// filter, 20 a page; each entry expands into the run's matches under the
// match that ended it (Team Streaks' historic layout) and a button that
// asks the search for every run of that kind.
//
// A toggle switches it to "On the line": the significant streaks still
// going that a match in the next 7 days could end, soonest kickoff first,
// the next 24 hours outlined - each naming the fixture, opening into the
// run's matches so far, and linking to the fixture's match view
// (upcoming.js). It opens on that view when there's anything on it.
//
// Both lists come ready-made from /api/snapped-streaks: working them out
// needs every competition's whole history, so a GitHub Actions job does it
// (backend/migration/snapped-streaks.mjs, which also documents what counts
// as significant). An expanded entry's matches come from the same
// team-history / head-to-head endpoints the sport pages use. Needs
// team-registry.js (crests and club colors); search.js for the button.
(function () {
    'use strict';

    const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
    const PAGE_SIZE = 20;
    const RECENT_DAYS = 7;
    const WINDOW_DAYS = 365;
    const SOON_HOURS = 24;
    // A fixture that kicked off this long ago without its result reaching
    // the list (the live result normally reruns the job within minutes) is
    // dropped rather than shown as in play
    const IN_PLAY_HOURS = 3;

    const COMPETITIONS = {
        E0: { slug: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', page: 'DomesticEurope.html', inText: 'the Premier League' },
        SP1: { slug: 'la-liga', name: 'La Liga', flag: '🇪🇸', page: 'DomesticEurope.html', inText: 'La Liga' },
        I1: { slug: 'serie-a', name: 'Serie A', flag: '🇮🇹', page: 'DomesticEurope.html', inText: 'Serie A' },
        D1: { slug: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', page: 'DomesticEurope.html', inText: 'the Bundesliga' },
        F1: { slug: 'ligue-1', name: 'Ligue 1', flag: '🇫🇷', page: 'DomesticEurope.html', inText: 'Ligue 1' },
        C1: { slug: 'champions-league', name: 'Champions League', flag: '🇪🇺', page: 'ContinentalEurope.html', inText: 'the Champions League' }
    };
    const COMPETITION_ORDER = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];

    // Champions League stages (a streak's `stage` - snapped-lib.mjs STAGES):
    // its matches in words, the competition label in the pills, and the
    // Team Streaks tab's Competition Stage option
    const STAGES = {
        group: { word: 'Group Stage', matches: 'Group Stage matches', in: 'the Group Stage', filter: 'League/Group Stage' },
        knockout: { word: 'Knock-Out', matches: 'Knock-Out matches', in: 'the Knock-Out stage', filter: 'Knock-Out Stage' },
        final: { word: 'Final', matches: 'Finals', in: 'Finals', filter: 'Final' },
        semi: { word: 'Semi-Finals', matches: 'Semi-Finals matches', in: 'Semi-Finals', filter: 'Semi-Finals' },
        quarter: { word: 'Quarter-Finals', matches: 'Quarter-Finals matches', in: 'Quarter-Finals', filter: 'Quarter-Finals' },
        r16: { word: 'Round of 16', matches: 'Round of 16 matches', in: 'the Round of 16', filter: 'Round Of 16' }
    };
    const stageOf = s => (s.stage && STAGES[s.stage]) || null;

    // A match in a stage - the same rule as snapped-lib.mjs's inStage()
    // (qualifying rounds are in none)
    const KNOCKOUT_PHASES = ['round of 16', 'quarter-finals', 'semi-finals', 'final', 'play-offs', '1. round', '2. round'];
    function inStage(competitionPhase, stage) {
        if (!competitionPhase || competitionPhase.startsWith('Qualification')) return false;
        const phase = competitionPhase.toLowerCase();
        return {
            group: () => /league phase|group|preliminary|intermediate/.test(phase),
            knockout: () => KNOCKOUT_PHASES.includes(phase),
            final: () => phase === 'final',
            semi: () => phase === 'semi-finals',
            quarter: () => phase === 'quarter-finals',
            r16: () => phase === 'round of 16'
        }[stage]();
    }

    // The words the search reads as each streak type ("Sevilla FC longest
    // winless runs vs FC Barcelona")
    const SEARCH_TYPE_WORDS = {
        'winning': 'winning', 'unbeaten': 'unbeaten', 'draw': 'draw', 'winless': 'winless', 'losing': 'losing',
        'clean-sheet': 'clean sheet', 'goals-conceded': 'conceding', 'scoring': 'scoring', 'no-score': 'failed to score'
    };

    const phoneQuery = window.matchMedia('(max-width: 640px)');

    const state = {
        streaks: [],
        onTheLine: [],
        view: 'line',           // 'line' | 'snapped' | 'team'
        filterDiv: 'all',
        page: 1,
        open: new Set(),        // keys of expanded entries
        matches: new Map(),     // key -> { status: 'loading' | 'ready' | 'error', ended, run }
        collapsed: readCollapsed() // favourite teams whose runs are folded away
    };
    let els = null;

    // --- Helpers ----------------------------------------------------------

    // The team view's folded teams, remembered in this browser (or until
    // the page closes, where storage refuses)
    function readCollapsed() {
        try {
            const list = JSON.parse(localStorage.getItem('collapsedTeams') || '[]');
            return new Set(Array.isArray(list) ? list : []);
        } catch (err) {
            return new Set();
        }
    }
    function writeCollapsed() {
        try {
            localStorage.setItem('collapsedTeams', JSON.stringify([...state.collapsed]));
        } catch (err) {
            // kept in state
        }
    }

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

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ISO dates are calendar days: noon UTC keeps them on the same day in
    // every timezone
    const toDate = iso => new Date(`${iso}T12:00:00Z`);
    const fullDate = iso => toDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const dayLabel = iso => toDate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const shortDate = iso => toDate(iso).toLocaleDateString(undefined, { timeZone: 'UTC' });

    function isoDaysAgo(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const kickoffLabel = utc => new Date(utc).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

    // Days the way Team Streaks counts them: first match to the match that
    // ended the run (or the latest one, still going), inclusive
    const lengthInDays = s => Math.round((toDate(s.end || s.last) - toDate(s.start)) / 86400000) + 1;

    // On the line entries have a fixture instead of an end
    const isLive = s => Boolean(s.fixture);
    const judgedOn = s => isLive(s) ? s.fixture.utcDate.slice(0, 10) : s.end;

    const keyOf = s => [s.kind, s.div, s.stage || '', s.team, s.opp || '', s.type, s.loc, isLive(s) ? `f${s.fixture.matchId}` : s.end].join('|');

    function teamStyle(team, div, highlight = '') {
        const color = getTeamColor(team, COMPETITIONS[div].slug);
        return color ? `color: ${pickTeamTextColor(color, highlight)} !important;` : '';
    }

    const teamName = (team, div) => `<span style="${teamStyle(team, div)}">${escapeHtml(team)}</span>`;

    function crest(team, div) {
        const url = getTeamLogoUrl(team, COMPETITIONS[div].slug);
        return url ? `<img src="${url}" alt="" title="${escapeHtml(team)}" onerror="this.style.display='none'">` : '';
    }

    // --- One entry ----------------------------------------------------------

    // What happened, in words: the run that ended, said from the side of
    // the club it belonged to
    // A stage's run says which ("in the Group Stage", "Finals")
    function headline(s) {
        const T = teamName(s.team, s.div);
        const n = s.count;
        const stage = stageOf(s);
        const IN = stage ? ` in ${stage.in}` : '';
        if (s.kind === 'club') {
            const adj = { all: '', home: 'home ', away: 'away ' }[s.loc];
            const where = { all: '', home: ' at home', away: ' away from home' }[s.loc];
            const matches = stage ? stage.matches : 'matches';
            return {
                'winning': `${T}'s ${n}-match ${adj}winning run${IN} is over`,
                'unbeaten': `${T}'s ${n}-match ${adj}unbeaten run${IN} is over`,
                'draw': `${T}'s run of ${n} ${adj}draws${IN} is over`,
                'winless': `${T} won${where} for the first time in ${n} ${matches}`,
                'losing': `${T} avoided defeat${where} for the first time in ${n} ${matches}`,
                'clean-sheet': `${T}'s run of ${n} ${adj}clean sheets${IN} is over`,
                'goals-conceded': `${T} kept a clean sheet${where} for the first time in ${n} ${matches}`,
                'scoring': `${T} failed to score${where} for the first time in ${n} ${matches}`,
                'no-score': `${T} scored${where} for the first time in ${n} ${matches}`
            }[s.type];
        }
        const O = teamName(s.opp, s.div);
        const word = stage ? `${stage.word} ` : '';
        const games = { all: `${word}meetings`, home: `home ${word}games against them`, away: `${word}visits` }[s.loc];
        const vs = { all: `against ${O}`, home: `at home to ${O}`, away: `away at ${O}` }[s.loc] + IN;
        return {
            'winning': `${T}'s ${n}-game winning run ${vs} is over`,
            'unbeaten': `${T}'s ${n}-game unbeaten run ${vs} is over`,
            'draw': `${T}'s run of ${n} draws ${vs} is over`,
            'winless': s.loc === 'away'
                ? `${T} won at ${O} for the first time in ${n} ${word}visits`
                : `${T} beat ${O}${s.loc === 'home' ? ' at home' : ''} for the first time in ${n} ${games}`,
            'losing': `${T} avoided defeat ${vs} for the first time in ${n} ${games}`,
            'clean-sheet': `${T}'s run of ${n} clean sheets ${vs} is over`,
            'goals-conceded': `${T} kept a clean sheet ${vs} for the first time in ${n} ${games}`,
            'scoring': `${T} failed to score ${vs} for the first time in ${n} ${games}`,
            'no-score': `${T} scored ${vs} for the first time in ${n} ${games}`
        }[s.type];
    }

    // A run still going, in words: what the club has done in its last n
    // matches (at home, away, against the opponent)
    function liveHeadline(s) {
        const T = teamName(s.team, s.div);
        const n = s.count;
        // "their last 39 home Group Stage matches", "last 9 Finals"
        const stage = stageOf(s);
        const matches = stage ? stage.matches : 'matches';
        const word = stage ? `${stage.word} ` : '';
        const games = s.kind === 'club'
            ? { all: matches, home: `home ${matches}`, away: `away ${matches}` }[s.loc]
            : { all: `${word}meetings with ${teamName(s.opp, s.div)}`, home: `home ${word}games against ${teamName(s.opp, s.div)}`, away: `${word}visits to ${teamName(s.opp, s.div)}` }[s.loc];
        const last = `their last ${n} ${games}`;
        return {
            'winning': `${T} have won ${last}`,
            'unbeaten': `${T} are unbeaten in ${last}`,
            'draw': `${T} have drawn ${last}`,
            'winless': `${T} haven't won any of ${last}`,
            'losing': `${T} have lost ${last}`,
            'clean-sheet': `${T} have kept a clean sheet in ${last}`,
            'goals-conceded': `${T} have conceded in ${last}`,
            'scoring': `${T} have scored in ${last}`,
            'no-score': `${T} haven't scored in any of ${last}`
        }[s.type];
    }

    // Why it's listed: a club record, its longest in 10+ years, rare for
    // the club, or rare in the league - on the line, also a run level with
    // the club record (one more sets a new one)
    // league: the competition's name in the label - On this day passes
    // the one it had then (the First Division)
    function pills(s, league = COMPETITIONS[s.div].name + (stageOf(s) ? ` ${stageOf(s).word}` : '')) {
        const top = Math.max(0.1, Math.ceil((1 - s.pct) * 1000) / 10);
        const rare = `<span class="ss-pill rare" title="Longer than ${(s.pct * 100).toFixed(1)}% of ${escapeHtml(league)} runs of this kind since 1995">Top ${top}% in ${escapeHtml(league)}</span>`;
        // The longest of its kind by anyone, all time (snapped-lib.mjs) -
        // in place of the club record it also is
        const competition = competitionPill(s, league);
        if (s.kind === 'h2h') return `${competition || rare}<span class="ss-pill h2h">Head-to-head</span>`;
        if (competition) return competition;
        const nextRecord = isLive(s) && s.record === s.count
            ? `<span class="ss-pill record" title="Level with ${escapeHtml(s.team)}'s longest run of this kind in ${escapeHtml(league)} (${s.record})">One more: club record</span>`
            : '';
        if (s.source === 'near-record') return nextRecord + rare;
        if (!s.longestSince && s.recordNow) {
            // A record when it ended, beaten since
            const r = s.recordNow;
            const when = r.end ? r.end.slice(0, 4) : 'still going';
            return `<span class="ss-pill since" title="${escapeHtml(s.team)}'s longest run of this kind when it ended; their longest now is ${r.count} (${fullDate(r.start)} - ${r.end ? fullDate(r.end) : 'still going'})">Club record then · now ${r.count} (${when})</span>`;
        }
        if (!s.longestSince) return '<span class="ss-pill record">Club record</span>';
        const years = (toDate(judgedOn(s)) - toDate(s.longestSince)) / (365.25 * 86400000);
        if (years >= 10) return `<span class="ss-pill since">Longest since ${s.longestSince.slice(0, 4)}</span>${nextRecord}`;
        if (s.source === 'club') {
            return `<span class="ss-pill since" title="In the top 2% of ${escapeHtml(s.team)}'s own runs of this kind over the last 20 years">Rare for ${escapeHtml(s.team)}</span>${nextRecord}`;
        }
        return rare + nextRecord;
    }

    function competitionPill(s, league) {
        const kind = s.kind === 'h2h' ? 'head-to-head run' : 'run';
        if (s.competitionRecord === 'record') {
            return `<span class="ss-pill competition" title="The longest ${kind} of this kind in ${escapeHtml(league)} history">Competition record</span>`;
        }
        if (s.competitionRecord === 'level') {
            return `<span class="ss-pill competition" title="Level with the longest ${kind} of this kind in ${escapeHtml(league)} history (${s.count})">One more: competition record</span>`;
        }
        if (s.competitionRecord === true) {
            return s.competitionRecordNow
                ? `<span class="ss-pill competition" title="The longest ${kind} of this kind in ${escapeHtml(league)} history when it ended; the longest now is ${s.competitionRecordNow}">Competition record then · now ${s.competitionRecordNow}</span>`
                : `<span class="ss-pill competition" title="The longest ${kind} of this kind in ${escapeHtml(league)} history">Competition record</span>`;
        }
        return '';
    }

    // Runs that carry on across years out of the competition (or years
    // without a meeting) say so, so the games and days add up
    function gapNote(s) {
        if (!s.gaps || !s.gaps.length) return '';
        const spans = s.gaps.map(g => `${g.from.slice(0, 4)}–${g.to.slice(0, 4)}`);
        const list = spans.length > 1 ? `${spans.slice(0, -1).join(', ')} and ${spans[spans.length - 1]}` : spans[0];
        const text = s.kind === 'club'
            ? `Includes ${list} outside ${COMPETITIONS[s.div].inText}`
            : `No ${COMPETITIONS[s.div].name} meetings ${list}`;
        return `<p class="ss-note">${escapeHtml(text)}</p>`;
    }

    // --- Expanded: the run's matches -----------------------------------------

    // The club's (or the pair's) matches from the sport pages' endpoints,
    // cut to the run: same location, from its first match to the one that
    // ended it (to the latest, still going)
    async function loadMatches(s) {
        const key = keyOf(s);
        if (state.matches.has(key)) return;
        state.matches.set(key, { status: 'loading' });
        try {
            const div = encodeURIComponent(s.div);
            const url = s.kind === 'club'
                ? `${API_BASE}/api/team-history?div=${div}&team=${encodeURIComponent(s.team)}`
                : `${API_BASE}/api/head-to-head?div=${div}&team1=${encodeURIComponent(s.team)}&team2=${encodeURIComponent(s.opp)}`;
            const data = await fetchJson(url);
            const inRun = (data.matches || [])
                .filter(m => s.loc === 'all' || (s.loc === 'home') === (m.homeTeam === s.team))
                .filter(m => !s.stage || inStage(m.competitionPhase, s.stage))
                .filter(m => m.date >= s.start && m.date <= (s.end || s.last))
                .sort((a, b) => a.date.localeCompare(b.date));
            if (isLive(s)) {
                if (!inRun.length) throw new Error('the run\'s matches are missing');
                state.matches.set(key, { status: 'ready', run: inRun.reverse() });
                render();
                return;
            }
            const endedIndex = inRun.findIndex(m => m.date === s.end);
            if (endedIndex < 0) throw new Error('the match that ended the run is missing');
            state.matches.set(key, {
                status: 'ready',
                ended: inRun[endedIndex],
                run: inRun.slice(0, endedIndex).reverse() // newest first
            });
        } catch (err) {
            console.error('Snapped streak matches failed:', err);
            state.matches.set(key, { status: 'error' });
        }
        render();
    }

    // One match list in the sport pages' layout (the Mobile pages' on a
    // phone), the run's club highlighted (and the opponent, head-to-head)
    function matchTable(matches, s) {
        const phone = phoneQuery.matches;
        const isCL = s.div === 'C1';
        const highlight = team => team === s.team ? 'team1-highlight' : team === s.opp ? 'team2-highlight' : 'team-transparent-highlight';
        const teamCell = team => {
            const h = highlight(team);
            const name = phone ? '' : `<span class="${h}" style="${teamStyle(team, s.div, h)} font-weight: bold;">${escapeHtml(team)}</span>`;
            return `<div class="um-cell-team um-cell-center">${crest(team, s.div)}${name}</div>`;
        };
        const rows = matches.map((m, i) => {
            const winner = m.homeGoals > m.awayGoals ? m.homeTeam : m.awayGoals > m.homeGoals ? m.awayTeam : null;
            const [homeScoreClass, awayScoreClass] = !winner
                ? ['text-gray-400 font-bold draw-score', 'text-gray-400 font-bold draw-score']
                : winner === m.homeTeam
                    ? ['font-bold win-score', 'text-red-600 font-bold']
                    : ['text-red-600 font-bold', 'font-bold win-score'];
            const background = matches.length >= 3 && i % 2 === 1 ? 'bg-gray-50' : 'bg-white';
            const result = winner ? teamCell(winner) : `<span style="color: #9ca3af !important; font-weight: bold;">${phone ? 'D' : 'Draw'}</span>`;
            const stage = isCL ? `<td class="text-center${phone ? '' : ' text-sm'}">${escapeHtml(m.competitionPhase || '')}</td>` : '';
            if (phone) {
                return `
                <tr class="border-b ${background}">
                    <td class="text-center">${shortDate(m.date)}</td>${stage}
                    <td class="text-center">${teamCell(m.homeTeam)}</td>
                    <td class="text-center um-score"><span class="${homeScoreClass}">${m.homeGoals}</span>:<span class="${awayScoreClass}">${m.awayGoals}</span></td>
                    <td class="text-center">${teamCell(m.awayTeam)}</td>
                    <td class="text-center">${result}</td>
                </tr>`;
            }
            return `
                <tr class="border-b ${background}">
                    <td class="text-center text-sm">${shortDate(m.date)}</td>${stage}
                    <td class="text-center">${teamCell(m.homeTeam)}</td>
                    <td class="text-center text-lg ${homeScoreClass}">${m.homeGoals}</td>
                    <td class="text-center">${teamCell(m.awayTeam)}</td>
                    <td class="text-center text-lg ${awayScoreClass}">${m.awayGoals}</td>
                    <td class="text-center">${result}</td>
                </tr>`;
        }).join('');
        const head = `<th class="text-center">Date</th>${isCL ? '<th class="text-center">Stage</th>' : ''}` + (phone
            ? '<th class="text-center">Home</th><th class="text-center">H:A</th><th class="text-center">Away</th>'
            : '<th class="text-center">Home Team</th><th class="text-center">Home Score</th><th class="text-center">Away Team</th><th class="text-center">Away Score</th>')
            + '<th class="text-center">Result</th>';
        return `
            <div class="league-table season-matches${phone ? ` um-phone${isCL ? ' um-with-stage' : ''}` : ''}">
                <table>
                    <thead><tr>${head}</tr></thead>
                    <tbody class="team1-selected">${rows}</tbody>
                </table>
            </div>`;
    }

    // Like the match view's "Full head-to-head": every run of this kind for
    // the club (against the opponent), as a search answer - the question a
    // visitor would type, in this competition's dropdown. Falls back to
    // Team Streaks' Historic list if the search doesn't take it.
    function searchQuestion(s) {
        const stage = stageOf(s);
        return `${s.team} longest ${s.loc === 'all' ? '' : `${s.loc} `}${SEARCH_TYPE_WORDS[s.type]} runs${s.opp ? ` vs ${s.opp}` : ''}${stage ? ` in ${stage.in}` : ''}`;
    }

    function streaksHref(s) {
        const comp = COMPETITIONS[s.div];
        const params = new URLSearchParams({ view: 'team-streaks', lg: comp.slug, t1: s.team });
        if (s.opp) params.set('t2', s.opp);
        params.set('status', 'historic');
        if (s.loc !== 'all') params.set('loc', s.loc);
        params.set('type', s.type);
        // A stage's run: the tab with its Competition Stage set (the search
        // doesn't take stages for streaks)
        if (stageOf(s)) params.set('stage', stageOf(s).filter);
        const tab = `${comp.page}?${params}`;
        if (!window.LeagueSearch || stageOf(s)) return tab;
        const question = searchQuestion(s);
        const result = (LeagueSearch.searchFor(question, comp.slug).results || [])[0];
        if (!result || result.kind !== 'team-streaks') return tab;
        return `${result.href}&${new URLSearchParams({ search: result.kind, q: question, scope: comp.slug })}`;
    }

    function expandedHtml(s) {
        const loaded = state.matches.get(keyOf(s));
        let body;
        if (!loaded || loaded.status === 'loading') {
            body = '<p class="ss-loading">Loading the matches...</p>';
        } else if (loaded.status === 'error') {
            body = '<p class="ss-loading">The matches couldn\'t be loaded. Try again later.</p>';
        } else if (isLive(s)) {
            body = `
                <p class="streak-ended-note">The ${s.count} matches so far, newest first</p>
                ${matchTable(loaded.run, s)}`;
        } else {
            body = `
                ${matchTable([loaded.ended], s)}
                <p class="streak-ended-note">The match that ended this ${s.count}-game run</p>
                ${matchTable(loaded.run, s)}`;
        }
        return `
            <div class="ss-matches">
                ${body}
                <div class="um-links">${isLive(s) ? `<a href="?match=${s.fixture.matchId}" data-match="${s.fixture.matchId}">${escapeHtml(s.fixture.homeTeam)} v ${escapeHtml(s.fixture.awayTeam)}: the match →</a>` : ''}<a href="${escapeHtml(streaksHref(s))}">${escapeHtml(searchQuestion(s))} →</a></div>
            </div>`;
    }

    // On the line: the run so far and the fixture that could end it
    function liveEntryHtml(s, now) {
        const key = keyOf(s);
        const open = state.open.has(key);
        const kickoff = new Date(s.fixture.utcDate).getTime();
        const inPlay = kickoff <= now;
        const soon = kickoff - now <= SOON_HOURS * 3600000;
        const f = s.fixture;
        return `
            <div class="ss-item${open ? ' open' : ''}${soon ? ' recent' : ''}" data-key="${escapeHtml(key)}"${soon ? ` title="${inPlay ? 'In play' : 'Kicks off in the next 24 hours'}"` : ''}>
                <div class="ss-summary" role="button" tabindex="0" aria-expanded="${open}">
                    <div class="ss-crests">${crest(s.team, s.div)}${s.opp ? crest(s.opp, s.div) : ''}</div>
                    <div class="ss-text">
                        <div class="ss-headline">${liveHeadline(s)}</div>
                        <div class="ss-meta">${pills(s)}</div>
                        <dl class="ss-stats">
                            <div><dt>Start</dt><dd>${fullDate(s.start)}</dd></div>
                            <div><dt>Latest</dt><dd>${fullDate(s.last)}</dd></div>
                            <div><dt>Games</dt><dd>${s.count}</dd></div>
                            <div><dt>Days</dt><dd>${lengthInDays(s).toLocaleString()}</dd></div>
                        </dl>
                        <div class="ss-meta">
                            <span>${COMPETITIONS[s.div].flag} ${inPlay ? '<span class="ss-pill live">In play</span>' : escapeHtml(kickoffLabel(f.utcDate))}</span>
                            <span class="ss-score">${escapeHtml(f.homeTeam)} v ${escapeHtml(f.awayTeam)}</span>
                        </div>
                        ${gapNote(s)}
                    </div>
                    <span class="ss-chevron" aria-hidden="true">▶</span>
                </div>
                ${open ? expandedHtml(s) : ''}
            </div>`;
    }

    function entryHtml(s, recentFrom) {
        const key = keyOf(s);
        const open = state.open.has(key);
        const recent = s.end >= recentFrom;
        const m = s.endedBy;
        return `
            <div class="ss-item${open ? ' open' : ''}${recent ? ' recent' : ''}" data-key="${escapeHtml(key)}"${recent ? ' title="Snapped in the last 7 days"' : ''}>
                <div class="ss-summary" role="button" tabindex="0" aria-expanded="${open}">
                    <div class="ss-crests">${crest(s.team, s.div)}${s.opp ? crest(s.opp, s.div) : ''}</div>
                    <div class="ss-text">
                        <div class="ss-headline">${headline(s)}</div>
                        <div class="ss-meta">${pills(s)}</div>
                        <dl class="ss-stats">
                            <div><dt>Start</dt><dd>${fullDate(s.start)}</dd></div>
                            <div><dt>End</dt><dd>${fullDate(s.end)}</dd></div>
                            <div><dt>Games</dt><dd>${s.count}</dd></div>
                            <div><dt>Days</dt><dd>${lengthInDays(s).toLocaleString()}</dd></div>
                        </dl>
                        <div class="ss-meta">
                            <span>${COMPETITIONS[s.div].flag} ${dayLabel(m.date)}</span>
                            <span class="ss-score">${escapeHtml(m.homeTeam)} ${m.homeGoals}-${m.awayGoals} ${escapeHtml(m.awayTeam)}</span>
                        </div>
                        ${gapNote(s)}
                    </div>
                    <span class="ss-chevron" aria-hidden="true">▶</span>
                </div>
                ${open ? expandedHtml(s) : ''}
            </div>`;
    }

    // --- The card ---------------------------------------------------------------

    function snappedList() {
        const yearAgo = isoDaysAgo(WINDOW_DAYS);
        return state.streaks.filter(s => s.end > yearAgo && COMPETITIONS[s.div]);
    }

    // Kicked off within the last IN_PLAY_HOURS, or still to come
    function lineList(now) {
        return state.onTheLine.filter(s => COMPETITIONS[s.div] && new Date(s.fixture.utcDate).getTime() > now - IN_PLAY_HOURS * 3600000);
    }

    // The visitor's favourite teams (favourite-team.js, set with the top
    // bar's chip), in the order they were added
    const favouriteTeams = () => (window.FavouriteTeam ? FavouriteTeam.list() : []);

    // The first of the teams with this run, as either side
    const ownerOf = (s, teams) => teams.find(team => s.team === team || s.opp === team) || '';

    // Their runs, team by team: each one's on the line soonest first, then
    // snapped newest first. A run between two of them comes under the
    // first.
    function teamList(teams, now) {
        const line = lineList(now);
        const snapped = snappedList();
        return teams.flatMap(team => {
            const mine = s => ownerOf(s, teams) === team;
            return [...line.filter(mine), ...snapped.filter(mine)];
        });
    }

    function render() {
        if (!els) return;
        const now = Date.now();
        const snapped = snappedList();
        const line = lineList(now);
        if (snapped.length === 0 && line.length === 0) {
            els.section.hidden = true;
            return;
        }
        els.section.hidden = false;
        const teams = favouriteTeams();
        const team = teams[0] || '';
        const several = teams.length > 1;
        const teamView = state.view === 'team';
        const onLine = state.view === 'line';
        const all = teamView ? teamList(teams, now) : onLine ? line : snapped;

        const present = new Set(all.map(s => s.div));
        const chips = [['all', 'All'], ...COMPETITION_ORDER.filter(div => present.has(div)).map(div => [div, `${COMPETITIONS[div].flag} ${COMPETITIONS[div].name}`])];
        const filtered = all.filter(s => state.filterDiv === 'all' || s.div === state.filterDiv);
        // Several teams: a folded team keeps only its heading, so the pages
        // hold the runs still shown
        const perTeam = new Map(teams.map(t => [t, filtered.filter(s => ownerOf(s, teams) === t)]));
        const rows = teamView && several
            ? teams.flatMap(t => {
                const mine = perTeam.get(t);
                return mine.length && state.collapsed.has(t) ? [{ collapsedTeam: t, div: mine[0].div }] : mine;
            })
            : filtered;
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        state.page = Math.min(Math.max(1, state.page), totalPages);
        const pageStart = (state.page - 1) * PAGE_SIZE;
        const pageStreaks = rows.slice(pageStart, pageStart + PAGE_SIZE);
        const recentFrom = isoDaysAgo(RECENT_DAYS);

        const where = state.filterDiv === 'all' ? '' : ` in ${COMPETITIONS[state.filterDiv].name}`;
        const count = `${filtered.length} streak${filtered.length === 1 ? '' : 's'}${where} ${teamView ? 'on the line or snapped' : onLine ? 'on the line in the next 7 days' : 'in the last year'}${totalPages > 1 && rows === filtered ? ` - showing ${pageStart + 1}-${pageStart + pageStreaks.length}` : ''}`;
        // Previous / Page X of Y / Next, as Team Streaks' historic list
        const controls = totalPages > 1 ? `
            <div class="flex items-center justify-center gap-4 py-4">
                <button type="button" class="btn btn-secondary" data-page="-1" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
                <span class="text-sm text-gray-600">Page ${state.page} of ${totalPages}</span>
                <button type="button" class="btn btn-secondary" data-page="1" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
            </div>` : '';

        const views = [['line', 'On the line'], ['snapped', 'Snapped'], ['team', several ? '⭐ Your teams' : team ? `⭐ ${team}` : '⭐ Your team']];
        // The team view: with several teams a heading for each, and within
        // a team a heading before its on the line and its snapped entries
        // A team's heading folds its runs away (the chevron on the right),
        // with how many there are
        const teamHeadingHtml = (team, div) => {
            const folded = state.collapsed.has(team);
            const n = perTeam.get(team).length;
            return `<h3 class="ss-group ss-group-team${folded ? ' folded' : ''}">
                <button type="button" class="ss-team-toggle" data-fold="${escapeHtml(team)}" aria-expanded="${!folded}">
                    ${crest(team, div)}<span class="ss-team-name">${escapeHtml(team)}</span>
                    <span class="ss-team-count">${n} streak${n === 1 ? '' : 's'}</span>
                    <span class="ss-chevron" aria-hidden="true">▶</span>
                </button></h3>`;
        };
        const ownerOfRow = s => s.collapsedTeam || ownerOf(s, teams);
        const teamGroups = list => list.map((s, i) => {
            if (s.collapsedTeam) return teamHeadingHtml(s.collapsedTeam, s.div);
            const owner = ownerOf(s, teams);
            const newTeam = i === 0 || ownerOfRow(list[i - 1]) !== owner;
            const teamHeading = several && newTeam ? teamHeadingHtml(owner, s.div) : '';
            const heading = (newTeam || isLive(list[i - 1]) !== isLive(s))
                ? `<h3 class="ss-group">${isLive(s) ? 'On the line in the next 7 days' : 'Snapped in the last year'}</h3>`
                : '';
            return teamHeading + heading + (isLive(s) ? liveEntryHtml(s, now) : entryHtml(s, recentFrom));
        }).join('');
        const title = teamView ? (several ? 'Your teams\' streaks' : team ? `${escapeHtml(team)}'s streaks` : 'Your team\'s streaks') : onLine ? 'Streaks on the line' : 'Streaks snapped';
        const sub = teamView
            ? (several ? 'Notable runs of your teams that a match in the next 7 days could end, and those that ended in the last year. Click one for its matches.'
                : team ? `${escapeHtml(team)}'s notable runs that a match in the next 7 days could end, and those that ended in the last year. Click one for its matches.`
                : 'Pick your team to see its notable runs on the line and the ones it snapped. It\'s remembered on this device.')
            : onLine
                ? 'Notable runs still going that a match in the next 7 days could end, soonest first. Outlined: the next 24 hours. Click one for its matches so far.'
                : 'Notable runs that ended in the last year, newest first. Outlined: the last 7 days. Click one for its matches.';
        if (teamView && !team) {
            els.section.innerHTML = `
            <div class="ss-head">
                <div class="ss-title-row">
                    <h2 class="ss-title">${title}</h2>
                    <div class="ss-views" role="group" aria-label="Which streaks">
                        ${views.map(([view, label]) => `<button type="button" class="${state.view === view ? 'active' : ''}" data-view="${view}" aria-pressed="${state.view === view}">${escapeHtml(label)}</button>`).join('')}
                    </div>
                </div>
                <p class="ss-sub">${sub}</p>
            </div>
            <div class="ss-pick"><button type="button" class="btn btn-secondary" data-fav-open>⭐ Pick your team</button></div>`;
            return;
        }
        els.section.innerHTML = `
            <div class="ss-head">
                <div class="ss-title-row">
                    <h2 class="ss-title">${title}</h2>
                    <div class="ss-views" role="group" aria-label="Which streaks">
                        ${views.map(([view, label]) => `<button type="button" class="${state.view === view ? 'active' : ''}" data-view="${view}" aria-pressed="${state.view === view}">${escapeHtml(label)}</button>`).join('')}
                    </div>
                </div>
                <p class="ss-sub">${sub}</p>
            </div>
            <div class="um-filters ss-chips">
                ${chips.map(([div, label]) => `<button type="button" class="um-chip${state.filterDiv === div ? ' active' : ''}" data-div="${div}">${label}</button>`).join('')}
            </div>
            <p class="ss-count">${count}</p>
            ${pageStreaks.length
                ? `<div class="ss-list">${teamView ? teamGroups(pageStreaks) : pageStreaks.map(s => onLine ? liveEntryHtml(s, now) : entryHtml(s, recentFrom)).join('')}</div>`
                : `<p class="ss-empty">${teamView
                    ? `No notable streaks for ${several ? 'your teams' : escapeHtml(team)}${where} on the line in the next 7 days or snapped in the last year.`
                    : onLine ? `No notable streaks on the line${where} in the next 7 days.` : `No notable streaks snapped${where} in the last year.`}</p>`}
            ${controls}`;
    }

    function toggle(key) {
        if (state.open.has(key)) {
            state.open.delete(key);
        } else {
            state.open.add(key);
            const streak = [...state.streaks, ...state.onTheLine].find(s => keyOf(s) === key);
            if (streak) loadMatches(streak);
        }
        render();
    }

    function handleClick(event) {
        const viewButton = event.target.closest('[data-view]');
        if (viewButton) {
            if (state.view === viewButton.dataset.view) return;
            state.view = viewButton.dataset.view;
            state.page = 1;
            render();
            return;
        }
        // No favourite yet: the top bar's chip opens its panel
        if (event.target.closest('[data-fav-open]')) {
            if (window.FavouritePicker) FavouritePicker.open();
            return;
        }
        // A team's heading: fold or unfold its runs
        const fold = event.target.closest('[data-fold]');
        if (fold) {
            const team = fold.dataset.fold;
            if (state.collapsed.has(team)) state.collapsed.delete(team);
            else state.collapsed.add(team);
            writeCollapsed();
            render();
            const again = [...els.section.querySelectorAll('[data-fold]')].find(b => b.dataset.fold === team);
            if (again) again.focus();
            return;
        }
        // The fixture's match view, in place (upcoming.js) - a plain link
        // to ?match= without it
        const matchLink = event.target.closest('a[data-match]');
        if (matchLink) {
            if (window.UpcomingMatches && UpcomingMatches.openMatch) {
                event.preventDefault();
                UpcomingMatches.openMatch(Number(matchLink.dataset.match));
            }
            return;
        }
        const chip = event.target.closest('[data-div]');
        if (chip) {
            state.filterDiv = chip.dataset.div;
            state.page = 1;
            render();
            return;
        }
        const pageButton = event.target.closest('[data-page]');
        if (pageButton) {
            if (pageButton.disabled) return;
            state.page += Number(pageButton.dataset.page);
            render();
            els.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        if (event.target.closest('.um-links a')) return;
        const summary = event.target.closest('.ss-summary');
        if (summary) toggle(summary.parentElement.dataset.key);
    }

    function handleKey(event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const summary = event.target.closest('.ss-summary');
        if (!summary) return;
        event.preventDefault();
        toggle(summary.parentElement.dataset.key);
    }

    async function load() {
        try {
            const data = await fetchJson(`${API_BASE}/api/snapped-streaks`);
            state.streaks = data.streaks || [];
            state.onTheLine = data.onTheLine || [];
        } catch (err) {
            console.error('Snapped streaks failed:', err);
            state.streaks = [];
            state.onTheLine = [];
        }
        // Opens on the favourite's streaks when it has any, else on what's
        // coming up, unless nothing is
        state.view = teamList(favouriteTeams(), Date.now()).length ? 'team' : lineList(Date.now()).length ? 'line' : 'snapped';
        render();
    }

    // section: the card's element (hidden until there's something to show;
    // hidden with the search card while a match is open - it's a
    // .search-card too)
    function mount(section) {
        els = { section };
        section.hidden = true;
        section.addEventListener('click', handleClick);
        section.addEventListener('keydown', handleKey);
        // Team text colors depend on the theme; match lists on the width
        new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        phoneQuery.addEventListener('change', render);
        if (window.FavouriteTeam) {
            // A new pick shows the teams' streaks; removing the last one
            // leaves the team view
            FavouriteTeam.onChange(teams => {
                if (teams.length) state.view = 'team';
                else if (state.view === 'team') state.view = lineList(Date.now()).length ? 'line' : 'snapped';
                state.page = 1;
                render();
            });
        }
        load();
    }

    // headline / pills / streaksHref / searchQuestion / stageWord: one
    // snapped streak in words, why it's listed, its Team Streaks link, and
    // its Champions League stage ("Group Stage") if it has one - On this day
    // (onthisday.js) shows the streaks a past match ended the same way
    window.SnappedStreaks = { mount, headline, pills, streaksHref, searchQuestion, stageWord: s => (stageOf(s) ? stageOf(s).word : '') };
})();
