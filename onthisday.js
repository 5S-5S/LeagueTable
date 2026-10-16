// On this day on the home page (index.html): a card between the search card
// and the streaks card with matches played on today's date in earlier
// years, in the five leagues and the Champions League. It fills the days
// without matches (international breaks, the summer).
//
// Two views, as the streaks card's toggle:
// - Notable: the day's standout matches - finals and semi-finals, big wins,
//   high scores, the big clubs meeting or one of them beaten, shootouts,
//   round anniversaries - varied so one league or club doesn't fill it.
// - Your team: every match the visitor's favourite team (favourite-team.js)
//   played on this day, newest first. Picking a team switches to it.
// Each match opens into links to the tools that answer it: the full
// head-to-head, every match that day, and (a league) the table that day -
// through the search, so they open as answers.
//
// The matches come from /api/on-this-day (the visitor's own date). Needs
// team-registry.js, favourite-team.js, and search.js for the links.
(function () {
    'use strict';

    const API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';
    const NOTABLE_PAGE = 6;
    const TEAM_PAGE = 10;
    // The notable list stops at matches that stand out at all
    const NOTABLE_MAX = 30;

    const COMPETITIONS = {
        E0: { slug: 'premier-league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', page: 'DomesticEurope.html' },
        SP1: { slug: 'la-liga', name: 'La Liga', flag: '🇪🇸', page: 'DomesticEurope.html' },
        I1: { slug: 'serie-a', name: 'Serie A', flag: '🇮🇹', page: 'DomesticEurope.html' },
        D1: { slug: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', page: 'DomesticEurope.html' },
        F1: { slug: 'ligue-1', name: 'Ligue 1', flag: '🇫🇷', page: 'DomesticEurope.html' },
        C1: { slug: 'champions-league', name: 'Champions League', flag: '🇪🇺', page: 'ContinentalEurope.html' }
    };

    // The clubs whose meetings (and defeats) make a match stand out
    const BIG_CLUBS = new Set([
        'Arsenal FC', 'Chelsea FC', 'Liverpool FC', 'Manchester City', 'Manchester United', 'Tottenham Hotspur',
        'Real Madrid', 'FC Barcelona', 'Atlético Madrid', 'Bayern München', 'Borussia Dortmund',
        'Juventus', 'Inter', 'AC Milan', 'AS Roma', 'SSC Napoli', 'Paris Saint-Germain', 'Olympique Marseille',
        'AFC Ajax', 'SL Benfica', 'FC Porto'
    ]);

    const phoneQuery = window.matchMedia('(max-width: 640px)');

    const state = {
        md: '',             // 'MM-DD', the visitor's today
        matches: null,      // null while loading
        failed: false,
        view: 'notable',    // 'notable' | 'team'
        shown: NOTABLE_PAGE,
        picking: false,     // the team box is open
        open: new Set()
    };
    let els = null;

    // --- Helpers ----------------------------------------------------------

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ISO dates are calendar days: noon UTC keeps them on the same day in
    // every timezone
    const toDate = iso => new Date(`${iso}T12:00:00Z`);
    const fullDate = iso => toDate(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    // Written out the way the search reads a date ("15 October 2005")
    const searchDate = iso => {
        const d = toDate(iso);
        return `${d.getUTCDate()} ${d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })} ${d.getUTCFullYear()}`;
    };
    const dayAndMonth = md => toDate(`2000-${md}`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' });

    function todayMd() {
        const d = new Date();
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const yearsAgo = m => new Date().getFullYear() - Number(m.date.slice(0, 4));
    const keyOf = m => `${m.div}|${m.date}|${m.homeTeam}|${m.awayTeam}`;

    function teamStyle(team, div) {
        const color = getTeamColor(team, COMPETITIONS[div].slug);
        return color ? `color: ${pickTeamTextColor(color, '')} !important;` : '';
    }

    const teamName = (team, div) => `<span style="${teamStyle(team, div)}">${escapeHtml(team)}</span>`;

    function crest(team, div) {
        const url = getTeamLogoUrl(team, COMPETITIONS[div].slug);
        return url ? `<img src="${url}" alt="" title="${escapeHtml(team)}" onerror="this.style.display='none'">` : '';
    }

    // The competition's name when the match was played: the First
    // Division before the Premier League, and so on
    const OLD_NAMES = { E0: ['1992-08-01', 'First Division'], F1: ['2002-07-01', 'Division 1'], C1: ['1992-07-01', 'European Cup'] };
    function competitionName(m) {
        const old = OLD_NAMES[m.div];
        return old && m.date < old[0] ? old[1] : COMPETITIONS[m.div].name;
    }

    // "Final", "Semi-Finals", "Group Stage" - with qualifiers said so
    function stageLabel(m) {
        if (m.div !== 'C1' || !m.competitionPhase) return '';
        return m.isQualifier && !/\(Q\)|qualif/i.test(m.competitionPhase) ? `${m.competitionPhase} (Q)` : m.competitionPhase;
    }

    const shootout = m => /pso/i.test(m.additionalInfo || '');

    // --- What makes a match stand out ---------------------------------------

    // A score and the reasons for it, each reason a pill
    function notability(m) {
        const margin = Math.abs(m.homeGoals - m.awayGoals);
        const total = m.homeGoals + m.awayGoals;
        const phase = m.div === 'C1' && !m.isQualifier ? (m.competitionPhase || '') : '';
        const reasons = [];
        let score = 0;
        if (/^final$/i.test(phase)) {
            score += 40;
            reasons.push(['final', 'Final']);
        } else if (/semi/i.test(phase)) {
            score += 15;
            reasons.push(['stage', 'Semi-final']);
        } else if (/quarter/i.test(phase)) {
            score += 6;
            reasons.push(['stage', 'Quarter-final']);
        }
        if (shootout(m)) {
            score += 8;
            reasons.push(['stage', 'Penalties']);
        }
        // Goals count up to a point, so a 10-1 doesn't bury everything else
        if (margin >= 4) {
            score += Math.min(margin - 3, 4) * 5;
            reasons.push(['goals', `${margin}-goal win`]);
        }
        if (total >= 7) {
            score += Math.min(total - 6, 4) * 4;
            reasons.push(['goals', `${total} goals`]);
        }
        const homeBig = BIG_CLUBS.has(m.homeTeam);
        const awayBig = BIG_CLUBS.has(m.awayTeam);
        if (homeBig && awayBig) {
            score += 14;
            reasons.push(['big', 'Big match']);
        } else if (margin >= 2) {
            // A big club beaten by one that isn't: by three or more, or by
            // two at home
            const homeLost = m.homeGoals < m.awayGoals;
            const loser = homeLost ? m.homeTeam : m.awayTeam;
            if (BIG_CLUBS.has(loser) && (margin >= 3 || homeLost)) {
                score += 6 + margin * 3;
                reasons.push(['upset', 'Upset']);
            }
        }
        const years = yearsAgo(m);
        const round = [50, 25, 10].find(n => years % n === 0);
        if (round && score > 0) {
            score += { 50: 10, 25: 7, 10: 4 }[round];
            reasons.push(['anniversary', `${years} years ago`]);
        }
        // A standout match people remember counts for a little more: up to
        // 8 for this season's, nothing from 60 years back
        if (score > 0) score += Math.max(0, 8 - years / 7.5);
        return { score, reasons };
    }

    // The notable list: the highest scores, but no more than two from one
    // competition and no club twice until the list runs out of others
    function notableList() {
        const scored = state.matches
            .map(m => ({ m, ...notability(m) }))
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score ||
                (b.m.homeGoals + b.m.awayGoals) - (a.m.homeGoals + a.m.awayGoals) ||
                a.m.date.localeCompare(b.m.date));
        const picked = [];
        const perDiv = {};
        const clubs = new Set();
        const rest = [];
        scored.forEach(x => {
            const fresh = (perDiv[x.m.div] || 0) < 2 && !clubs.has(x.m.homeTeam) && !clubs.has(x.m.awayTeam);
            if (fresh && picked.length < NOTABLE_PAGE) {
                picked.push(x);
                perDiv[x.m.div] = (perDiv[x.m.div] || 0) + 1;
                clubs.add(x.m.homeTeam);
                clubs.add(x.m.awayTeam);
            } else {
                rest.push(x);
            }
        });
        return [...picked, ...rest].slice(0, NOTABLE_MAX);
    }

    function teamList(team) {
        return state.matches
            .filter(m => m.homeTeam === team || m.awayTeam === team)
            .map(m => ({ m, ...notability(m) }));
    }

    // --- One match ----------------------------------------------------------

    // The favourite's result in words; otherwise the score as it stood
    function headline(m, team) {
        const score = `${m.homeGoals}-${m.awayGoals}`;
        if (!team) return `${teamName(m.homeTeam, m.div)} <span class="otd-score">${score}</span> ${teamName(m.awayTeam, m.div)}`;
        const home = m.homeTeam === team;
        const opp = home ? m.awayTeam : m.homeTeam;
        const mine = home ? m.homeGoals : m.awayGoals;
        const theirs = home ? m.awayGoals : m.homeGoals;
        const at = home ? 'at home to' : 'away at';
        const T = teamName(team, m.div);
        const O = teamName(opp, m.div);
        if (mine > theirs) return `${T} beat ${O} <span class="otd-score">${mine}-${theirs}</span> ${home ? 'at home' : 'away'}`;
        if (mine < theirs) return `${T} lost <span class="otd-score">${mine}-${theirs}</span> ${at} ${O}`;
        return `${T} drew <span class="otd-score">${mine}-${theirs}</span> ${at} ${O}`;
    }

    // A search question's answer, as the streaks card links them; the
    // fallback when the search doesn't take it
    function searchHref(question, slug, kind, fallback) {
        if (!window.LeagueSearch) return fallback;
        const result = (LeagueSearch.searchFor(question, slug).results || [])[0];
        if (!result || result.kind !== kind) return fallback;
        return `${result.href}&${new URLSearchParams({ search: result.kind, q: question, scope: slug })}`;
    }

    function links(m) {
        const comp = COMPETITIONS[m.div];
        const name = competitionName(m);
        const day = searchDate(m.date);
        const pairQuestion = `${m.homeTeam} vs ${m.awayTeam}`;
        const dayQuestion = `${name} results on ${day}`;
        const tableQuestion = `${name} table on ${day}`;
        const pair = new URLSearchParams({ view: 'league-filters', lg: comp.slug, t1: m.homeTeam, t2: m.awayTeam });
        const onDay = new URLSearchParams({ view: 'match-finder', lg: comp.slug, from: m.date, to: m.date, cat: 'recent' });
        const items = [
            [searchHref(pairQuestion, comp.slug, 'h2h', `${comp.page}?${pair}`), `${m.homeTeam} v ${m.awayTeam}: every meeting`],
            [searchHref(dayQuestion, comp.slug, 'match-finder', `${comp.page}?${onDay}`), `Every ${name} match on ${day}`]
        ];
        if (m.div !== 'C1') {
            const table = searchHref(tableQuestion, comp.slug, 'table', '');
            if (table) items.push([table, `The ${name} table that day`]);
        }
        return `<div class="ss-matches"><div class="um-links">${items.map(([href, text]) => `<a href="${escapeHtml(href)}">${escapeHtml(text)} →</a>`).join('')}</div></div>`;
    }

    function entryHtml({ m, reasons }, team) {
        const key = keyOf(m);
        const open = state.open.has(key);
        const comp = COMPETITIONS[m.div];
        const stage = stageLabel(m);
        const years = yearsAgo(m);
        // The anniversary pill says the years; the date line says them otherwise
        const shownReasons = reasons.filter(([kind]) => !team || kind !== 'anniversary');
        const anniversary = reasons.some(([kind]) => kind === 'anniversary');
        return `
            <div class="ss-item${open ? ' open' : ''}" data-key="${escapeHtml(key)}">
                <div class="ss-summary" role="button" tabindex="0" aria-expanded="${open}">
                    <div class="ss-crests otd-crests">${crest(m.homeTeam, m.div)}${crest(m.awayTeam, m.div)}</div>
                    <div class="ss-text">
                        <div class="ss-headline">${headline(m, team)}</div>
                        ${shownReasons.length ? `<div class="ss-meta">${shownReasons.map(([kind, label]) => `<span class="ss-pill otd-${kind}">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
                        <div class="ss-meta">
                            <span>${comp.flag} ${escapeHtml(competitionName(m))}${stage ? ` · ${escapeHtml(stage)}` : ''}</span>
                            <span>${escapeHtml(fullDate(m.date))}${anniversary && !team ? '' : ` · ${years} year${years === 1 ? '' : 's'} ago`}</span>
                        </div>
                    </div>
                    <span class="ss-chevron" aria-hidden="true">▶</span>
                </div>
                ${open ? links(m) : ''}
            </div>`;
    }

    // --- The card ---------------------------------------------------------------

    function pickerHtml(team) {
        if (!state.picking) {
            return `<button type="button" class="otd-pick" data-pick>${team ? 'Change team' : '⭐ Pick your team'}</button>`;
        }
        return `
            <form class="otd-picker" data-picker>
                <label class="otd-picker-label" for="otdTeamInput">Your team</label>
                <input id="otdTeamInput" class="otd-input" list="otdTeams" autocomplete="off" placeholder="Type a club, e.g. Arsenal" value="${escapeHtml(team)}">
                <datalist id="otdTeams">${FavouriteTeam.allTeams().map(name => `<option value="${escapeHtml(name)}">`).join('')}</datalist>
                <button type="submit" class="otd-pick">Save</button>
                ${team ? '<button type="button" class="otd-pick otd-clear" data-clear>Remove</button>' : ''}
                <button type="button" class="otd-pick otd-clear" data-cancel>Cancel</button>
                <p class="otd-picker-note" data-note></p>
            </form>`;
    }

    function render() {
        if (!els) return;
        if (state.failed || (state.matches && state.matches.length === 0)) {
            // Nothing played on this day in any year (or no answer): no card
            els.section.hidden = true;
            return;
        }
        els.section.hidden = false;
        const team = FavouriteTeam.get();
        const teamView = state.view === 'team' && team;
        const day = dayAndMonth(state.md);

        let body;
        if (!state.matches) {
            body = '<p class="ss-loading">Loading the matches...</p>';
        } else {
            const all = teamView ? teamList(team) : notableList();
            const shown = all.slice(0, state.shown);
            const more = all.length - shown.length;
            const count = teamView
                ? `${all.length} match${all.length === 1 ? '' : 'es'} on ${day}, newest first`
                : `The ${shown.length === 1 ? 'standout match' : `${shown.length} standout matches`} of the ${state.matches.length.toLocaleString()} played on ${day}`;
            body = all.length
                ? `<p class="ss-count">${escapeHtml(count)}</p>
                   <div class="ss-list">${shown.map(x => entryHtml(x, teamView ? team : '')).join('')}</div>
                   ${more > 0 ? `<div class="otd-more"><button type="button" class="btn btn-secondary" data-more>Show ${Math.min(more, teamView ? TEAM_PAGE : NOTABLE_PAGE)} more</button></div>` : ''}`
                : `<p class="ss-empty">${teamView
                    ? `${escapeHtml(team)} haven't played on ${escapeHtml(day)} in these competitions. Switch to Notable for the day's standout matches.`
                    : `Nothing stands out among the matches played on ${escapeHtml(day)}.`}</p>`;
        }

        const views = [['notable', 'Notable'], ['team', team ? `⭐ ${team}` : '⭐ Your team']];
        els.section.innerHTML = `
            <div class="ss-head">
                <div class="ss-title-row">
                    <h2 class="ss-title">On this day · ${escapeHtml(day)}</h2>
                    <div class="ss-views" role="group" aria-label="Which matches">
                        ${views.map(([view, label]) => `<button type="button" class="${state.view === view ? 'active' : ''}" data-view="${view}" aria-pressed="${state.view === view}">${escapeHtml(label)}</button>`).join('')}
                    </div>
                </div>
                <p class="ss-sub">${teamView
                    ? `Every match ${escapeHtml(team)} played on ${escapeHtml(day)}. Click one for its head-to-head and that day's matches.`
                    : `Finals, big wins, high scores and upsets from ${escapeHtml(day)} in years gone by. Click one for its head-to-head and that day's matches.`}</p>
                ${state.view === 'team' || state.picking ? `<div class="otd-team-row">${pickerHtml(team)}</div>` : ''}
            </div>
            ${state.view === 'team' && !team && !state.picking ? '' : body}`;

        if (state.picking) {
            const input = els.section.querySelector('#otdTeamInput');
            input.focus();
            input.select();
        }
    }

    function toggle(key) {
        if (state.open.has(key)) state.open.delete(key);
        else state.open.add(key);
        render();
    }

    function setView(view) {
        state.view = view;
        state.shown = view === 'team' ? TEAM_PAGE : NOTABLE_PAGE;
        state.open.clear();
        // No team yet: the team view opens on the picker
        state.picking = view === 'team' && !FavouriteTeam.get();
        render();
    }

    function handleClick(event) {
        const viewButton = event.target.closest('[data-view]');
        if (viewButton) {
            if (state.view !== viewButton.dataset.view) setView(viewButton.dataset.view);
            return;
        }
        if (event.target.closest('[data-pick]')) {
            state.picking = true;
            render();
            return;
        }
        if (event.target.closest('[data-cancel]')) {
            state.picking = false;
            if (!FavouriteTeam.get()) setView('notable');
            else render();
            return;
        }
        if (event.target.closest('[data-clear]')) {
            state.picking = false;
            FavouriteTeam.clear();
            setView('notable');
            return;
        }
        if (event.target.closest('[data-more]')) {
            state.shown += state.view === 'team' ? TEAM_PAGE : NOTABLE_PAGE;
            render();
            return;
        }
        if (event.target.closest('.um-links a')) return;
        if (event.target.closest('[data-picker]')) return;
        const summary = event.target.closest('.ss-summary');
        if (summary) toggle(summary.parentElement.dataset.key);
    }

    function handleSubmit(event) {
        const form = event.target.closest('[data-picker]');
        if (!form) return;
        event.preventDefault();
        const typed = form.querySelector('#otdTeamInput').value;
        const team = FavouriteTeam.resolve(typed);
        if (!team) {
            form.querySelector('[data-note]').textContent = typed.trim()
                ? `No single club matches "${typed.trim()}" - pick one from the list.`
                : 'Type a club\'s name.';
            return;
        }
        state.picking = false;
        FavouriteTeam.set(team);
        setView('team');
    }

    function handleKey(event) {
        if (event.key === 'Escape' && state.picking) {
            state.picking = false;
            if (!FavouriteTeam.get()) setView('notable');
            else render();
            return;
        }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const summary = event.target.closest('.ss-summary');
        if (!summary) return;
        event.preventDefault();
        toggle(summary.parentElement.dataset.key);
    }

    async function load() {
        state.md = todayMd();
        render();
        try {
            const res = await fetch(`${API_BASE}/api/on-this-day?md=${state.md}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            state.matches = (data.matches || []).filter(m => COMPETITIONS[m.div]);
        } catch (err) {
            console.error('On this day failed:', err);
            state.failed = true;
        }
        render();
    }

    // section: the card's element (a .search-card, so it hides with the
    // search card while a match is open)
    function mount(section) {
        els = { section };
        section.hidden = true;
        // Opens on the favourite's matches when there is one
        state.view = FavouriteTeam.get() ? 'team' : 'notable';
        state.shown = state.view === 'team' ? TEAM_PAGE : NOTABLE_PAGE;
        section.addEventListener('click', handleClick);
        section.addEventListener('submit', handleSubmit);
        section.addEventListener('keydown', handleKey);
        // Team text colors depend on the theme
        new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        phoneQuery.addEventListener('change', render);
        FavouriteTeam.onChange(render);
        load();
    }

    window.OnThisDay = { mount };
})();
