// The visitor's favourite teams: any number of clubs, in the order they
// were added, kept in this browser (localStorage) so the home page can
// lead with them; other cards and pages can read them the same way.
// Club names are the site's own (team-registry.js), which are the same in
// every competition, so one name finds a club's domestic and Champions
// League matches alike.
//
// Exposes window.FavouriteTeam = { list(), get(), has(team), add(team),
// remove(team), set(team), clear(), onChange(fn), allTeams(), resolve(text) }.
// get() is the first team, set(team) makes it the only one; onChange's
// listeners get the new list. Needs team-registry.js.
(function () {
    'use strict';

    // A JSON list; one team picked before there could be several was
    // stored as its plain name, and still reads as a list of one
    const STORAGE_KEY = 'favouriteTeam';
    const listeners = new Set();
    let teams = null;

    // Storage can be missing or refuse (a private window, blocked site
    // data) - then the favourites last until the page closes
    let memory = [];
    function read() {
        let raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch (err) {
            return memory;
        }
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(team => typeof team === 'string') : [];
        } catch (err) {
            return [raw];
        }
    }
    function write(list) {
        memory = list;
        try {
            if (list.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            else localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            // kept in memory above
        }
    }

    // Every club in the registry, A-Z, each once
    function allTeams() {
        if (!teams) {
            const names = new Set();
            Object.values(getTeamColors()).forEach(list => list.forEach(([name]) => names.add(name)));
            teams = [...names].sort((a, b) => a.localeCompare(b));
        }
        return teams;
    }

    const fold = text => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

    // A typed name as a club: exact (ignoring case and accents), then the
    // only club whose name starts with it, then the only one containing it
    // ("arsenal" -> Arsenal FC, "munchen" -> Bayern München)
    function resolve(text) {
        const wanted = fold(text);
        if (!wanted) return '';
        const list = allTeams();
        const exact = list.find(team => fold(team) === wanted);
        if (exact) return exact;
        const starts = list.filter(team => fold(team).startsWith(wanted));
        if (starts.length === 1) return starts[0];
        const contains = list.filter(team => fold(team).includes(wanted));
        return contains.length === 1 ? contains[0] : '';
    }

    // Only clubs the registry still knows, each once
    function list() {
        const known = allTeams();
        return [...new Set(read())].filter(team => known.includes(team));
    }

    function save(next) {
        if (next.join('\n') === list().join('\n')) return;
        write(next);
        listeners.forEach(fn => fn(next.slice()));
    }

    const isTeam = team => Boolean(team) && allTeams().includes(team);

    window.FavouriteTeam = {
        list,
        get: () => list()[0] || '',
        has: team => list().includes(team),
        add: team => { if (isTeam(team) && !list().includes(team)) save([...list(), team]); },
        remove: team => save(list().filter(t => t !== team)),
        set: team => save(isTeam(team) ? [team] : []),
        clear: () => save([]),
        onChange: fn => listeners.add(fn),
        allTeams,
        resolve
    };
})();
