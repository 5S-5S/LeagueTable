// The favourite team's chip in the home page's top bar, next to the dark
// mode toggle: "⭐ Pick your team", or the club's crest and name once one
// is picked. Clicking it opens a small panel with the sport pages' team
// search box (combobox.js) and Remove. The home page's cards read the
// pick through FavouriteTeam (favourite-team.js) and redraw on its
// onChange, so a pick here shows everywhere at once - On this day's own
// "Your team" box stays as a second way in.
//
// Exposes window.FavouritePicker = { mount(), open() } - open() lets a
// card's "⭐ Your team" button with no team yet hand over to this panel.
// Needs team-registry.js, combobox.js and favourite-team.js.
(function () {
    'use strict';

    let els = null;
    let combobox = null;

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function renderChip() {
        const team = FavouriteTeam.get();
        const logo = team ? getTeamLogoUrl(team, 'champions-league') : '';
        els.chip.innerHTML = team
            ? `${logo ? `<img src="${logo}" alt="" onerror="this.remove()">` : '<span aria-hidden="true">⭐</span>'}<span class="fav-chip-name">${escapeHtml(team)}</span><span class="fav-chip-arrow" aria-hidden="true">▾</span>`
            : '<span aria-hidden="true">⭐</span><span class="fav-chip-name">Pick your team</span>';
        els.chip.setAttribute('aria-label', team ? `Your team: ${team}. Change it` : 'Pick your team');
        els.chip.classList.toggle('has-team', Boolean(team));
        els.remove.hidden = !team;
        if (combobox && combobox.currentValue !== team) combobox.setValue(team, team);
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

    function mount() {
        const root = document.createElement('div');
        root.className = 'fav-picker';
        root.innerHTML = `
            <button type="button" class="fav-chip" aria-expanded="false" aria-controls="favPanel"></button>
            <div class="fav-panel" id="favPanel" role="dialog" aria-label="Your team" hidden>
                <label class="fav-panel-label" for="favTeamInput">⭐ Your team</label>
                <div class="fav-panel-row">
                    <div class="combobox-container" id="favTeamContainer">
                        <input type="text" id="favTeamInput" class="combobox-input" placeholder="Search for a team" autocomplete="off">
                        <span class="combobox-arrow">▼</span>
                        <div class="combobox-dropdown" id="favTeamDropdown"></div>
                    </div>
                    <button type="button" class="fav-remove" hidden>Remove</button>
                </div>
                <p class="fav-panel-note">Puts your club first on the home page. Remembered on this device only.</p>
            </div>`;
        document.body.appendChild(root);
        els = {
            root,
            chip: root.querySelector('.fav-chip'),
            panel: root.querySelector('.fav-panel'),
            input: root.querySelector('#favTeamInput'),
            remove: root.querySelector('.fav-remove')
        };

        combobox = new Combobox('favTeamContainer', 'favTeamInput', 'favTeamDropdown', 'Search for a team', value => {
            if (!value) return;
            FavouriteTeam.set(value);
            close();
        }, { logoLeague: 'champions-league', allowEmpty: false });
        combobox.setOptions(FavouriteTeam.allTeams().map(team => ({ value: team, text: team })));

        els.chip.addEventListener('click', () => (isOpen() ? close() : open()));
        els.remove.addEventListener('click', () => {
            FavouriteTeam.clear();
            close();
        });
        // Outside click or Escape closes it - not the click on a card's
        // button that just opened it (data-fav-open)
        document.addEventListener('click', event => {
            if (isOpen() && !root.contains(event.target) && !event.target.closest('[data-fav-open]')) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && isOpen()) {
                close();
                els.chip.focus();
            }
        });

        FavouriteTeam.onChange(renderChip);
        renderChip();
    }

    window.FavouritePicker = { mount, open };
})();
