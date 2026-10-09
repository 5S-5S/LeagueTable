// Snapped streaks on the home page (index.html): a card under the search
// card listing every statistically significant streak that ended in the
// last year, newest first, with the last 7 days outlined. A competition
// filter, 20 a page; each entry expands into the run's matches under the
// match that ended it (Team Streaks' historic layout) and a button that
// asks the search for every run of that kind.
//
// The list comes ready-made from /api/snapped-streaks: working it out
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

    const COMPETITIONS = {
        E0: { slug: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', page: 'DomesticEurope.html', inText: 'the Premier League' },
        SP1: { slug: 'la-liga', name: 'La Liga', flag: '🇪🇸', page: 'DomesticEurope.html', inText: 'La Liga' },
        I1: { slug: 'serie-a', name: 'Serie A', flag: '🇮🇹', page: 'DomesticEurope.html', inText: 'Serie A' },
        D1: { slug: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', page: 'DomesticEurope.html', inText: 'the Bundesliga' },
        F1: { slug: 'ligue-1', name: 'Ligue 1', flag: '🇫🇷', page: 'DomesticEurope.html', inText: 'Ligue 1' },
        C1: { slug: 'champions-league', name: 'Champions League', flag: '🇪🇺', page: 'ContinentalEurope.html', inText: 'the Champions League' }
    };
    const COMPETITION_ORDER = ['E0', 'SP1', 'I1', 'D1', 'F1', 'C1'];

    // The words the search reads as each streak type ("Sevilla FC longest
    // winless runs vs FC Barcelona")
    const SEARCH_TYPE_WORDS = {
        'winning': 'winning', 'unbeaten': 'unbeaten', 'draw': 'draw', 'winless': 'winless', 'losing': 'losing',
        'clean-sheet': 'clean sheet', 'goals-conceded': 'conceding', 'scoring': 'scoring', 'no-score': 'failed to score'
    };

    const phoneQuery = window.matchMedia('(max-width: 640px)');

    const state = {
        streaks: [],
        filterDiv: 'all',
        page: 1,
        open: new Set(),        // keys of expanded entries
        matches: new Map()      // key -> { status: 'loading' | 'ready' | 'error', ended, run }
    };
    let els = null;

    // --- Helpers ----------------------------------------------------------

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

    // Days the way Team Streaks counts them: first match to the match that
    // ended the run, inclusive
    const lengthInDays = s => Math.round((toDate(s.end) - toDate(s.start)) / 86400000) + 1;

    const keyOf = s => [s.kind, s.div, s.team, s.opp || '', s.type, s.loc, s.end].join('|');

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
    function headline(s) {
        const T = teamName(s.team, s.div);
        const n = s.count;
        if (s.kind === 'club') {
            const adj = { all: '', home: 'home ', away: 'away ' }[s.loc];
            const where = { all: '', home: ' at home', away: ' away from home' }[s.loc];
            return {
                'winning': `${T}'s ${n}-match ${adj}winning run is over`,
                'unbeaten': `${T}'s ${n}-match ${adj}unbeaten run is over`,
                'draw': `${T}'s run of ${n} ${adj}draws is over`,
                'winless': `${T} won${where} for the first time in ${n} matches`,
                'losing': `${T} avoided defeat${where} for the first time in ${n} matches`,
                'clean-sheet': `${T}'s run of ${n} ${adj}clean sheets is over`,
                'goals-conceded': `${T} kept a clean sheet${where} for the first time in ${n} matches`,
                'scoring': `${T} failed to score${where} for the first time in ${n} matches`,
                'no-score': `${T} scored${where} for the first time in ${n} matches`
            }[s.type];
        }
        const O = teamName(s.opp, s.div);
        const games = { all: 'meetings', home: 'home games against them', away: 'visits' }[s.loc];
        const vs = { all: `against ${O}`, home: `at home to ${O}`, away: `away at ${O}` }[s.loc];
        return {
            'winning': `${T}'s ${n}-game winning run ${vs} is over`,
            'unbeaten': `${T}'s ${n}-game unbeaten run ${vs} is over`,
            'draw': `${T}'s run of ${n} draws ${vs} is over`,
            'winless': s.loc === 'away'
                ? `${T} won at ${O} for the first time in ${n} visits`
                : `${T} beat ${O}${s.loc === 'home' ? ' at home' : ''} for the first time in ${n} ${games}`,
            'losing': `${T} avoided defeat ${vs} for the first time in ${n} ${games}`,
            'clean-sheet': `${T}'s run of ${n} clean sheets ${vs} is over`,
            'goals-conceded': `${T} kept a clean sheet ${vs} for the first time in ${n} ${games}`,
            'scoring': `${T} failed to score ${vs} for the first time in ${n} ${games}`,
            'no-score': `${T} scored ${vs} for the first time in ${n} ${games}`
        }[s.type];
    }

    // Why it's listed: a club record, its longest in 10+ years, rare for
    // the club, or rare in the league
    function pills(s) {
        const league = COMPETITIONS[s.div].name;
        const top = Math.max(0.1, Math.ceil((1 - s.pct) * 1000) / 10);
        const rare = `<span class="ss-pill rare" title="Longer than ${(s.pct * 100).toFixed(1)}% of ${escapeHtml(league)} runs of this kind since 1995">Top ${top}% in ${escapeHtml(league)}</span>`;
        if (s.kind === 'h2h') return `${rare}<span class="ss-pill h2h">Head-to-head</span>`;
        if (!s.longestSince) return '<span class="ss-pill record">Club record</span>';
        const years = (toDate(s.end) - toDate(s.longestSince)) / (365.25 * 86400000);
        if (years >= 10) return `<span class="ss-pill since">Longest since ${s.longestSince.slice(0, 4)}</span>`;
        if (s.source === 'club') {
            return `<span class="ss-pill since" title="In the top 2% of ${escapeHtml(s.team)}'s own runs of this kind over the last 20 years">Rare for ${escapeHtml(s.team)}</span>`;
        }
        return rare;
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
    // ended it
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
                .filter(m => m.date >= s.start && m.date <= s.end)
                .sort((a, b) => a.date.localeCompare(b.date));
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
        return `${s.team} longest ${s.loc === 'all' ? '' : `${s.loc} `}${SEARCH_TYPE_WORDS[s.type]} runs${s.opp ? ` vs ${s.opp}` : ''}`;
    }

    function streaksHref(s) {
        const comp = COMPETITIONS[s.div];
        const params = new URLSearchParams({ view: 'team-streaks', lg: comp.slug, t1: s.team });
        if (s.opp) params.set('t2', s.opp);
        params.set('status', 'historic');
        if (s.loc !== 'all') params.set('loc', s.loc);
        params.set('type', s.type);
        const tab = `${comp.page}?${params}`;
        if (!window.LeagueSearch) return tab;
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
        } else {
            body = `
                ${matchTable([loaded.ended], s)}
                <p class="streak-ended-note">The match that ended this ${s.count}-game run</p>
                ${matchTable(loaded.run, s)}`;
        }
        return `
            <div class="ss-matches">
                ${body}
                <div class="um-links"><a href="${escapeHtml(streaksHref(s))}">${escapeHtml(searchQuestion(s))} →</a></div>
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

    function render() {
        if (!els) return;
        const yearAgo = isoDaysAgo(WINDOW_DAYS);
        const all = state.streaks.filter(s => s.end > yearAgo && COMPETITIONS[s.div]);
        if (all.length === 0) {
            els.section.hidden = true;
            return;
        }
        els.section.hidden = false;

        const present = new Set(all.map(s => s.div));
        const chips = [['all', 'All'], ...COMPETITION_ORDER.filter(div => present.has(div)).map(div => [div, `${COMPETITIONS[div].flag} ${COMPETITIONS[div].name}`])];
        const filtered = all.filter(s => state.filterDiv === 'all' || s.div === state.filterDiv);
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        state.page = Math.min(Math.max(1, state.page), totalPages);
        const pageStart = (state.page - 1) * PAGE_SIZE;
        const pageStreaks = filtered.slice(pageStart, pageStart + PAGE_SIZE);
        const recentFrom = isoDaysAgo(RECENT_DAYS);

        const where = state.filterDiv === 'all' ? '' : ` in ${COMPETITIONS[state.filterDiv].name}`;
        const count = `${filtered.length} streak${filtered.length === 1 ? '' : 's'}${where} in the last year${totalPages > 1 ? ` - showing ${pageStart + 1}-${pageStart + pageStreaks.length}` : ''}`;
        // Previous / Page X of Y / Next, as Team Streaks' historic list
        const controls = totalPages > 1 ? `
            <div class="flex items-center justify-center gap-4 py-4">
                <button type="button" class="btn btn-secondary" data-page="-1" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
                <span class="text-sm text-gray-600">Page ${state.page} of ${totalPages}</span>
                <button type="button" class="btn btn-secondary" data-page="1" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
            </div>` : '';

        els.section.innerHTML = `
            <div class="ss-head">
                <h2 class="ss-title">Streaks snapped</h2>
                <p class="ss-sub">Notable runs that ended in the last year, newest first. Outlined: the last 7 days. Click one for its matches.</p>
            </div>
            <div class="um-filters ss-chips">
                ${chips.map(([div, label]) => `<button type="button" class="um-chip${state.filterDiv === div ? ' active' : ''}" data-div="${div}">${label}</button>`).join('')}
            </div>
            <p class="ss-count">${count}</p>
            ${pageStreaks.length
                ? `<div class="ss-list">${pageStreaks.map(s => entryHtml(s, recentFrom)).join('')}</div>`
                : `<p class="ss-empty">No notable streaks snapped${where} in the last year.</p>`}
            ${controls}`;
    }

    function toggle(key) {
        if (state.open.has(key)) {
            state.open.delete(key);
        } else {
            state.open.add(key);
            const streak = state.streaks.find(s => keyOf(s) === key);
            if (streak) loadMatches(streak);
        }
        render();
    }

    function handleClick(event) {
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
        } catch (err) {
            console.error('Snapped streaks failed:', err);
            state.streaks = [];
        }
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
        load();
    }

    window.SnappedStreaks = { mount };
})();
