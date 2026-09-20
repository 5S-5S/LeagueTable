// Pure standings-aggregation function, shared logic between the local
// offline test harness (verify-standings.mjs) and the Worker
// (backend/worker/src/index.js copies this function verbatim - Workers
// don't have a build step here, so it's duplicated rather than imported).
// Keep the two copies in sync if this changes.
//
// Mirrors calculateTable()'s core algorithm in DomesticEurope.html
// exactly (minus point deductions, which stay client-side - see
// backend/README.md's Data integrity section for why).

// Historical point-system rule: 3 points for a win unless threePointSystem
// is false AND the match falls in one of these leagues' pre-3-point eras.
// Ligue 1's 1988-89 season used 3 points even though the surrounding years
// used 2 - that's the one carve-out. C1 (Champions League) is much
// simpler: 2 points through the 1994-95 season, 3 from 1995-96 on -
// mirrors getHistoricalPointSystem() in ContinentalEurope.html.
function winPointsFor(div, isoDate, threePointSystem) {
    if (threePointSystem) return 3;
    if (div === 'I1' && isoDate <= '1994-06-30') return 2;
    if (div === 'SP1' && isoDate <= '1995-06-30') return 2;
    if (div === 'D1' && isoDate <= '1995-06-30') return 2;
    if (div === 'F1' && isoDate <= '1994-06-30') {
        if (isoDate >= '1988-07-01' && isoDate <= '1989-06-30') return 3;
        return 2;
    }
    if (div === 'E0' && isoDate <= '1981-06-30') return 2;
    if (div === 'C1' && isoDate < '1995-07-01') return 2;
    return 3;
}

// Continental-only pre-filtering: qualifier exclusion, main-stage-only, and
// competition-stage (group/knockout/specific phase). Mirrors the flat
// (non-grouped) branch of calculateTable() in ContinentalEurope.html -
// the grouped-by-competition-phase branch (a specific season selected)
// isn't handled here; that stays client-side for now (see
// backend/README.md's Data integrity / Next steps).
//
// matches: [{..., isQualifier, competitionPhase}]
// options: { excludeQualifiers, excludeMainStage, competitionStage }
const KNOCKOUT_PHASES = [
    'Round Of 16', 'Round of 16', 'Quarter-Finals', 'Semi-Finals', 'Final',
    'Play-Offs', '1. Round', '2. Round',
];

function matchesStageCategory(competitionPhase, stageCategory) {
    if (!competitionPhase || !stageCategory) return false;
    const phase = competitionPhase.toLowerCase();
    switch (stageCategory) {
        case 'League/Group Stage':
            return phase.includes('league phase') || phase.includes('group') ||
                phase.includes('preliminary') || phase.includes('intermediate') ||
                /group [a-z]/i.test(competitionPhase) ||
                /preliminary gr\. [a-z]/i.test(competitionPhase) ||
                /intermediate gr\. [a-z]/i.test(competitionPhase);
        case 'Knock-Out Stage':
            return phase.includes('final') || phase.includes('semi-final') ||
                phase.includes('quarter-final') || phase.includes('round of 16') ||
                phase.includes('play-off') || phase.includes('2. round') || phase.includes('1. round');
        case 'Final': return phase === 'final';
        case 'Semi-Finals': return phase === 'semi-finals';
        case 'Quarter-Finals': return phase === 'quarter-finals';
        case 'Round Of 16':
        case 'Round of 16': return phase === 'round of 16';
        case 'Play-Offs': return phase === 'play-offs';
        case '2. Round': return phase === '2. round';
        case '1. Round': return phase === '1. round';
        default: return false;
    }
}

export function filterContinentalMatches(matches, { excludeQualifiers = false, excludeMainStage = false, competitionStage = '' } = {}) {
    let filtered = matches;

    if (excludeQualifiers) filtered = filtered.filter(m => !m.isQualifier);
    if (excludeMainStage) filtered = filtered.filter(m => m.isQualifier);

    if (competitionStage) {
        if (competitionStage === 'group-stage') {
            filtered = filtered.filter(m => !KNOCKOUT_PHASES.includes(m.competitionPhase || ''));
        } else if (competitionStage === 'knockout-stage') {
            filtered = filtered.filter(m => KNOCKOUT_PHASES.includes(m.competitionPhase || ''));
        } else {
            filtered = filtered.filter(m => matchesStageCategory(m.competitionPhase, competitionStage));
        }
    }

    return filtered;
}

// matches: [{div, date (ISO), homeTeam, awayTeam, homeGoals, awayGoals}]
// options: { threePointSystem: bool, homeFilter: bool, awayFilter: bool }
// Returns { matchDateRange: {start, end} | null, standings: [...] }
export function aggregateStandings(matches, { threePointSystem = true, homeFilter = true, awayFilter = true } = {}) {
    if (matches.length === 0) return { matchDateRange: null, standings: [] };

    const table = new Map();
    const getRow = team => {
        if (!table.has(team)) {
            table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
        }
        return table.get(team);
    };

    let minDate = matches[0].date, maxDate = matches[0].date;

    for (const m of matches) {
        if (m.date < minDate) minDate = m.date;
        if (m.date > maxDate) maxDate = m.date;

        const winPoints = winPointsFor(m.div, m.date, threePointSystem);

        if (homeFilter) {
            const row = getRow(m.homeTeam);
            row.played++;
            row.goalsFor += m.homeGoals;
            row.goalsAgainst += m.awayGoals;
            if (m.homeGoals > m.awayGoals) { row.won++; row.points += winPoints; }
            else if (m.homeGoals < m.awayGoals) { row.lost++; }
            else { row.drawn++; row.points += 1; }
        }

        if (awayFilter) {
            const row = getRow(m.awayTeam);
            row.played++;
            row.goalsFor += m.awayGoals;
            row.goalsAgainst += m.homeGoals;
            if (m.awayGoals > m.homeGoals) { row.won++; row.points += winPoints; }
            else if (m.awayGoals < m.homeGoals) { row.lost++; }
            else { row.drawn++; row.points += 1; }
        }
    }

    const standings = [...table.values()].filter(row => row.played > 0);
    return { matchDateRange: { start: minDate, end: maxDate }, standings };
}
