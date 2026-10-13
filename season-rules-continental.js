// Season rules for the Champions League, shared by ContinentalEurope.html,
// ContinentalEuropeMobile.html and the home page's team overview (team.js):
// the season dates, point deductions, ranking overrides and stripped
// titles, and the stage a club reached in a season
// (calculateTournamentProgression() from its last match, ranked by
// getProgressionRank()). Moved out of the two pages verbatim on
// 2026-10-13, so the pages and the overview can't disagree - change a
// rule here, once.
//
// Exposed as window.ContinentalSeasonRules; the pages unpack it under the
// names they always used. Load before the page's own script.
(function () {
    // Ranking overrides for historic seasons
    function getRankingOverrides() {
        return [
            // Italy
            ["Pro Vercelli", "I1", "1930-31", 10, 1],

            // Germany
            ["1. FC Köln", "D1", "1968-69", 13],

            // Spain
            ["Girona FC", "SP1", "2024-25", 16],

            // England
            ["Liverpool FC", "E0", "1974-75", 2],

            // France
            // Add ranking overrides here as needed
            ["FC Metz", "F1", "2023-24", 16]


        ];
    }

    // Apply ranking overrides for historic seasons
    function applyRankingOverrides(tableArray, selectedLeague, selectedSeason) {
        // Only apply overrides for historic season filters
        if (!selectedSeason) return tableArray;
        
        const leagueMapping = {
            'champions-league': 'C1',
            'europa-league': 'E1',
            'conference-league': 'C2'
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
        
        let nonOverrideIndex = 0;
        for (let position = 1; position <= tableArray.length; position++) {
            if (overridePositions.has(position)) {
                // Fill with override teams at this position
                const overrideTeamsAtThisPosition = teamsWithOverrides.filter(t => t.sharedPosition === position);
                finalResult.push(...overrideTeamsAtThisPosition);
            } else {
                // Fill with next non-override team
                if (nonOverrideIndex < teamsWithoutOverrides.length) {
                    finalResult.push(teamsWithoutOverrides[nonOverrideIndex]);
                    nonOverrideIndex++;
                }
            }
        }
        
        return finalResult;
    }

    // Stripped Champions data - entries that should be hidden when position filtering is involved
    const strippedChampions = [
        ["Juventus", "I1", "2004-05", 1],
        ["Olympique Marseille", "F1", "1992-93", 1],
        ["Arminia Bielefeld", "E1", "1971-72", 18]

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
    const pointDeductions = [
        // Champions League point deductions
        { team: 'AC Milan', points: 2, startDate: '1994-07-01', endDate: '1995-06-30', league: 'C1' },
        
        // Other leagues (kept for reference)
        { team: 'Málaga CF', points: 3, startDate: '1979-07-01', endDate: '1980-06-30', league: 'SP1' }
    ];

    // Season mappings
    const seasons = {
        'champions-league': {
            '2026-27': { start: '2026-07-01', end: '2027-06-30' },
            '2025-26': { start: '2025-07-01', end: '2026-06-30' },
            '2024-25': { start: '2024-07-01', end: '2025-06-30' },
            '2023-24': { start: '2023-07-01', end: '2024-06-30' },
            '2022-23': { start: '2022-07-01', end: '2023-06-30' },
            '2021-22': { start: '2021-07-01', end: '2022-06-30' },
            '2020-21': { start: '2020-10-20', end: '2021-06-30' },
            '2019-20': { start: '2019-07-01', end: '2020-08-23' },
            '2018-19': { start: '2018-07-01', end: '2019-06-30' },
            '2017-18': { start: '2017-07-01', end: '2018-06-30' },
            '2016-17': { start: '2016-07-01', end: '2017-06-30' },
            '2015-16': { start: '2015-07-01', end: '2016-06-30' },
            '2014-15': { start: '2014-07-01', end: '2015-06-30' },
            '2013-14': { start: '2013-07-01', end: '2014-06-30' },
            '2012-13': { start: '2012-07-01', end: '2013-06-30' },
            '2011-12': { start: '2011-07-01', end: '2012-06-30' },
            '2010-11': { start: '2010-07-01', end: '2011-06-30' },
            '2009-10': { start: '2009-07-01', end: '2010-06-30' },
            '2008-09': { start: '2008-07-01', end: '2009-06-30' },
            '2007-08': { start: '2007-07-01', end: '2008-06-30' },
            '2006-07': { start: '2006-07-01', end: '2007-06-30' },
            '2005-06': { start: '2005-07-01', end: '2006-06-30' },
            '2004-05': { start: '2004-07-01', end: '2005-06-30' },
            '2003-04': { start: '2003-07-01', end: '2004-06-30' },
            '2002-03': { start: '2002-07-01', end: '2003-06-30' },
            '2001-02': { start: '2001-07-01', end: '2002-06-30' },
            '2000-01': { start: '2000-07-01', end: '2001-06-30' },
            '1999-00': { start: '1999-07-01', end: '2000-06-30' },
            '1998-99': { start: '1998-07-01', end: '1999-06-30' },
            '1997-98': { start: '1997-07-01', end: '1998-06-30' },
            '1996-97': { start: '1996-07-01', end: '1997-06-30' },
            '1995-96': { start: '1995-07-01', end: '1996-06-30' },
            '1994-95': { start: '1994-07-01', end: '1995-06-30' },
            '1993-94': { start: '1993-07-01', end: '1994-06-30' },
            '1992-93': { start: '1992-07-01', end: '1993-06-30' }
        },
        'europa-league': {
            // Europa League seasons will be added when we have data
        },
        'conference-league': {
            // Conference League seasons will be added when we have data
        }
    };

    // Generate seasons for all leagues
    function generateSeasons() {
        // Champions League / European Cup seasons - comprehensive historical coverage from 1955
        // Using July 1 to June 30 pattern to match domestic league seasons
        // Skip years that have custom date ranges defined above
        for (let year = 1955; year <= 2025; year++) {
            const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
            // Skip 2019-20 and 2020-21 as they have custom date ranges defined above
            if (seasonName === '2019-20' || seasonName === '2020-21') {
                continue;
            }
            seasons['champions-league'][seasonName] = {
                start: `${year}-07-01`,
                end: `${year + 1}-06-30`
            };
        }

        // Europa League seasons - will be populated when we have Europa League data
        // Starting from 1971 (when UEFA Cup began)
        for (let year = 1971; year <= 2025; year++) {
            const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
            if (!seasons['europa-league']) seasons['europa-league'] = {};
            seasons['europa-league'][seasonName] = {
                start: `${year}-07-01`,
                end: `${year + 1}-06-30`
            };
        }

        // Conference League seasons - starting from 2021
        for (let year = 2021; year <= 2025; year++) {
            const seasonName = `${year}-${(year + 1).toString().slice(2)}`;
            if (!seasons['conference-league']) seasons['conference-league'] = {};
            seasons['conference-league'][seasonName] = {
                start: `${year}-07-01`,
                end: `${year + 1}-06-30`
            };
        }
    }

    // Initialize seasons
    generateSeasons();

    function calculateTournamentProgression(teamName, teamMatches) {
        try {
            if (!teamMatches || teamMatches.length === 0) return 'Group Stage';
            
            // Sort matches by date to find the chronologically last match
            const sortedMatches = [...teamMatches].sort((a, b) => {
                return new Date(a.dateObj) - new Date(b.dateObj);
            });
            
            // Get the last match this team played
            const lastMatch = sortedMatches[sortedMatches.length - 1];
            const lastPhase = lastMatch.CompetitionPhase || '';

            // Knocked out in qualifying: those rounds share names with
            // main-stage rounds ("Play-Offs", "2. Round"), so they're
            // marked (Q). "Qualification Qual. 1./2. Round" is the
            // preliminary round's semi-final and final.
            if (lastPhase.startsWith('Qualification')) {
                if (lastPhase.includes('Play-Off')) return 'Play-Offs (Q)';
                if (lastPhase.includes('Qual.')) return 'Preliminary Round (Q)';
                const round = lastPhase.match(/(\d)\. Round/);
                return round ? `${round[1]}. Round (Q)` : 'Qualifiers';
            }

            // Map phase names to standardized stage names
            let stageName = 'Group Stage';
            if (lastPhase.includes('Quarter')) {
                stageName = 'Quarter-Finals';
            } else if (lastPhase.includes('Semi')) {
                stageName = 'Semi-Finals';
            } else if (lastPhase.includes('Final') && !lastPhase.includes('Semi') && !lastPhase.includes('Quarter')) {
                // Check if team won the final to determine if they are Champions
                let teamWonFinal = false;
                
                // Check for penalty shootout in AdditionalInfo (format: "pso 3:4")
                const additionalInfo = lastMatch.AdditionalInfo || '';
                if (additionalInfo.includes('pso')) {
                    // Extract penalty score (e.g., "pso 3:4" -> "3:4")
                    const penaltyMatch = additionalInfo.match(/pso\s+(\d+):(\d+)/);
                    if (penaltyMatch) {
                        const homePenalties = parseInt(penaltyMatch[1]);
                        const awayPenalties = parseInt(penaltyMatch[2]);
                        
                        // Team won if they scored more penalties
                        teamWonFinal = (lastMatch.HomeTeam === teamName && homePenalties > awayPenalties) ||
                                      (lastMatch.AwayTeam === teamName && awayPenalties > homePenalties);
                    }
                } else {
                    // Regular final without penalties
                    teamWonFinal = (lastMatch.HomeTeam === teamName && parseInt(lastMatch.FTHG) > parseInt(lastMatch.FTAG)) ||
                                  (lastMatch.AwayTeam === teamName && parseInt(lastMatch.FTAG) > parseInt(lastMatch.FTHG));
                }
                
                stageName = teamWonFinal ? 'Champions' : 'Final';
            } else if (lastPhase.includes('Round Of 16') || lastPhase.includes('16')) {
                stageName = 'Round Of 16';
            } else if (lastPhase.includes('Play-Off')) {
                stageName = 'Play-Offs';
            } else if (lastPhase.includes('2. Round')) {
                stageName = '2. Round';
            } else if (lastPhase.includes('1. Round')) {
                stageName = '1. Round';
            }
            
            return stageName;
        } catch (error) {
            console.error('Error calculating tournament progression:', error);
            return 'Group Stage';
        }
    }

    // Define progression hierarchy (better = lower index)
    function getProgressionRank(progression) {
        const progressionHierarchy = [
            'Champions',
            'Final', 
            'Semi-Finals',
            'Quarter-Finals',
            'Round Of 16',
            'Play-Offs',
            'Group Stage',
            '2. Round',
            '1. Round',
            // Qualifying exits - below every main-stage finish
            'Play-Offs (Q)',
            '3. Round (Q)',
            '2. Round (Q)',
            '1. Round (Q)',
            'Preliminary Round (Q)'
        ];
        
        const rank = progressionHierarchy.indexOf(progression);
        return rank === -1 ? 999 : rank; // Unknown progressions ranked lowest
    }
    
    // Check if actual progression is equal or better than target
    function isProgressionEqualOrBetter(actualProgression, targetProgression) {
        const actualRank = getProgressionRank(actualProgression);
        const targetRank = getProgressionRank(targetProgression);
        return actualRank <= targetRank; // Lower rank = better
    }
    window.ContinentalSeasonRules = {
        getRankingOverrides,
        applyRankingOverrides,
        strippedChampions,
        isStrippedChampion,
        pointDeductions,
        seasons,
        calculateTournamentProgression,
        getProgressionRank,
        isProgressionEqualOrBetter,
    };
})();
