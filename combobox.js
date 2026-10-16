// The sport pages' team search box (Team 1 / Team 2 - class Combobox in
// DomesticEurope.html and ContinentalEurope.html) for the home page: type to
// filter, arrow keys and Enter to pick, each club with its crest, the chosen
// club's crest inside the closed box. Copied from those pages (which keep
// their own inline copies), with two differences:
// - logoLeague: crests are looked up in one league, or 'champions-league'
//   for every league (the home page's clubs come from all of them)
// - allowEmpty: false keeps the last pick when the box is left empty
//   (clicking in clears it for typing) instead of choosing "All Teams" -
//   for a favourite team, which is removed on purpose, not by a stray click
// Needs team-registry.js (getTeamLogoUrl); styles in combobox.css.
class Combobox {
    constructor(containerId, inputId, dropdownId, placeholder, onSelect, { logoLeague = 'champions-league', allowEmpty = true } = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.input = document.getElementById(inputId);
        this.dropdown = document.getElementById(dropdownId);
        this.placeholder = placeholder;
        this.onSelect = onSelect;
        this.logoLeague = logoLeague;
        this.allowEmpty = allowEmpty;
        this.options = [];
        this.filteredOptions = [];
        this.selectedIndex = -1;
        this.isOpen = false;
        this.currentValue = '';
        this.currentText = this.placeholder;

        this.init();
    }

    init() {
        // Selected team's logo, shown inside the input once closed
        this.selectedLogo = document.createElement('img');
        this.selectedLogo.className = 'combobox-selected-logo';
        this.selectedLogo.alt = '';
        this.selectedLogo.addEventListener('error', () => {
            this.failedLogoUrl = this.selectedLogo.getAttribute('src');
            this.container.classList.remove('has-logo');
        });
        this.container.appendChild(this.selectedLogo);

        // Input events
        this.input.addEventListener('focus', () => {
            // Clear the field on focus so typing starts straight away
            this.input.value = '';
            this.filteredOptions = [...this.options];
            this.selectedIndex = -1;
            this.open();
        });
        this.input.addEventListener('blur', () => {
            // Delay close to allow for option click
            setTimeout(() => {
                if (this.input.value.trim() === '' && this.allowEmpty) {
                    // Left empty - fall back to the default option
                    const emptyOption = this.options.find(opt => opt.value === '');
                    const value = emptyOption ? emptyOption.value : '';
                    const text = emptyOption ? emptyOption.text : this.placeholder;
                    this.currentValue = value;
                    this.currentText = text;
                    this.input.value = text;
                    if (this.onSelect) {
                        this.onSelect(value, text);
                    }
                } else if (this.input.value !== this.currentText) {
                    // Typed something (or nothing, when empty isn't allowed)
                    // and clicked away without picking - back to the last
                    // confirmed selection
                    this.input.value = this.currentValue ? this.currentText : '';
                }
                this.close();
            }, 150);
        });
        this.input.addEventListener('input', (e) => this.filterOptions(e.target.value));
        this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Click arrow to toggle
        this.container.querySelector('.combobox-arrow').addEventListener('click', () => {
            if (this.isOpen) {
                this.close();
            } else {
                this.input.focus();
                this.open();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    setOptions(options) {
        this.options = options;
        this.filteredOptions = [...options];
        if (this.isOpen) this.renderOptions();
    }

    filterOptions(query) {
        // Accents don't matter: "munchen" finds Bayern München
        const fold = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const lowerQuery = fold(query);
        this.filteredOptions = this.options.filter(option =>
            fold(option.text).includes(lowerQuery)
        );
        this.selectedIndex = -1;
        this.renderOptions();

        // If user empties the field, select the empty option
        if (query === '' && this.allowEmpty) {
            const emptyOption = this.options.find(opt => opt.value === '');
            if (emptyOption && this.onSelect) {
                this.onSelect(emptyOption.value, emptyOption.text);
            }
        }

        if (!this.isOpen) {
            this.open();
        }
    }

    renderOptions() {
        if (this.filteredOptions.length === 0) {
            this.dropdown.innerHTML = '<div class="combobox-no-results">No teams found</div>';
            return;
        }

        const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        this.dropdown.innerHTML = this.filteredOptions.map((option, index) => {
            // Crests load as they scroll into view - the home page lists
            // every club
            const logoUrl = option.value ? getTeamLogoUrl(option.value, this.logoLeague) : null;
            const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="" class="combobox-team-logo" loading="lazy" onerror="this.style.display='none'">` : '';
            return `<div class="combobox-option ${index === this.selectedIndex ? 'highlighted' : ''}"
                      data-value="${escape(option.value)}" data-index="${index}">
                    ${logoHtml}
                    <span class="combobox-option-text">${escape(option.text)}</span>
                 </div>`;
        }).join('');

        // Add click events to options
        this.dropdown.querySelectorAll('.combobox-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectOption(option.dataset.value, option.querySelector('.combobox-option-text').textContent.trim());
            });
        });
    }

    handleKeyDown(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredOptions.length - 1);
                this.updateHighlight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateHighlight();
                break;
            case 'Enter': {
                e.preventDefault();
                // Enter with one match left picks it
                const index = this.selectedIndex >= 0 ? this.selectedIndex : (this.filteredOptions.length === 1 ? 0 : -1);
                if (index >= 0) {
                    const option = this.filteredOptions[index];
                    this.selectOption(option.value, option.text);
                }
                break;
            }
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    updateHighlight() {
        this.dropdown.querySelectorAll('.combobox-option').forEach((option, index) => {
            option.classList.toggle('highlighted', index === this.selectedIndex);
            if (index === this.selectedIndex) option.scrollIntoView({ block: 'nearest' });
        });
    }

    selectOption(value, text) {
        this.currentValue = value;
        this.currentText = text;
        this.input.value = text;
        this.close();
        this.input.blur();
        if (this.onSelect) {
            this.onSelect(value, text);
        }
    }

    open() {
        this.isOpen = true;
        this.container.classList.add('open');
        this.renderOptions();
        this.updateSelectedLogo();
    }

    close() {
        this.isOpen = false;
        this.container.classList.remove('open');
        this.selectedIndex = -1;
        this.updateSelectedLogo();
    }

    setValue(value, text) {
        this.currentValue = value;
        this.currentText = text || this.placeholder;
        this.input.value = value ? this.currentText : '';
        this.updateSelectedLogo();
    }

    // Show the selected team's logo inside the closed combobox - hidden
    // while open, since the field is cleared for typing then
    updateSelectedLogo() {
        const logoUrl = !this.isOpen && this.currentValue
            ? getTeamLogoUrl(this.currentValue, this.logoLeague)
            : null;
        if (logoUrl && this.selectedLogo.getAttribute('src') !== logoUrl) {
            this.selectedLogo.src = logoUrl;
        }
        this.container.classList.toggle('has-logo', !!logoUrl && logoUrl !== this.failedLogoUrl);
    }
}
