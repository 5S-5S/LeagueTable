// Season rules for the five domestic leagues, shared by DomesticEurope.html,
// DomesticEuropeMobile.html and the home page's team overview (team.js):
// each league's season dates, the point deductions, the ranking overrides
// for tied or decided-off-the-pitch finishes, the stripped titles, and
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
    window.DomesticSeasonRules = {
        getRankingOverrides,
        applyRankingOverrides,
        strippedChampions,
        isStrippedChampion,
        pointDeductions,
        seasons,
        seasonFinalTable,
    };
})();
