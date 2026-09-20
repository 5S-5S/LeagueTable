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
// used 2 - that's the one carve-out.
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
    return 3;
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
