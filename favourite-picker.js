// The favourite teams' chip in the home page's top bar, next to the dark
// mode toggle: "⭐ Pick your team", or the first club's crest and name (and
// "+2" for two more) once there are some. Clicking it opens a small panel
// listing the teams, each with a remove button, and the sport pages' team
// search box (combobox.js) to add another. The home page's cards read the
// teams through FavouriteTeam (favourite-team.js) and redraw on its
// onChange, so a change here shows everywhere at once.
//
// Exposes window.FavouritePicker = { mount(container?, before?), open() } - open()
// lets a card's "⭐ Your team" button with no team yet hand over to this
// panel. With a container (the sport pages' header, next to Search) the
// chip sits in it, before `before` if given, instead of fixed in the top
// bar.
// Needs team-registry.js, combobox.js and favourite-team.js.
(function () {
    'use strict';

    let els = null;
    let combobox = null;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    const crest = team => {
        const logo = TeamRegistry.getTeamLogoUrl(team, 'champions-league');
        // A crest that fails to load becomes the star (on a phone's sport
        // page the chip shows nothing else)
        return logo ? `<img src="${logo}" alt="" onerror="this.replaceWith('⭐')">` : '<span aria-hidden="true">⭐</span>';
    };

    function render() {
        const teams = FavouriteTeam.list();
        const team = teams[0] || '';
        const extra = teams.length - 1;
        els.chip.innerHTML = team
            ? `${crest(team)}<span class="fav-chip-name">${escapeHtml(team)}</span>${extra ? `<span class="fav-chip-more">+${extra}</span>` : ''}<span class="fav-chip-arrow" aria-hidden="true">▾</span>`
            : '<span aria-hidden="true">⭐</span><span class="fav-chip-name">Pick your team</span>';
        els.chip.setAttribute('aria-label', team ? `Your teams: ${teams.join(', ')}. Change them` : 'Pick your team');
        els.chip.classList.toggle('has-team', Boolean(team));

        els.list.innerHTML = teams.map(t => `
            <li class="fav-team">${crest(t)}<span class="fav-team-name">${escapeHtml(t)}</span><button type="button" class="fav-team-remove" data-remove="${escapeHtml(t)}" aria-label="Remove ${escapeHtml(t)}">×</button></li>`).join('');
        els.list.hidden = !teams.length;
        els.label.textContent = teams.length ? '⭐ Add another team' : '⭐ Your team';
        els.clear.hidden = teams.length < 2;
        // The box offers only clubs not picked yet
        if (combobox) {
            const picked = new Set(teams);
            combobox.setOptions(FavouriteTeam.allTeams().filter(t => !picked.has(t)).map(t => ({ value: t, text: t })));
            combobox.setValue('', '');
        }
    }

    function isOpen() {
        return !els.panel.hidden;
    }

    function open() {
        if (!els) return;
        els.panel.hidden = false;
        els.chip.setAttribute('aria-expanded', 'true');
        // Straight into typing; the box opens its list on focus - after
        // this click, which the box would otherwise take as one outside it
        // and close the list again
        setTimeout(() => els.input.focus(), 0);
    }

    function close() {
        els.panel.hidden = true;
        els.chip.setAttribute('aria-expanded', 'false');
    }

    function mount(container, before = null) {
        const root = document.createElement('div');
        root.className = container ? 'fav-picker fav-picker-inline' : 'fav-picker';
        root.innerHTML = `
            <button type="button" class="fav-chip" aria-expanded="false" aria-controls="favPanel"></button>
            <div class="fav-panel" id="favPanel" role="dialog" aria-label="Your team" hidden>
                <ul class="fav-teams" hidden></ul>
                <label class="fav-panel-label" for="favTeamInput">⭐ Your team</label>
                <div class="fav-panel-row">
                    <div class="combobox-container" id="favTeamContainer">
                        <input type="text" id="favTeamInput" class="combobox-input" placeholder="Search for a team" autocomplete="off">
                        <span class="combobox-arrow">▼</span>
                        <div class="combobox-dropdown" id="favTeamDropdown"></div>
                    </div>
                    <button type="button" class="fav-remove" hidden>Remove all</button>
                </div>
                <p class="fav-panel-note">Puts your clubs first in upcoming matches and on the home page. Remembered on this device only.</p>
            </div>`;
        (container || document.body).insertBefore(root, before);
        els = {
            root,
            chip: root.querySelector('.fav-chip'),
            panel: root.querySelector('.fav-panel'),
            input: root.querySelector('#favTeamInput'),
            list: root.querySelector('.fav-teams'),
            label: root.querySelector('.fav-panel-label'),
            clear: root.querySelector('.fav-remove')
        };

        // A pick is added and the panel stays open for the next one
        combobox = new TeamCombobox('favTeamContainer', 'favTeamInput', 'favTeamDropdown', 'Search for a team', value => {
            if (!value) return;
            FavouriteTeam.add(value);
        }, { logoLeague: 'champions-league', allowEmpty: false });

        els.chip.addEventListener('click', () => (isOpen() ? close() : open()));
        els.list.addEventListener('click', event => {
            const button = event.target.closest('[data-remove]');
            if (button) FavouriteTeam.remove(button.dataset.remove);
        });
        els.clear.addEventListener('click', () => {
            FavouriteTeam.clear();
            close();
        });
        // Outside click or Escape closes it - not the click on a card's
        // button that just opened it (data-fav-open), nor one on a remove
        // button that's gone by the time the click gets here
        document.addEventListener('click', event => {
            if (isOpen() && event.target.isConnected && !root.contains(event.target) && !event.target.closest('[data-fav-open]')) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && isOpen()) {
                close();
                els.chip.focus();
            }
        });

        FavouriteTeam.onChange(render);
        render();
    }

    window.FavouritePicker = { mount, open };
})();
