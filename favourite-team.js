// The visitor's favourite team: one club, kept in this browser
// (localStorage) so the home page can lead with it - On this day
// (onthisday.js) first; other cards and pages can read it the same way.
// Club names are the site's own (team-registry.js), which are the same in
// every competition, so one name finds a club's domestic and Champions
// League matches alike.
//
// Exposes window.FavouriteTeam = { get(), set(team), clear(), onChange(fn),
// allTeams(), resolve(text) }. Needs team-registry.js.
(function () {
    'use strict';

    const STORAGE_KEY = 'favouriteTeam';
    const listeners = new Set();
    let teams = null;

    // Storage can be missing or refuse (a private window, blocked site
    // data) - then the favourite lasts until the page closes
    let memory = '';
    function read() {
        try {
            return localStorage.getItem(STORAGE_KEY) || '';
        } catch (err) {
            return memory;
        }
    }
    function write(team) {
        memory = team;
        try {
            if (team) localStorage.setItem(STORAGE_KEY, team);
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

    function get() {
        const team = read();
        return team && allTeams().includes(team) ? team : '';
    }

    function set(team) {
        const value = team && allTeams().includes(team) ? team : '';
        if (value === get()) return;
        write(value);
        listeners.forEach(fn => fn(value));
    }

    window.FavouriteTeam = {
        get,
        set,
        clear: () => set(''),
        onChange: fn => listeners.add(fn),
        allTeams,
        resolve
    };
})();
