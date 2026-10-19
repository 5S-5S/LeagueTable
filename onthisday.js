// On this day on the home page (index.html): a card between the search card
// and the streaks card with matches played on today's date in earlier
// years, in the five leagues and the Champions League. It fills the days
// without matches (international breaks, the summer).
//
// Two views, as the streaks card's toggle:
// - Notable: the day's standout matches - finals and semi-finals, big wins,
//   high scores, shootouts, notable streaks ended - varied so one league or
//   club doesn't fill it. Only facts are labelled (the stage, a shootout,
//   the streak a match ended); nothing that depends on how strong a club
//   was then.
// - Your team(s): every match the visitor's favourite teams
//   (favourite-team.js, picked with the top bar's chip) played on this
//   day, all together, newest first.
// A match that ended a notable streak says so, as the snapped streaks card
// words it (snapped.js), with a link to the run in Team Streaks. Each match
// opens into links to the tools that answer it: the full head-to-head,
// every match that day, and (a league) the table that day - through the
// search, so they open as answers.
//
// The matches and streaks come from /api/on-this-day (the visitor's own
// date; the streaks from the snapped-streaks job). Needs team-registry.js,
// favourite-team.js, favourite-picker.js, snapped.js, and search.js for the
// links.
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

    const state = {
        md: '',             // 'MM-DD', the visitor's today
        matches: null,      // null while loading
        streaks: new Map(), // match key -> the notable streaks it ended, strongest first
        failed: false,
        view: 'notable',    // 'notable' | 'team'
        shown: NOTABLE_PAGE,
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

    // Rare in the league and long counts most; a club record only when the
    // run was long too (5 home draws can be one)
    function streakStrength(s) {
        return (s.pct >= 0.995 ? 6 : 0) + (!s.longestSince && s.count >= 8 ? 6 : 0) + Math.min(s.count, 25) / 2;
    }

    // A score and the reasons for it, each reason a pill - big wins, high
    // scores and streaks rank a match without a pill of their own
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
        if (margin >= 4) score += Math.min(margin - 3, 4) * 5;
        if (total >= 7) score += Math.min(total - 6, 4) * 4;
        // A notable streak it ended (the strongest): more for a club record
        // and a long run
        const ended = state.streaks.get(keyOf(m));
        if (ended) score += 6 + streakStrength(ended[0]) + (ended.length - 1) * 2;
        // A standout match people remember counts for a little more: up to
        // 8 for this season's, nothing from 60 years back
        if (score > 0) score += Math.max(0, 8 - yearsAgo(m) / 7.5);
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

    // Each match told from the side of the first of the teams in it (the
    // order they were added)
    function teamList(teams) {
        return state.matches
            .filter(m => teams.includes(m.homeTeam) || teams.includes(m.awayTeam))
            .map(m => ({ m, ...notability(m), team: teams.find(team => team === m.homeTeam || team === m.awayTeam) }));
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
        // The runs it ended, in Team Streaks' historic list
        if (window.SnappedStreaks && SnappedStreaks.streaksHref) {
            (state.streaks.get(keyOf(m)) || []).slice(0, 2).forEach(s => {
                items.push([SnappedStreaks.streaksHref(s), SnappedStreaks.searchQuestion(s)]);
            });
        }
        return `<div class="ss-matches"><div class="um-links">${items.map(([href, text]) => `<a href="${escapeHtml(href)}">${escapeHtml(text)} →</a>`).join('')}</div></div>`;
    }

    function entryHtml({ m, reasons }, team) {
        const key = keyOf(m);
        const open = state.open.has(key);
        const comp = COMPETITIONS[m.div];
        const stage = stageLabel(m);
        const years = yearsAgo(m);
        // The streaks it ended (two at most), as the snapped streaks card
        // words them
        const ended = (state.streaks.get(key) || []).slice(0, 2);
        const streakLines = window.SnappedStreaks && SnappedStreaks.headline ? ended.map(s => `
                        <div class="otd-streak">
                            <div class="otd-streak-text">${SnappedStreaks.headline(s)}</div>
                            <div class="ss-meta">${SnappedStreaks.pills(s, competitionName({ div: s.div, date: s.end }) + (s.stage ? ` ${SnappedStreaks.stageWord(s)}` : ''))}</div>
                        </div>`).join('') : '';
        return `
            <div class="ss-item${open ? ' open' : ''}" data-key="${escapeHtml(key)}">
                <div class="ss-summary" role="button" tabindex="0" aria-expanded="${open}">
                    <div class="ss-crests otd-crests">${crest(m.homeTeam, m.div)}${crest(m.awayTeam, m.div)}</div>
                    <div class="ss-text">
                        <div class="ss-headline">${headline(m, team)}</div>
                        ${reasons.length ? `<div class="ss-meta">${reasons.map(([kind, label]) => `<span class="ss-pill otd-${kind}">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
                        <div class="ss-meta">
                            <span>${comp.flag} ${escapeHtml(competitionName(m))}${stage ? ` · ${escapeHtml(stage)}` : ''}</span>
                            <span>${escapeHtml(fullDate(m.date))} · ${years} year${years === 1 ? '' : 's'} ago</span>
                        </div>
                        ${streakLines}
                    </div>
                    <span class="ss-chevron" aria-hidden="true">▶</span>
                </div>
                ${open ? links(m) : ''}
            </div>`;
    }

    // --- The card ---------------------------------------------------------------

    // The heading and the list; the team row in between stays put (its
    // search box keeps its state) and only shows in the team view
    function render() {
        if (!els) return;
        if (state.failed || (state.matches && state.matches.length === 0)) {
            // Nothing played on this day in any year (or no answer): no card
            els.section.hidden = true;
            return;
        }
        els.section.hidden = false;
        const teams = FavouriteTeam.list();
        const team = teams[0] || '';
        const several = teams.length > 1;
        const teamView = state.view === 'team';
        const day = dayAndMonth(state.md);

        const views = [['notable', 'Notable'], ['team', several ? '⭐ Your teams' : team ? `⭐ ${team}` : '⭐ Your team']];
        els.head.innerHTML = `
            <div class="ss-title-row">
                <h2 class="ss-title">On this day · ${escapeHtml(day)}</h2>
                <div class="ss-views" role="group" aria-label="Which matches">
                    ${views.map(([view, label]) => `<button type="button" class="${state.view === view ? 'active' : ''}" data-view="${view}" aria-pressed="${state.view === view}">${escapeHtml(label)}</button>`).join('')}
                </div>
            </div>
            <p class="ss-sub">${teamView
                ? (several ? `Every match your teams played on ${escapeHtml(day)}. Click one for its head-to-head and that day's matches.`
                    : team ? `Every match ${escapeHtml(team)} played on ${escapeHtml(day)}. Click one for its head-to-head and that day's matches.`
                    : `Pick your team to see every match it played on ${escapeHtml(day)}. It's remembered on this device.`)
                : `Finals, big wins, high scores and the notable streaks that ended on ${escapeHtml(day)} in years gone by. Click one for its head-to-head and that day's matches.`}</p>`;

        // No team yet: the top bar chip's panel
        if (teamView && !team) {
            els.body.innerHTML = '<div class="ss-pick"><button type="button" class="btn btn-secondary" data-fav-open>⭐ Pick your team</button></div>';
            return;
        }
        if (!state.matches) {
            els.body.innerHTML = '<p class="ss-loading">Loading the matches...</p>';
            return;
        }
        const all = teamView ? teamList(teams) : notableList();
        const shown = all.slice(0, state.shown);
        const more = all.length - shown.length;
        const count = teamView
            ? `${all.length} match${all.length === 1 ? '' : 'es'} on ${day}, newest first`
            : `The ${shown.length === 1 ? 'standout match' : `${shown.length} standout matches`} of the ${state.matches.length.toLocaleString()} played on ${day}`;
        els.body.innerHTML = all.length
            ? `<p class="ss-count">${escapeHtml(count)}</p>
               <div class="ss-list">${shown.map(x => entryHtml(x, teamView ? x.team : '')).join('')}</div>
               ${more > 0 ? `<div class="otd-more"><button type="button" class="btn btn-secondary" data-more>Show ${Math.min(more, teamView ? TEAM_PAGE : NOTABLE_PAGE)} more</button></div>` : ''}`
            : `<p class="ss-empty">${teamView
                ? `${several ? 'Your teams' : escapeHtml(team)} haven't played on ${escapeHtml(day)} in these competitions. Switch to Notable for the day's standout matches.`
                : `Nothing stands out among the matches played on ${escapeHtml(day)}.`}</p>`;
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
        render();
    }

    function handleClick(event) {
        const viewButton = event.target.closest('[data-view]');
        if (viewButton) {
            if (state.view !== viewButton.dataset.view) setView(viewButton.dataset.view);
            return;
        }
        // No team yet: the top bar's chip opens its panel
        if (event.target.closest('[data-fav-open]')) {
            if (window.FavouritePicker) FavouritePicker.open();
            return;
        }
        if (event.target.closest('[data-more]')) {
            state.shown += state.view === 'team' ? TEAM_PAGE : NOTABLE_PAGE;
            render();
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
        state.md = todayMd();
        render();
        try {
            const res = await fetch(`${API_BASE}/api/on-this-day?md=${state.md}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            state.matches = (data.matches || []).filter(m => COMPETITIONS[m.div]);
            // Each streak under the match that ended it
            (data.streaks || []).filter(s => COMPETITIONS[s.div] && s.endedBy).forEach(s => {
                const key = keyOf({ div: s.div, ...s.endedBy });
                if (!state.streaks.has(key)) state.streaks.set(key, []);
                state.streaks.get(key).push(s);
            });
            state.streaks.forEach(list => list.sort((a, b) => streakStrength(b) - streakStrength(a)));
        } catch (err) {
            console.error('On this day failed:', err);
            state.failed = true;
        }
        render();
    }

    // section: the card's element (a .search-card, so it hides with the
    // search card while a match is open)
    function mount(section) {
        section.hidden = true;
        section.innerHTML = `
            <div class="ss-head" data-head></div>
            <div data-body></div>`;
        els = {
            section,
            head: section.querySelector('[data-head]'),
            body: section.querySelector('[data-body]')
        };
        // Opens on the favourites' matches when there are any
        state.view = FavouriteTeam.list().length ? 'team' : 'notable';
        state.shown = state.view === 'team' ? TEAM_PAGE : NOTABLE_PAGE;
        section.addEventListener('click', handleClick);
        section.addEventListener('keydown', handleKey);
        // Team text colors depend on the theme
        new MutationObserver(render).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
        // A pick (the top bar's chip) shows the teams' matches; removing
        // the last one goes back to the day's notable ones
        FavouriteTeam.onChange(teams => {
            state.view = teams.length ? 'team' : 'notable';
            state.shown = teams.length ? TEAM_PAGE : NOTABLE_PAGE;
            state.open.clear();
            render();
        });
        load();
    }

    window.OnThisDay = { mount };
})();
