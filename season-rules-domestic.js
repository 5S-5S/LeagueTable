// Season rules for the five domestic leagues, shared by DomesticEurope.html,
// DomesticEuropeMobile.html and the home page's team overview (team.js):
// each league's season dates, the point deductions, the ranking overrides
// for tied or decided-off-the-pitch finishes, the stripped titles, the
// championships from before each league's records start (historic
// seasons - Serie A and Bundesliga titles count them), and
// seasonFinalTable(), which turns one season's raw standings into its
// final table with all of them applied. Moved out of the two pages
// verbatim on 2026-10-13, so the pages and the overview can't disagree -
// change a rule here, once.
//
// Exposed as window.DomesticSeasonRules; the pages unpack it under the
// names they always used. Load before the page's own script.
(function () {
    // Ranking overrides for historic seasons
    function getRankingOverrides() {
        return window.StandingsAdjustments.rankingOverrides;
    }

    // Apply ranking overrides for historic seasons
    function applyRankingOverrides(tableArray, selectedLeague, selectedSeason) {
        // Only apply overrides for historic season filters
        if (!selectedSeason) return tableArray;
        
        const leagueMapping = {
            'premier-league': 'E0',
            'la-liga': 'SP1',
            'serie-a': 'I1',
            'bundesliga': 'D1',
            'ligue-1': 'F1'
        };
        
        const selectedDiv = leagueMapping[selectedLeague];
        const overrides = getRankingOverrides().filter(override => 
            override[1] === selectedDiv && override[2] === selectedSeason
        );
        
        if (overrides.length === 0) return tableArray;
        
        // Create a copy of the array to work with
        let result = [...tableArray];
        
        // Separate teams with overrides from those without
        const teamsWithOverrides = [];
        const teamsWithoutOverrides = [];
        
        overrides.forEach(override => {
            const [teamName, , , overridePosition, subOrder] = override;
            const teamIndex = result.findIndex(team => team.team === teamName);
            if (teamIndex !== -1) {
                const team = result[teamIndex];
                team.sharedPosition = parseInt(overridePosition);
                team.subOrder = subOrder || 1;
                teamsWithOverrides.push(team);
            }
        });
        
        // Get teams without overrides
        result.forEach(team => {
            const hasOverride = teamsWithOverrides.some(overrideTeam => overrideTeam.team === team.team);
            if (!hasOverride) {
                teamsWithoutOverrides.push(team);
            }
        });
        
        // Sort teams with overrides by position, then by sub-order
        teamsWithOverrides.sort((a, b) => {
            if (a.sharedPosition !== b.sharedPosition) return a.sharedPosition - b.sharedPosition;
            return a.subOrder - b.subOrder;
        });
        
        // Build final result by filling positions
        const finalResult = [];
        const overridePositions = new Set(teamsWithOverrides.map(t => t.sharedPosition));
        
        // A shared group takes as many places as it has clubs: two at
        // 3rd fill 3rd and 4th, and the next club is 5th
        let nonOverrideIndex = 0;
        let position = 1;
        while (finalResult.length < tableArray.length) {
            if (overridePositions.has(position)) {
                const overrideTeamsAtThisPosition = teamsWithOverrides.filter(t => t.sharedPosition === position);
                finalResult.push(...overrideTeamsAtThisPosition);
                position += overrideTeamsAtThisPosition.length;
            } else if (nonOverrideIndex < teamsWithoutOverrides.length) {
                finalResult.push(teamsWithoutOverrides[nonOverrideIndex]);
                nonOverrideIndex++;
                position++;
            } else {
                break; // an override past the end of the table
            }
        }
        // Overrides that never came up (a position past the end, or one
        // inside an earlier group) still keep their clubs in the table
        teamsWithOverrides.forEach(t => { if (!finalResult.includes(t)) finalResult.push(t); });
        
        return finalResult;
    }

    // Stripped Champions data - entries that should be hidden when position filtering is involved
    const strippedChampions = [
        ["Juventus", "I1", "2004-05", 1],
        ["Olympique Marseille", "F1", "1992-93", 1],
        ["Arminia Bielefeld", "D1", "1971-72", 18]

        // Add more entries as needed: [teamName, leagueDiv, season, position]
    ];

    // Check if an entry should be filtered out due to stripped champion rules
    function isStrippedChampion(teamName, leagueDiv, season, position, hasTeamFilter, hasPositionFilter) {
        // Only apply filtering when position is involved in the filter
        if (!hasPositionFilter) {
            return false; // Show everything when no position filter is active
        }

        // Check if this entry matches any stripped champion record
        return strippedChampions.some(([team, league, seasonStr, pos]) => {
            return team === teamName && 
                   league === leagueDiv && 
                   seasonStr === season && 
                   pos === position;
        });
    }

    // Point deductions data
    const pointDeductions = window.StandingsAdjustments.pointDeductions;

    // Season mappings
    const seasons = {
        'serie-a': {
            '2026-27': { start: '2026-08-01', end: '2027-06-30' },
            '2025-26': { start: '2025-08-01', end: '2026-06-30' },
            '2024-25': { start: '2024-08-01', end: '2025-06-30' },
            '2023-24': { start: '2023-08-01', end: '2024-06-30' },
            '2022-23': { start: '2022-08-01', end: '2023-06-30' },
            '2021-22': { start: '2021-08-01', end: '2022-06-30' },
            '2020-21': { start: '2020-09-14', end: '2021-06-04' }, // Extended by 5 days each side
            '2019-20': { start: '2019-08-19', end: '2020-08-10' }, // Extended by 5 days each side
        },
        'premier-league': {
            '2020-21': { start: '2020-09-07', end: '2021-05-28' }, // Extended by 5 days each side
            '2019-20': { start: '2019-07-31', end: '2020-07-31' }, // Extended by 5 days each side
            '1946-47': { start: '1946-07-01', end: '1947-07-31' }, // Extended range for post-war season
        },
        'la-liga': {
            '2020-21': { start: '2020-09-07', end: '2021-05-28' }, // Extended by 5 days each side
            '2019-20': { start: '2019-08-11', end: '2020-07-24' }, // Extended by 5 days each side
            '1929-30': { start: '1929-12-01', end: '1930-03-30' }, // Historical early La Liga season
            '1928-29': { start: '1929-02-02', end: '1929-06-30' }, // Historical early La Liga season
        },
    };

    // Generate seasons for all leagues
    function generateSeasons() {
        // Serie A seasons - comprehensive historical coverage
        seasons['serie-a']['1929-30'] = { start: '1929-10-06', end: '1930-08-06' };
        seasons['serie-a']['1930-31'] = { start: '1930-09-28', end: '1931-06-30' };
        seasons['serie-a']['1931-32'] = { start: '1931-09-05', end: '1932-06-16' };
        seasons['serie-a']['1932-33'] = { start: '1932-09-18', end: '1933-06-26' };
        seasons['serie-a']['1933-34'] = { start: '1933-09-10', end: '1934-05-30' };
        seasons['serie-a']['1934-35'] = { start: '1934-09-30', end: '1935-06-05' };
        seasons['serie-a']['1935-36'] = { start: '1935-09-22', end: '1936-05-17' };
        seasons['serie-a']['1936-37'] = { start: '1936-09-13', end: '1937-05-30' };
        seasons['serie-a']['1937-38'] = { start: '1937-09-12', end: '1938-05-30' };
        seasons['serie-a']['1938-39'] = { start: '1938-09-18', end: '1939-06-05' };
        seasons['serie-a']['1939-40'] = { start: '1939-09-17', end: '1940-06-05' };
        seasons['serie-a']['1940-41'] = { start: '1940-10-06', end: '1941-05-11' };
        seasons['serie-a']['1941-42'] = { start: '1941-10-26', end: '1942-06-30' };
        seasons['serie-a']['1942-43'] = { start: '1942-10-04', end: '1943-05-30' };
        seasons['serie-a']['1946-47'] = { start: '1946-09-22', end: '1947-07-10' };
        seasons['serie-a']['1947-48'] = { start: '1947-09-14', end: '1948-07-05' };
        seasons['serie-a']['1948-49'] = { start: '1948-09-19', end: '1949-06-15' };
        seasons['serie-a']['1949-50'] = { start: '1949-09-11', end: '1950-06-05' };
        
        // Generate standard seasons 1950-2018
        for (let year = 1950; year <= 2018; year++) {
            const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
            seasons['serie-a'][seasonName] = {
                start: `${year}-08-01`,
                end: `${year + 1}-06-30`
            };
        }

        // Premier League and English First Division seasons
        for (let year = 1888; year <= 2026; year++) {
            if (year === 2019 || year === 2020) continue; // Skip COVID seasons
            
            // Skip WWI seasons: 1915-16, 1916-17, 1917-18, 1918-19
            if (year === 1915 || year === 1916 || year === 1917 || year === 1918) continue;
            
            // Skip WWII seasons: 1940-41, 1941-42, 1942-43, 1943-44, 1944-45, 1945-46
            if (year >= 1939 && year <= 1945) continue;
            
            const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
            if (!seasons['premier-league']) seasons['premier-league'] = {};
            
            // Different start dates for different eras
            let startDate, endDate;
            if (year < 1992) {
                // Special case for 1946-47 season
                if (year === 1946) {
                    startDate = `${year}-08-01`;
                    endDate = `${year + 1}-06-30`;
                } else {
                    // English First Division era - seasons typically started earlier
                    startDate = `${year}-08-01`;
                    endDate = `${year + 1}-05-31`;
                }
            } else {
                // Premier League era
                startDate = `${year}-08-01`;
                endDate = `${year + 1}-06-30`;
            }
            
            seasons['premier-league'][seasonName] = {
                start: startDate,
                end: endDate
            };
        }

        // Add other leagues
        ['bundesliga', 'la-liga', 'ligue-1'].forEach(league => {
            seasons[league] = seasons[league] || {};
            const startYear = league === 'bundesliga' ? 1963 : league === 'la-liga' ? 1928 : 1932;
            for (let year = startYear; year <= 2026; year++) {
                if (league === 'la-liga' && year >= 1936 && year <= 1938) continue;
                if (league === 'la-liga' && (year === 2019 || year === 2020)) continue; // Skip COVID seasons
                if (league === 'ligue-1' && year >= 1939 && year <= 1944) continue;
                const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
                
                // Special cases for Ligue 1 seasons
                let startDate, endDate;
                if (league === 'ligue-1' && year === 1967) {
                    startDate = `${year}-07-01`;
                    endDate = `${year + 1}-07-06`;
                } else if (league === 'ligue-1' && year === 1968) {
                    startDate = `${year}-07-15`;
                    endDate = `${year + 1}-06-30`;
                } else {
                    startDate = `${year}-07-01`;
                    endDate = `${year + 1}-06-30`;
                }
                
                seasons[league][seasonName] = {
                    start: startDate,
                    end: endDate
                };
            }
        });
    }

    // Initialize seasons
    generateSeasons();

    // One season's final table from its season-standings entry: point
    // deductions, the points / goal difference / goals scored sort and
    // the ranking overrides, each row with its final position (a shared
    // position from an override, otherwise its place) and the season's
    // dates for the expandable match lists. Shared by a season's final
    // standings and Team Records, so both rank a season the same way.
    function seasonFinalTable(seasonStandings, seasonKey, seasonDates, league, divCode) {
        const seasonStart = new Date(seasonDates.start);
        const seasonEnd = new Date(seasonDates.end);
        const table = seasonStandings.standings.map(stats => {
            let points = stats.points;
            pointDeductions.forEach(deduction => {
                if (deduction.team === stats.team && deduction.league === divCode &&
                    seasonStart <= new Date(deduction.endDate) && seasonEnd >= new Date(deduction.startDate)) {
                    points -= deduction.points;
                }
            });
            return {
                team: stats.team,
                played: stats.played,
                won: stats.won,
                drawn: stats.drawn,
                lost: stats.lost,
                goalsFor: stats.goalsFor,
                goalsAgainst: stats.goalsAgainst,
                goalDifference: stats.goalsFor - stats.goalsAgainst,
                points,
                pointsDeducted: stats.points - points
            };
        });
        table.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        return applyRankingOverrides(table, league, seasonKey).map((row, index) => ({
            ...row,
            position: row.sharedPosition || index + 1,
            season: seasonKey,
            seasonStart: seasonDates.start, // for the expandable match lists
            seasonEnd: seasonDates.end
        }));
    }
    // Historic Seasons Data Structure
    // Format: [season, leagueId, position, teamName, gamesPlayed, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points]
    const historicSeasonsData = [
        // Example entries - replace with actual historic data
        ["1928-29", "I1", 1, "Bologna FC", 30, 22, 5, 3, 84, 32, 52, 49],
        ["1927-28", "I1", 1, "Torino FC", 34, 22, 5, 7, 111, 37, 74, 49],
        ["1925-26", "I1", 1, "Juventus", 24, 19, 3, 2, 80, 15, 65, 41],
        ["1924-25", "I1", 1, "Bologna FC", 24, 15, 4, 5, 53, 22, 31, 34],
        ["1923-24", "I1", 1, "Genoa CFC", 22, 14, 5, 3, 50, 13, 37, 33],
        ["1922-23", "I1", 1, "Genoa CFC", 22, 17, 5, 0, 61, 18, 43, 39],
        ["1921-22", "I1", 1, "Pro Vercelli", 22, 17, 2, 3, 61, 14, 47, 36],
        ["1921-22", "I1", 1, "Novese", 8, 6, 2, 0, 18, 1, 17, 14],
        ["1920-21", "I1", 1, "Pro Vercelli", 16, 11, 1, 4, 37, 14, 23, 23],
        ["1919-20", "I1", 1, "Inter", 22, 16, 5, 1, 81, 26, 55, 37],
        ["1914-15", "I1", 1, "Genoa CFC", 21, 17, 1, 3, 99, 21, 78, 35],
        ["1913-14", "I1", 1, "Casale", 28, 23, 1, 4, 80, 17, 63, 47],
        ["1912-13", "I1", 1, "Pro Vercelli", 20, 17, 3, 0, 60, 3, 57, 37],
        ["1911-12", "I1", 1, "Pro Vercelli", 18, 15, 2, 1, 50, 12, 38, 32],
        ["1910-11", "I1", 1, "Pro Vercelli", 16, 12, 3, 1, 44, 8, 36, 27],
        ["1909-10", "I1", 1, "Inter", 16, 12, 1, 3, 55, 26, 29, 25],
        ["1909", "I1", 1, "Pro Vercelli", 6, 4, 2, 0, 11, 6, 5, 10],
        ["1908", "I1", 1, "Pro Vercelli", 4, 2, 2, 0, 4, 2, 2, 6],
        ["1907", "I1", 1, "AC Milan", 4, 2, 2, 0, 10, 3, 7, 6],
        ["1906", "I1", 1, "AC Milan", 4, 2, 1, 1, 7, 4, 3, 5],
        ["1905", "I1", 1, "Juventus", 4, 2, 2, 0, 9, 3, 6, 6],
        ["1904", "I1", 1, "Genoa CFC", 1, 1, 0, 0, 1, 0, 1, 2],
        ["1903", "I1", 1, "Genoa CFC", 1, 1, 0, 0, 3, 0, 3, 2],
        ["1902", "I1", 1, "Genoa CFC", 4, 4, 0, 0, 11, 4, 7, 8],
        ["1901", "I1", 1, "AC Milan", 3, 3, 0, 0, 8, 2, 6, 6],
        ["1900", "I1", 1, "Genoa CFC", 2, 2, 0, 0, 10, 1, 9, 4],
        ["1899", "I1", 1, "Genoa CFC", 1, 1, 0, 0, 3, 1, 2, 2],
        ["1898", "I1", 1, "Genoa CFC", 2, 1, 0, 0, 4, 1, 3, 4],

        ["1963", "D1", 1, "Borussia Dortmund", 4, 2, 1, 1, 15, 7, 8, 3],
        ["1962", "D1", 1, "1. FC Köln", 3, 3, 0, 0, 14, 1, 13, 6],
        ["1961", "D1", 1, "1. FC Nürnberg", 6, 4, 2, 0, 18, 9, 9, 10],
        ["1960", "D1", 1, "Hamburger SV", 6, 4, 1, 1, 22, 11, 11, 9],
        ["1959", "D1", 1, "Eintracht Frankfurt", 6, 6, 0, 0, 26, 11, 15, 12],
        ["1958", "D1", 1, "FC Schalke 04", 3, 3, 0, 0, 16, 1, 15, 6],
        ["1957", "D1", 1, "Borussia Dortmund", 3, 3, 0, 0, 7, 4, 3, 6],
        ["1956", "D1", 1, "Borussia Dortmund", 6, 4, 1, 1, 19, 4, 15, 9],
        ["1955", "D1", 1, "Rot-Weiss Essen", 6, 4, 2, 0, 16, 5, 11, 10],
        ["1954", "D1", 1, "Hannover 96", 2, 2, 0, 0, 5, 2, 3, 4],
        ["1953", "D1", 1, "1. FC Kaiserslautern", 6, 5, 1, 0, 16, 7, 9, 11],
        ["1952", "D1", 1, "VfB Stuttgart", 6, 3, 2, 1, 14, 8, 6, 8],
        ["1951", "D1", 1, "1. FC Kaiserslautern", 6, 4, 1, 1, 14, 8, 6, 9],
        ["1950", "D1", 1, "VfB Stuttgart", 4, 4, 0, 0, 13, 5, 8, 8],
        ["1949", "D1", 1, "Waldhof Mannheim", 3, 3, 0, 0, 10, 3, 7, 6],
        ["1948", "D1", 1, "1. FC Nürnberg", 2, 2, 0, 0, 5, 3, 2, 4],
        ["1944", "D1", 1, "Dresdner SC", 5, 5, 0, 0, 28, 7, 21, 10],
        ["1943", "D1", 1, "Dresdner SC", 5, 5, 0, 0, 16, 2, 14, 10],
        ["1942", "D1", 1, "FC Schalke 04", 5, 5, 0, 0, 25, 3, 22, 10],
        ["1941", "D1", 1, "Rapid Vienna", 8, 6, 1, 1, 30, 7, 23, 13],
        ["1940", "D1", 1, "FC Schalke 04", 8, 6, 2, 0, 39, 6, 33, 14],
        ["1939", "D1", 1, "FC Schalke 04", 8, 7, 0, 1, 31, 8, 3, 14],
        ["1938", "D1", 1, "Hannover 96", 8, 8, 0, 0, 26, 13, 13, 16],
        ["1937", "D1", 1, "FC Schalke 04", 8, 7, 1, 0, 37, 7, 30, 15],
        ["1936", "D1", 1, "1. FC Nürnberg", 8, 7, 1, 0, 23, 5, 18, 15],
        ["1935", "D1", 1, "FC Schalke 04", 8, 7, 0, 1, 36, 12, 24, 14],
        ["1934", "D1", 1, "FC Schalke 04", 8, 6, 0, 2, 23, 10, 13, 12],
        ["1933", "D1", 1, "Fortuna Düsseldorf", 4, 4, 0, 0, 19, 0, 19, 8],

        ["1932", "D1", 1, "Bayern München", 4, 4, 0, 0, 11, 4, 7, 8],
        ["1931", "D1", 1, "Hertha BSC", 4, 4, 0, 0, 14, 7, 7, 8],
        ["1930", "D1", 1, "Hertha BSC", 4, 4, 0, 0, 23, 11, 12, 8],
        ["1929", "D1", 1, "SpVgg Greuther Fürth", 4, 4, 0, 0, 16, 4, 12, 8],
        ["1928", "D1", 1, "Hamburger SV", 4, 4, 0, 0, 21, 6, 15, 8],
        ["1927", "D1", 1, "1. FC Nürnberg", 4, 4, 0, 0, 15, 3, 12, 8],
        ["1926", "D1", 1, "SpVgg Greuther Fürth", 4, 4, 0, 0, 16, 2, 14, 8],
        ["1925", "D1", 1, "1. FC Nürnberg", 4, 4, 0, 0, 10, 1, 9, 8],
        ["1924", "D1", 1, "1. FC Nürnberg", 3, 3, 0, 0, 11, 2, 9, 6],
        ["1923", "D1", 1, "Hamburger SV", 3, 3, 0, 0, 8, 2, 6, 6],
        ["1921", "D1", 1, "1. FC Nürnberg", 2, 2, 0, 0, 10, 1, 9, 4],
        ["1920", "D1", 1, "1. FC Nürnberg", 3, 3, 0, 0, 7, 0, 7, 6],
        ["1914", "D1", 1, "SpVgg Greuther Fürth", 3, 3, 0, 0, 8, 6, 2, 6],
        ["1913", "D1", 1, "1. FC Lok Leipzig", 3, 3, 0, 0, 11, 2, 9, 6],
        ["1912", "D1", 1, "Holstein Kiel", 3, 3, 0, 0, 5, 1, 4, 6],
        ["1911", "D1", 1, "Viktoria Berlin", 2, 2, 0, 0, 7, 1, 6, 4],
        ["1910", "D1", 1, "Karlsruher FV", 3, 3, 0, 0, 4, 1, 3, 6],
        ["1909", "D1", 1, "Karlsruher SC", 3, 3, 0, 0, 18, 3, 15, 6],
        ["1908", "D1", 1, "Viktoria Berlin", 3, 3, 0, 0, 14, 1, 13, 6],
        ["1907", "D1", 1, "Freiburger FC", 2, 2, 0, 0, 6, 3, 3, 4],
        ["1906", "D1", 1, "1. FC Lok Leipzig", 3, 3, 0, 0, 14, 4, 10, 6],
        ["1905", "D1", 1, "Blau-Weiß 90 Berlin", 3, 3, 0, 0, 11, 3, 8, 6],
        ["1903", "D1", 1, "1. FC Lok Leipzig", 3, 3, 0, 0, 16, 6, 10, 6],



        // Add more historic seasons here...
    ];

    window.DomesticSeasonRules = {
        getRankingOverrides,
        applyRankingOverrides,
        strippedChampions,
        isStrippedChampion,
        pointDeductions,
        seasons,
        seasonFinalTable,
        historicSeasonsData,
    };
})();
