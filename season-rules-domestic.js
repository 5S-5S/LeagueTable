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
        return [
            // Italy
            ["Pro Vercelli", "I1", "1930-31", 10, 1],
            ["Modena FC", "I1", "1930-31", 10, 2],
            ["ACF Fiorentina", "I1", "1931-32", 4, 1],
            ["AC Milan", "I1", "1931-32", 4, 2],                
            ["Inter", "I1", "1931-32", 6, 1],
            ["US Alessandria 1912", "I1", "1931-32", 6, 2],    
            ["Lazio Roma", "I1", "1931-32", 13, 1],    
            ["US Triestina", "I1", "1931-32", 13, 2],    
            ["Pro Vercelli", "I1", "1931-32", 13, 3],   
            ["Bologna FC", "I1", "1932-33", 3, 1],   
            ["SSC Napoli", "I1", "1932-33", 3, 2],   
            ["AS Roma", "I1", "1932-33", 5, 1],   
            ["ACF Fiorentina", "I1", "1932-33", 5, 2],   
            ["Genoa CFC", "I1", "1932-33", 8, 1],   
            ["US Triestina", "I1", "1932-33", 8, 2],   
            ["Pro Vercelli", "I1", "1932-33", 12, 1],   
            ["Palermo FC", "I1", "1932-33", 12, 2],   
            ["Calcio Padova", "I1", "1932-33", 14, 1],   
            ["US Alessandria 1912", "I1", "1932-33", 14, 2],   
            ["Pro Vercelli", "I1", "1933-34", 7, 1],   
            ["AS Livorno", "I1", "1933-34", 7, 2],   
            ["Brescia Calcio", "I1", "1933-34", 12, 1],   
            ["Torino FC", "I1", "1933-34", 12, 2],   
            ["US Alessandria 1912", "I1", "1933-34", 12, 3],   
            ["Palermo FC", "I1", "1933-34", 12, 4],   
            ["SSC Napoli", "I1", "1934-35", 7, 1],   
            ["US Alessandria 1912", "I1", "1934-35", 7, 2],   
            ["Palermo FC", "I1", "1934-35", 7, 3],   
            ["AC Milan", "I1", "1934-35", 10, 1],   
            ["US Triestina", "I1", "1934-35", 10, 2],   
            ["Brescia Calcio", "I1", "1934-35", 10, 3],   
            ["AC Milan", "I1", "1935-36", 8, 1],   
            ["SSC Napoli", "I1", "1935-36", 8, 2],   
            ["US Alessandria 1912", "I1", "1935-36", 8, 3],   
            ["Genoa CFC", "I1", "1935-36", 8, 4],   
            ["ACF Fiorentina", "I1", "1935-36", 12, 1],   
            ["Sampierdarenese", "I1", "1935-36", 12, 2],   
            ["Inter", "I1", "1936-37", 7, 1],   
            ["Lucchese", "I1", "1936-37", 7, 2],   
            ["AS Roma", "I1", "1936-37", 10, 1],   
            ["SSC Bari", "I1", "1936-37", 10, 2],
            ["Genoa CFC", "I1", "1937-38", 3],
            ["US Triestina", "I1", "1937-38", 6, 1],
            ["AS Roma", "I1", "1937-38", 6, 2],
            ["Lazio Roma", "I1", "1937-38", 8, 1],
            ["Torino FC", "I1", "1937-38", 8, 2],
            ["AC Liguria", "I1", "1937-38", 11, 1],
            ["AS Livorno", "I1", "1937-38", 11, 2],
            ["Genoa CFC", "I1", "1940-41", 10],
            ["AS Roma", "I1", "1940-41", 11],
            ["Genoa CFC", "I1", "1941-42", 4],
            ["Lazio Roma", "I1", "1941-42", 5],
            ["Juventus", "I1", "1941-42", 6],
            ["Bologna FC", "I1", "1942-43", 6, 1],
            ["ACF Fiorentina", "I1", "1942-43", 6, 2],
            ["AC Milan", "I1", "1942-43", 6, 3],
            ["Lazio Roma", "I1", "1942-43", 9, 1],
            ["Atalanta", "I1", "1942-43", 9, 2],
            ["AS Roma", "I1", "1942-43", 9, 3],
            ["Bologna FC", "I1", "1946-47", 5, 1],
            ["L.R. Vicenza", "I1", "1946-47", 5, 2],
            ["Inter", "I1", "1946-47", 10, 1],
            ["Sampdoria", "I1", "1946-47", 10, 2],
            ["Genoa CFC", "I1", "1946-47", 10, 3],
            ["Lazio Roma", "I1", "1946-47", 10, 4],
            ["AS Livorno", "I1", "1946-47", 15, 1],
            ["AS Roma", "I1", "1946-47", 15, 2],
            ["Atalanta", "I1", "1947-48", 5, 1],
            ["Modena FC", "I1", "1947-48", 5, 2],
            ["Aurora Pro Patria", "I1", "1947-48", 8, 1],
            ["Bologna FC", "I1", "1947-48", 8, 2],
            ["Inter", "I1", "1947-48", 12, 1],
            ["Genoa CFC", "I1", "1947-48", 12, 2],
            ["Sampdoria", "I1", "1947-48", 14, 1],
            ["AS Livorno", "I1", "1947-48", 14, 2],
            ["Lucchese", "I1", "1947-48", 14, 3],
            ["Sampdoria", "I1", "1948-49", 5, 1],
            ["Bologna FC", "I1", "1948-49", 5, 2],
            ["Lucchese", "I1", "1948-49", 8, 1],
            ["US Triestina", "I1", "1948-49", 8, 2],
            ["ACF Fiorentina", "I1", "1948-49", 8, 3],
            ["Palermo FC", "I1", "1948-49", 11, 1],
            ["Calcio Padova", "I1", "1948-49", 11, 2],
            ["Novara Calcio", "I1", "1948-49", 15, 1],
            ["Atalanta", "I1", "1948-49", 15, 2],
            ["Aurora Pro Patria", "I1", "1948-49", 17, 1],
            ["SSC Bari", "I1", "1948-49", 17, 2],
            ["Torino FC", "I1", "1949-50", 6, 1],
            ["Como 1907", "I1", "1949-50", 6, 2],
            ["Atalanta", "I1", "1949-50", 8, 1],
            ["US Triestina", "I1", "1949-50", 8, 2],
            ["Aurora Pro Patria", "I1", "1949-50", 11, 1],
            ["Genoa CFC", "I1", "1949-50", 11, 2],
            ["Sampdoria", "I1", "1949-50", 13, 1],
            ["Palermo FC", "I1", "1949-50", 13, 2],
            ["Bologna FC", "I1", "1949-50", 15, 1],
            ["Lucchese", "I1", "1949-50", 15, 2],
            ["Novara Calcio", "I1", "1949-50", 17, 1],
            ["AS Roma", "I1", "1949-50", 17, 2],
            ["SSC Napoli", "I1", "1950-51", 6, 1],
            ["Bologna FC", "I1", "1950-51", 6, 2],
            ["Palermo FC", "I1", "1950-51", 10, 1],
            ["Aurora Pro Patria", "I1", "1950-51", 10, 2],
            ["Novara Calcio", "I1", "1950-51", 12, 1],
            ["Sampdoria", "I1", "1950-51", 12, 2],
            ["Lucchese", "I1", "1950-51", 15, 1],
            ["US Triestina", "I1", "1950-51", 15, 2],
            ["Torino FC", "I1", "1950-51", 15, 3],
            ["ACF Fiorentina", "I1", "1951-52", 4, 1],
            ["Lazio Roma", "I1", "1951-52", 4, 2],
            ["SPAL 2013 Ferrara", "I1", "1951-52", 9, 1],
            ["Aurora Pro Patria", "I1", "1951-52", 9, 2],
            ["Atalanta", "I1", "1951-52", 12, 1],
            ["Como 1907", "I1", "1951-52", 12, 2],
            ["Udinese Calcio", "I1", "1951-52", 12, 3],
            ["Torino FC", "I1", "1951-52", 12, 4],
            ["Lucchese", "I1", "1951-52", 18],
            ["SPAL 2013 Ferrara", "I1", "1952-53", 8, 1],
            ["Atalanta", "I1", "1952-53", 8, 2],
            ["Torino FC", "I1", "1952-53", 10, 1],
            ["Lazio Roma", "I1", "1952-53", 10, 2],
            ["Sampdoria", "I1", "1952-53", 10, 3],
            ["Novara Calcio", "I1", "1952-53", 10, 4],
            ["Udinese Calcio", "I1", "1952-53", 10, 5],
            ["US Triestina", "I1", "1952-53", 15, 1],
            ["Palermo FC", "I1", "1952-53", 15, 2],
            ["AC Milan", "I1", "1953-54", 3, 1],
            ["ACF Fiorentina", "I1", "1953-54", 3, 2],
            ["Genoa CFC", "I1", "1953-54", 12, 1],
            ["US Triestina", "I1", "1953-54", 12, 2],
            ["Sampdoria", "I1", "1954-55", 9, 1],
            ["Torino FC", "I1", "1954-55", 9, 2],
            ["Calcio Catania", "I1", "1954-55", 12, 1],
            ["Lazio Roma", "I1", "1954-55", 12, 2],
            ["US Triestina", "I1", "1954-55", 12, 3],
            ["Atalanta", "I1", "1954-55", 15, 1],
            ["Novara Calcio", "I1", "1954-55", 15, 2],
            ["Inter", "I1", "1955-56", 3, 1],
            ["Lazio Roma", "I1", "1955-56", 3, 2],
            ["AS Roma", "I1", "1955-56", 6, 1],
            ["Sampdoria", "I1", "1955-56", 6, 2],
            ["SPAL 2013 Ferrara", "I1", "1955-56", 9, 1],
            ["Genoa CFC", "I1", "1955-56", 9, 2],
            ["Torino FC", "I1", "1955-56", 9, 3],
            ["Juventus", "I1", "1955-56", 9, 4],
            ["L.R. Vicenza", "I1", "1955-56", 9, 5],
            ["Inter", "I1", "1956-57", 5, 1],
            ["Bologna FC", "I1", "1956-57", 5, 2],
            ["Torino FC", "I1", "1956-57", 5, 3],
            ["Sampdoria", "I1", "1956-57", 5, 4],
            ["Juventus", "I1", "1956-57", 9, 1],
            ["SPAL 2013 Ferrara", "I1", "1956-57", 9, 2],
            ["L.R. Vicenza", "I1", "1956-57", 11, 1],
            ["SSC Napoli", "I1", "1956-57", 11, 2],
            ["Calcio Padova", "I1", "1956-57", 11, 3],
            ["AS Roma", "I1", "1956-57", 14, 1],
            ["Atalanta", "I1", "1956-57", 14, 2],
            ["L.R. Vicenza", "I1", "1957-58", 7, 1],
            ["Torino FC", "I1", "1957-58", 7, 2],
            ["AC Milan", "I1", "1957-58", 9, 1],
            ["Udinese Calcio", "I1", "1957-58", 9, 2],
            ["Inter", "I1", "1957-58", 9, 3],
            ["Genoa CFC", "I1", "1957-58", 12, 1],
            ["Sampdoria", "I1", "1957-58", 12, 2],
            ["US Alessandria 1912", "I1", "1957-58", 12, 3],
            ["Lazio Roma", "I1", "1957-58", 12, 4],
            ["SPAL 2013 Ferrara", "I1", "1957-58", 12, 5],
            ["L.R. Vicenza", "I1", "1958-59", 7, 1],
            ["Calcio Padova", "I1", "1958-59", 7, 2],
            ["SSC Napoli", "I1", "1958-59", 7, 3],
            ["SSC Bari", "I1", "1958-59", 11, 1],
            ["Genoa CFC", "I1", "1958-59", 11, 2],
            ["Lazio Roma", "I1", "1958-59", 11, 3],
            ["US Triestina", "I1", "1958-59", 17, 1],
            ["Torino FC", "I1", "1958-59", 17, 2],
            ["Bologna FC", "I1", "1959-60", 5, 1],
            ["Calcio Padova", "I1", "1959-60", 5, 2],
            ["SPAL 2013 Ferrara", "I1", "1959-60", 5, 3],
            ["SSC Bari", "I1", "1959-60", 13, 1],
            ["SSC Napoli", "I1", "1959-60", 13, 2],
            ["Bologna FC", "I1", "1960-61", 9, 1],
            ["Atalanta", "I1", "1960-61", 9, 3],
            ["L.R. Vicenza", "I1", "1960-61", 9, 3],
            ["Torino FC", "I1", "1960-61", 12, 1],
            ["SPAL 2013 Ferrara", "I1", "1960-61", 12, 2],
            ["Calcio Lecco 1912", "I1", "1960-61", 14],
            ["SSC Bari", "I1", "1960-61", 16],
            ["Sampdoria", "I1", "1961-62", 10, 1],
            ["Calcio Catania", "I1", "1961-62", 10, 2],
            ["Venezia FC", "I1", "1961-62", 12, 1],
            ["Juventus", "I1", "1961-62", 12, 2],
            ["L.R. Vicenza", "I1", "1961-62", 14, 1],
            ["SPAL 2013 Ferrara", "I1", "1961-62", 14, 2],
            ["Calcio Padova", "I1", "1961-62", 16, 1],
            ["Calcio Lecco 1912", "I1", "1961-62", 16, 2],
            ["Atalanta", "I1", "1962-63", 8, 1],
            ["SPAL 2013 Ferrara", "I1", "1962-63", 8, 2],
            ["Torino FC", "I1", "1962-63", 8, 3],
            ["Sampdoria", "I1", "1962-63", 11, 1],
            ["Modena FC", "I1", "1962-63", 11, 2],
            ["Mantova 1911 SSD", "I1", "1962-63", 11, 3],
            ["Calcio Catania", "I1", "1962-63", 11, 4],
            ["ACF Fiorentina", "I1", "1963-64", 4, 1],
            ["Juventus", "I1", "1963-64", 4, 2],
            ["Genoa CFC", "I1", "1963-64", 8, 1],
            ["Lazio Roma", "I1", "1963-64", 8, 2],
            ["Calcio Catania", "I1", "1963-64", 8, 3],
            ["Atalanta", "I1", "1963-64", 8, 4],
            ["AS Roma", "I1", "1963-64", 12, 1],
            ["Mantova 1911 SSD", "I1", "1963-64", 12, 2],
            ["ACF Fiorentina", "I1", "1964-65", 4, 1],
            ["Juventus", "I1", "1964-65", 4, 2],
            ["Bologna FC", "I1", "1964-65", 6, 1],
            ["Cagliari Calcio", "I1", "1964-65", 6, 2],
            ["Foggia Calcio", "I1", "1964-65", 9, 1],
            ["AS Roma", "I1", "1964-65", 9, 2],
            ["AS Varese 1910", "I1", "1964-65", 11, 1],
            ["L.R. Vicenza", "I1", "1964-65", 11, 2],
            ["Atalanta", "I1", "1964-65", 11, 3],
            ["Lazio Roma", "I1", "1964-65", 14, 1],
            ["Sampdoria", "I1", "1964-65", 14, 2],
            ["Foggia Calcio", "I1", "1965-66", 12, 1],
            ["Lazio Roma", "I1", "1965-66", 12, 2],
            ["Atalanta", "I1", "1965-66", 12, 3],
            ["L.R. Vicenza", "I1", "1966-67", 13, 1],
            ["Brescia Calcio", "I1", "1966-67", 13, 2],
            ["Venezia FC", "I1", "1966-67", 17, 1],
            ["Calcio Lecco 1912", "I1", "1966-67", 17, 2],
            ["Inter", "I1", "1967-68", 5, 1],
            ["Bologna FC", "I1", "1967-68", 5, 2],
            ["Torino FC", "I1", "1967-68", 7, 1],
            ["AS Varese 1910", "I1", "1967-68", 7, 2],
            ["Sampdoria", "I1", "1967-68", 10, 1],
            ["AS Roma", "I1", "1967-68", 10, 2],
            ["L.R. Vicenza", "I1", "1967-68", 12, 1],
            ["Atalanta", "I1", "1967-68", 12, 2],
            ["SPAL 2013 Ferrara", "I1", "1967-68", 14, 1],
            ["Brescia Calcio", "I1", "1967-68", 14, 2],
            ["AC Milan", "I1", "1969-70", 4, 1],
            ["ACF Fiorentina", "I1", "1969-70", 4, 2],
            ["Lazio Roma", "I1", "1969-70", 8, 1],
            ["L.R. Vicenza", "I1", "1969-70", 8, 2],
            ["Hellas Verona", "I1", "1973-74", 16],
            ["AC Milan", "I1", "1979-80", 15],
            ["Lazio Roma", "I1", "1979-80", 16],
            ["Brescia Calcio", "I1", "1980-81", 14],
            ["Como 1907", "I1", "1980-81", 13],
            ["Udinese Calcio", "I1", "1980-81", 12],
            ["Ascoli Calcio", "I1", "1980-81", 11],
            ["AC Milan", "I1", "1983-84", 6],
            ["Sampdoria", "I1", "1983-84", 7],
            ["Hellas Verona", "I1", "1983-84", 8],
            ["SSC Napoli", "I1", "1983-84", 11],
            ["US Avellino", "I1", "1983-84", 12],
            ["Lazio Roma", "I1", "1983-84", 13],
            ["AC Milan", "I1", "1984-85", 5],
            ["Udinese Calcio", "I1", "1984-85", 12],
            ["Como 1907", "I1", "1984-85", 11],
            ["Lazio Roma", "I1", "1984-85", 15],
            ["Torino FC", "I1", "1985-86", 4],
            ["Sampdoria", "I1", "1985-86", 12],
            ["AC Milan", "I1", "1986-87", 5],
            ["ACF Fiorentina", "I1", "1992-93", 16],
            ["Lazio Roma", "I1", "1993-94", 3],
            ["Parma Calcio 1913", "I1", "1994-95", 2],
            ["Genoa CFC", "I1", "1994-95", 15],
            ["Piacenza Calcio", "I1", "1996-97", 14],
            ["Empoli FC", "I1", "1997-98", 13],
            ["Udinese Calcio", "I1", "1998-99", 6],
            ["Cagliari Calcio", "I1", "1998-99", 13],
            ["Hellas Verona", "I1", "2000-01", 14],
            ["Modena FC", "I1", "2002-03", 12],
            ["Empoli FC", "I1", "2002-03", 13],
            ["Reggina 1914", "I1", "2002-03", 14],
            ["ACN Siena 1904", "I1", "2003-04", 14],
            ["Reggina 1914", "I1", "2004-05", 10],
            ["US Lecce", "I1", "2004-05", 11],
            ["Cagliari Calcio", "I1", "2004-05", 12],
            ["Lazio Roma", "I1", "2004-05", 13],
            ["Bologna FC", "I1", "2004-05", 18],
            ["Parma Calcio 1913", "I1", "2005-06", 7],
            ["Juventus", "I1", "2005-06", 20],
            ["Palermo FC", "I1", "2006-07", 5],
            ["Torino FC", "I1", "2006-07", 16],
            ["Juventus", "I1", "2008-09", 2],
            ["ACF Fiorentina", "I1", "2008-09", 4],
            ["Chievo Verona", "I1", "2009-10", 14],
            ["Udinese Calcio", "I1", "2009-10", 15],
            ["Cagliari Calcio", "I1", "2009-10", 16],
            ["Empoli FC", "I1", "2015-16", 10],
            ["Palermo FC", "I1", "2015-16", 16],
            ["Udinese Calcio", "I1", "2017-18", 14],
            ["Parma Calcio 1913", "I1", "2018-19", 14],
            ["Cagliari Calcio", "I1", "2018-19", 15],
            ["ACF Fiorentina", "I1", "2018-19", 16],
            ["Hellas Verona", "I1", "2019-20", 9],
            ["Spezia Calcio", "I1", "2022-23", 17],
            ["Torino FC", "I1", "2023-24", 9],
            ["Cagliari Calcio", "I1", "2023-24", 16],
            ["Cagliari Calcio", "I1", "2024-25", 15],

            // Germany
            ["MSV Duisburg", "D1", "1963-64", 2],
            ["Fortuna Düsseldorf", "D1", "1966-67", 17],
            ["1. FC Köln", "D1", "1968-69", 13],

            // Spain
            ["CD Alavés", "SP1", "1930-31", 8],
            ["CD Alavés", "SP1", "1931-32", 9],
            ["Real Sociedad", "SP1", "1933-34", 5],
            ["Valencia CF", "SP1", "1933-34", 7],
            ["RCD Espanyol", "SP1", "1934-35", 8],
            ["Real Zaragoza", "SP1", "1939-40", 7],
            ["FC Barcelona", "SP1", "1939-40", 9],
            ["Valencia CF", "SP1", "1940-41", 3],
            ["Sevilla FC", "SP1", "1941-42", 6],
            ["CD Castellón", "SP1", "1941-42", 8],
            ["CE Sabadell", "SP1", "1943-44", 9],
            ["Real Murcia", "SP1", "1944-45", 11],
            ["CE Sabadell", "SP1", "1944-45", 13],
            ["Valencia CF", "SP1", "1946-47", 1],
            ["Real Madrid", "SP1", "1946-47", 7],
            ["Athletic Club", "SP1", "1948-49", 6],
            ["Real Valladolid", "SP1", "1950-51", 6],
            ["Deportivo La Coruña", "SP1", "1950-51", 12],
            ["Racing Santander", "SP1", "1950-51", 10],
            ["Deportivo La Coruña", "SP1", "1951-52", 11],
            ["Racing Santander", "SP1", "1951-52", 14],
            ["Sporting Gijón", "SP1", "1952-53", 7],
            ["Sevilla FC", "SP1", "1953-54", 5],
            ["Real Sociedad", "SP1", "1953-54", 9],
            ["Celta de Vigo", "SP1", "1953-54", 10],
            ["Real Valladolid", "SP1", "1954-55", 9],
            ["CD Alavés", "SP1", "1954-55", 10],
            ["Real Sociedad", "SP1", "1955-56", 8],
            ["Sevilla FC", "SP1", "1956-57", 2],
            ["UD Las Palmas", "SP1", "1956-57", 10],
            ["Granada CF", "SP1", "1957-58", 13],
            ["CA Osasuna", "SP1", "1958-59", 8],
            ["Real Zaragoza", "SP1", "1958-59", 9],
            ["Sevilla FC", "SP1", "1958-59", 12],
            ["Real Oviedo", "SP1", "1959-60", 6],
            ["Elche CF", "SP1", "1960-61", 14],
            ["Real Betis", "SP1", "1960-61", 6],
            ["Real Oviedo", "SP1", "1961-62", 10],
            ["FC Barcelona", "SP1", "1962-63", 6],
            ["Real Betis", "SP1", "1962-63", 9],
            ["Sevilla FC", "SP1", "1962-63", 11],
            ["CE Sabadell", "SP1", "1965-66", 14],
            ["RCD Espanyol", "SP1", "1965-66", 12],
            ["Sevilla FC", "SP1", "1965-66", 8],
            ["Elche CF", "SP1", "1966-67", 9],
            ["Elche CF", "SP1", "1967-68", 10],
            ["Granada CF", "SP1", "1968-69", 8],
            ["Athletic Club", "SP1", "1968-69", 11],
            ["Sevilla FC", "SP1", "1969-70", 3],
            ["FC Barcelona", "SP1", "1969-70", 4],
            ["Elche CF", "SP1", "1969-70", 11],
            ["Valencia CF", "SP1", "1970-71", 1],
            ["Granada CF", "SP1", "1970-71", 10],
            ["Real Sociedad", "SP1", "1971-72", 8],
            ["Real Betis", "SP1", "1971-72", 13],
            ["Real Sociedad", "SP1", "1972-73", 7],
            ["Athletic Club", "SP1", "1972-73", 9],
            ["Granada CF", "SP1", "1972-73", 13],
            ["Sporting Gijón", "SP1", "1972-73", 14],
            ["Elche CF", "SP1", "1974-75", 8],
            ["Granada CF", "SP1", "1974-75", 15],
            ["UD Las Palmas", "SP1", "1975-76", 13],
            ["UD Las Palmas", "SP1", "1976-77", 4],
            ["Real Betis", "SP1", "1976-77", 5],
            ["RCD Espanyol", "SP1", "1976-77", 6],
            ["Burgos CF", "SP1", "1976-77", 14],
            ["Sevilla FC", "SP1", "1977-78", 8],
            ["Rayo Vallecano", "SP1", "1977-78", 10],
            ["RCD Espanyol", "SP1", "1977-78", 14],
            ["Real Betis", "SP1", "1977-78", 16],
            ["Real Betis", "SP1", "1979-80", 5],
            ["Real Zaragoza", "SP1", "1979-80", 11],
            ["Real Sociedad", "SP1", "1980-81", 1],
            ["Real Madrid", "SP1", "1980-81", 2],
            ["Atlético Madrid", "SP1", "1980-81", 3],
            ["Valencia", "SP1", "1980-81", 4],
            ["Atlético Madrid", "SP1", "1981-82", 8],
            ["Real Valladolid", "SP1", "1981-82", 9],
            ["CA Osasuna", "SP1", "1981-82", 10],
            ["Real Zaragoza", "SP1", "1981-82", 11],
            ["Racing Santander", "SP1", "1981-82", 12],
            ["RCD Espanyol", "SP1", "1981-82", 13],
            ["Málaga CF", "SP1", "1982-83", 10],
            ["CA Osasuna", "SP1", "1984-85", 6],
            ["UD Las Palmas", "SP1", "1985-86", 13],
            ["Sporting Gijón", "SP1", "1986-87", 4],
            ["Real Zaragoza", "SP1", "1986-87", 5],
            ["RCD Mallorca", "SP1", "1986-87", 6],
            ["Atlético Madrid", "SP1", "1986-87", 7],
            ["Real Valladolid", "SP1", "1986-87", 10],
            ["Real Murcia", "SP1", "1986-87", 11],
            ["Sevilla FC", "SP1", "1986-87", 12],
            ["CE Sabadell", "SP1", "1986-87", 15],
            ["CD Logroñés", "SP1", "1987-88", 13],
            ["Real Zaragoza", "SP1", "1988-89", 5],
            ["Real Oviedo", "SP1", "1988-89", 12],
            ["CA Osasuna", "SP1", "1989-90", 8],
            ["Cádiz CF", "SP1", "1989-90", 15],
            ["Burgos CF", "SP1", "1990-91", 11],
            ["Athletic Club", "SP1", "1990-91", 12],
            ["RCD Mallorca", "SP1", "1990-91", 15],
            ["CD Logroñés", "SP1", "1991-92", 10],
            ["Athletic Club", "SP1", "1991-92", 14],
            ["Real Valladolid", "SP1", "1991-92", 19],
            ["Sporting Gijón", "SP1", "1992-93", 12],
            ["Sevilla FC", "SP1", "1994-95", 5],
            ["Valencia CF", "SP1", "1994-95", 10],
            ["Real Zaragoza", "SP1", "1995-96", 13],
            ["Athletic Club", "SP1", "1995-96", 15],
            ["Albacete", "SP1", "1995-96", 20],
            ["Deportivo La Coruña", "SP1", "1996-97", 3],
            ["Atlético Madrid", "SP1", "1997-98", 7],
            ["UD Salamanca", "SP1", "1997-98", 15],
            ["RCD Espanyol", "SP1", "1999-00", 14],
            ["Real Oviedo", "SP1", "1999-00", 16],
            ["Athletic Club", "SP1", "2000-01", 12],
            ["Rayo Vallecano", "SP1", "2000-01", 14],
            ["CA Osasuna", "SP1", "2000-01", 15],
            ["Real Valladolid", "SP1", "2000-01", 16],
            ["Málaga CF", "SP1", "2001-02", 10],
            ["CA Osasuna", "SP1", "2002-03", 11],
            ["Málaga CF", "SP1", "2002-03", 13],
            ["Real Zaragoza", "SP1", "2003-04", 12],
            ["Deportivo La Coruña", "SP1", "2004-05", 8],
            ["CA Osasuna", "SP1", "2005-06",4],
            ["Real Sociedad", "SP1", "2005-06", 16],
            ["Real Madrid", "SP1", "2006-07", 1],
            ["RCD Espanyol", "SP1", "2006-07", 11],
            ["Atlético Madrid", "SP1", "2007-08", 4],
            ["UD Almería", "SP1", "2007-08", 8],
            ["Real Betis", "SP1", "2007-08", 13],
            ["UD Almería", "SP1", "2008-09", 11],
            ["Sporting Gijón", "SP1", "2008-09", 14],
            ["CA Osasuna", "SP1", "2008-09", 15],
            ["Sevilla FC", "SP1", "2010-11", 5],
            ["Athletic Club", "SP1", "2010-11", 6],
            ["Real Zaragoza", "SP1", "2010-11", 13],
            ["Getafe CF", "SP1", "2011-12", 11],
            ["Getafe CF", "SP1", "2013-14", 13],
            ["Levante UD", "SP1", "2014-15", 14],
            ["SD Eibar", "SP1", "2014-15", 18],
            ["UD Las Palmas", "SP1", "2015-16", 11],
            ["RCD Espanyol", "SP1", "2015-16", 13],
            ["Granada CF", "SP1", "2015-16", 16],
            ["RCD Espanyol", "SP1", "2017-18", 11],
            ["Getafe CF", "SP1", "2018-19", 5],
            ["Real Valladolid", "SP1", "2018-19", 16],
            ["Granada CF", "SP1", "2020-21", 9],
            ["RCD Mallorca", "SP1", "2021-22", 16],
            ["Rayo Vallecano", "SP1", "2022-23", 11],
            ["Cádiz CF", "SP1", "2022-23", 14],
            ["Getafe CF", "SP1", "2022-23", 15],
            ["Celta de Vigo", "SP1", "2023-24", 13],
            ["Rayo Vallecano", "SP1", "2024-25", 8],
            ["Real Sociedad", "SP1", "2024-25", 11],
            ["RCD Espanyol", "SP1", "2024-25", 14],
            ["Girona FC", "SP1", "2024-25", 16],

            // England
            ["Burnley FC", "E0", "1891-92", 7],
            ["Sheffield United", "E0", "1896-97", 2],
            ["Aston Villa", "E0", "1897-98", 6],
            ["Middlesbrough FC", "E0", "1904-05", 15],
            ["Bradford City", "E0", "1914-15", 11],
            ["Huddersfield Town", "E0", "1923-24", 1],
            ["Birmingham City", "E0", "1936-37", 11],
            ["Bolton Wanderers", "E0", "1948-49", 14],
            ["Bolton Wanderers", "E0", "1949-50", 16],
            ["Sunderland AFC", "E0", "1950-51", 12],
            ["Fulham FC", "E0", "1950-51", 18],
            ["Manchester United", "E0", "1953-54", 4],
            ["Blackpool FC", "E0", "1955-56", 2],
            ["Chelsea FC", "E0", "1956-57", 13],
            ["Leicester City", "E0", "1964-65", 18],
            ["Aston Villa", "E0", "1965-66", 16],
            ["Nottingham Forest", "E0", "1966-67", 2],
            ["Burnley FC", "E0", "1966-67", 14],
            ["Nottingham Forest", "E0", "1971-72", 21],
            ["Liverpool FC", "E0", "1974-75", 2],

            // France
            // Add ranking overrides here as needed
            ["Olympique Lillois Lille", "F1", "1932-33", 1],
            ["AS Cannes", "F1", "1932-33", 2],
            ["Olympique Marseille", "F1", "1934-35", 9],
            ["FC Sochaux", "F1", "1938-39", 6],
            ["SC Sète", "F1", "1948-49", 14],
            ["Olympique Marseille", "F1", "1955-56", 5],
            ["AS Monaco", "F1", "1957-58", 3],
            ["RC Strasbourg", "F1", "1959-60", 18],
            ["Stade de Reims", "F1", "1961-62", 1],
            ["FC Rouen 1899", "F1", "1961-62", 9],
            ["Stade Français", "F1", "1961-62", 10],
            ["FC Metz", "F1", "2023-24", 16]


        ];
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
    const pointDeductions = [
        { team: 'Genoa CFC', points: 18, startDate: '1959-09-20', endDate: '1960-06-05', league: 'I1' },
        { team: 'Foggia Calcio', points: 6, startDate: '1973-10-07', endDate: '1974-05-19', league: 'I1' },
        { team: 'Sampdoria', points: 3, startDate: '1973-10-07', endDate: '1974-05-19', league: 'I1' },
        { team: 'SSC Napoli', points: 1, startDate: '1976-10-03', endDate: '1977-05-22', league: 'I1' },
        { team: 'Bologna FC', points: 5, startDate: '1980-09-14', endDate: '1981-05-24', league: 'I1' },
        { team: 'US Avellino', points: 5, startDate: '1980-09-14', endDate: '1981-05-24', league: 'I1' },
        { team: 'AC Perugia', points: 5, startDate: '1980-09-14', endDate: '1981-05-24', league: 'I1' },
        { team: 'Udinese Calcio', points: 9, startDate: '1986-09-14', endDate: '1987-05-17', league: 'I1' },
        { team: 'Empoli FC', points: 5, startDate: '1987-09-13', endDate: '1988-05-15', league: 'I1' },
        { team: 'Empoli FC', points: 2, startDate: '1998-09-12', endDate: '1999-05-23', league: 'I1' },
        { team: 'AC Milan', points: 30, startDate: '2005-08-27', endDate: '2006-05-14', league: 'I1' },
        { team: 'Lazio Roma', points: 30, startDate: '2005-08-27', endDate: '2006-05-14', league: 'I1' },
        { team: 'ACF Fiorentina', points: 30, startDate: '2005-08-27', endDate: '2006-05-14', league: 'I1' },
        { team: 'ACN Siena 1904', points: 1, startDate: '2006-09-09', endDate: '2007-05-26', league: 'I1' },
        { team: 'ACF Fiorentina', points: 15, startDate: '2006-09-09', endDate: '2007-05-26', league: 'I1' },
        { team: 'Reggina 1914', points: 11, startDate: '2006-09-09', endDate: '2007-05-26', league: 'I1' },
        { team: 'AC Milan', points: 8, startDate: '2006-09-09', endDate: '2007-05-26', league: 'I1' },
        { team: 'Lazio Roma', points: 3, startDate: '2006-09-09', endDate: '2007-05-26', league: 'I1' },
        { team: 'Bologna FC', points: 3, startDate: '2010-08-28', endDate: '2011-05-22', league: 'I1' },
        { team: 'Atalanta', points: 6, startDate: '2011-09-09', endDate: '2012-05-13', league: 'I1' },
        { team: 'Sampdoria', points: 1, startDate: '2012-08-25', endDate: '2013-05-19', league: 'I1' },
        { team: 'Torino FC', points: 1, startDate: '2012-08-25', endDate: '2013-05-19', league: 'I1' },
        { team: 'Atalanta', points: 2, startDate: '2012-08-25', endDate: '2013-05-19', league: 'I1' },
        { team: 'ACN Siena 1904', points: 6, startDate: '2012-08-25', endDate: '2013-05-19', league: 'I1' },
        { team: 'Parma Calcio 1913', points: 7, startDate: '2014-08-30', endDate: '2015-05-31', league: 'I1' },
        { team: 'Lazio Roma', points: 1, startDate: '2017-08-19', endDate: '2018-05-20', league: 'I1' },
        { team: 'Lazio Roma', points: 2, startDate: '2018-08-18', endDate: '2019-05-26', league: 'I1' },
        { team: 'Chievo Verona', points: 3, startDate: '2018-08-18', endDate: '2019-05-26', league: 'I1' },
        { team: 'Juventus', points: 10, startDate: '2022-08-13', endDate: '2023-06-04', league: 'I1' },
        
        // Other leagues deductions...
        { team: '1. FC Kaiserslautern', points: 3, startDate: '2003-08-01', endDate: '2004-05-22', league: 'D1' },
        { team: 'Eintracht Frankfurt', points: 2, startDate: '1999-08-13', endDate: '2000-05-20', league: 'D1' },
        { team: 'Dynamo Dresden', points: 4, startDate: '1993-08-06', endDate: '1994-05-07', league: 'D1' },
        { team: 'Sunderland AFC', points: 2, startDate: '1890-08-01', endDate: '1891-05-31', league: 'E0' },
        { team: 'Arsenal FC', points: 2, startDate: '1990-08-01', endDate: '1991-05-31', league: 'E0' },
        { team: 'Manchester United', points: 1, startDate: '1990-08-01', endDate: '1991-05-31', league: 'E0' },
        { team: 'Middlesbrough FC', points: 3, startDate: '1996-08-17', endDate: '1997-05-11', league: 'E0' },
        { team: 'Portsmouth FC', points: 9, startDate: '2009-08-15', endDate: '2010-05-09', league: 'E0' },
        { team: 'Everton FC', points: 6, startDate: '2023-08-11', endDate: '2024-05-19', league: 'E0' },
        { team: 'Everton FC', points: 2, startDate: '2023-08-11', endDate: '2024-05-19', league: 'E0' }, // second 2023-24 PSR deduction (April 2024); 8 in total that season
        { team: 'Nottingham Forest', points: 4, startDate: '2023-08-11', endDate: '2024-05-19', league: 'E0' },
        { team: 'Olympique Marseille', points: 1, startDate: '1992-08-08', endDate: '1993-06-02', league: 'F1' },
        { team: 'Valenciennes FC', points: 1, startDate: '1992-08-08', endDate: '1993-06-02', league: 'F1' },
        { team: 'FC Metz', points: 1, startDate: '2007-08-04', endDate: '2008-05-17', league: 'F1' },
        { team: 'AC Ajaccio', points: 2, startDate: '2012-08-10', endDate: '2013-05-26', league: 'F1' },
        { team: 'OGC Nice', points: 1, startDate: '2021-08-06', endDate: '2022-05-21', league: 'F1' },
        { team: 'Olympique Lyonnais', points: 1, startDate: '2021-08-06', endDate: '2022-05-21', league: 'F1' },
        { team: 'Montpellier HSC', points: 1, startDate: '2023-07-01', endDate: '2024-06-30', league: 'F1' },
        { team: 'UD Almería', points: 3, startDate: '2014-08-23', endDate: '2015-05-23', league: 'SP1' },
        { team: 'Racing Santander', points: 1, startDate: '2003-08-30', endDate: '2004-05-23', league: 'SP1' },
        { team: 'Málaga CF', points: 3, startDate: '1979-07-01', endDate: '1980-06-30', league: 'SP1' }
    ];

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
