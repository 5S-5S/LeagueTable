// Shared football search - the search bar on index.html and, in search
// mode (?search=...), on DomesticEurope.html / ContinentalEurope.html and
// their Mobile versions. Reads a plain-English query for teams, a season and
// what the visitor is after, and links each result to the sport page's view
// through that page's own Copy Link parameters (?view=&lg=&t1=...).
// Exposes window.LeagueSearch = { mount(container, options), searchFor,
// renderAnswer(el, ctx) } - renderAnswer words the search-mode answer line.
(function () {
    'use strict';

    // Every team across the 5 domestic leagues, extracted from
    // getTeamColors() in DomesticEurope.html: [name, league, crest id]
    const TEAM_DIRECTORY = [
        ['Liverpool FC','premier-league',1226],
        ['Arsenal FC','premier-league',127],
        ['Everton FC','premier-league',573],
        ['Manchester United','premier-league',1268],
        ['Aston Villa','premier-league',151],
        ['Manchester City','premier-league',1267],
        ['Chelsea FC','premier-league',373],
        ['Tottenham Hotspur','premier-league',1924],
        ['Newcastle United','premier-league',1355],
        ['Sunderland AFC','premier-league',1844],
        ['West Bromwich Albion','premier-league',2136],
        ['Wolverhampton Wanderers','premier-league',2151],
        ['Blackburn Rovers','premier-league',237],
        ['Bolton Wanderers','premier-league',250],
        ['Sheffield Wednesday','premier-league',1692],
        ['West Ham United','premier-league',2137],
        ['Derby County','premier-league',476],
        ['Sheffield United','premier-league',1691],
        ['Leeds United','premier-league',1197],
        ['Burnley FC','premier-league',290],
        ['Nottingham Forest','premier-league',1391],
        ['Middlesbrough FC','premier-league',1291],
        ['Stoke City','premier-league',1829],
        ['Leicester City','premier-league',1199],
        ['Birmingham City','premier-league',227],
        ['Preston North End','premier-league',1497],
        ['Southampton FC','premier-league',1753],
        ['Huddersfield Town','premier-league',1004],
        ['Portsmouth FC','premier-league',1491],
        ['Coventry City','premier-league',419],
        ['Blackpool FC','premier-league',238],
        ['Ipswich Town','premier-league',1058],
        ['Fulham FC','premier-league',847],
        ['Charlton Athletic','premier-league',371],
        ['Notts County','premier-league',1392],
        ['Norwich City','premier-league',1388],
        ['Queens Park Rangers','premier-league',1507],
        ['Crystal Palace','premier-league',429],
        ['Bury FC','premier-league',293],
        ['Cardiff City','premier-league',317],
        ['Luton Town','premier-league',1249],
        ['Wimbledon FC','premier-league',175380],
        ['Watford FC','premier-league',2130],
        ['Oldham Athletic','premier-league',1412],
        ['Grimsby Town','premier-league',920],
        ['Bradford City','premier-league',267],
        ['Brighton & Hove Albion','premier-league',276],
        ['Brentford FC','premier-league',274],
        ['Bristol City','premier-league',277],
        ['Swansea City','premier-league',1879],
        ['AFC Bournemouth','premier-league',65],
        ['Wigan Athletic','premier-league',2145],
        ['Hull City','premier-league',1005],
        ['Bradford Park Avenue','premier-league',19590],
        ['Accrington FC','premier-league',153758],
        ['Reading FC','premier-league',1542],
        ['Oxford United','premier-league',1445],
        ['Millwall FC','premier-league',1294],
        ['Northampton Town','premier-league',1386],
        ['Carlisle United','premier-league',318],
        ['Darwen','premier-league',22562],
        ['Barnsley FC','premier-league',200],
        ['Swindon Town','premier-league',1881],
        ['Leyton Orient','premier-league',1210],
        ['Glossop North End','premier-league',22711],
        ['Juventus','serie-a',1094],
        ['Inter','serie-a',1052],
        ['AC Milan','serie-a',43],
        ['AS Roma','serie-a',138],
        ['ACF Fiorentina','serie-a',48],
        ['Lazio Roma','serie-a',1187],
        ['SSC Napoli','serie-a',1794],
        ['Torino FC','serie-a',1916],
        ['Bologna FC','serie-a',249],
        ['Sampdoria','serie-a',1609],
        ['Atalanta','serie-a',155],
        ['Udinese Calcio','serie-a',1983],
        ['Genoa CFC','serie-a',626],
        ['Cagliari Calcio','serie-a',312],
        ['Parma Calcio 1913','serie-a',1458],
        ['Hellas Verona','serie-a',17579],
        ['Palermo FC','serie-a',2024],
        ['L.R. Vicenza','serie-a',2092],
        ['SSC Bari','serie-a',132],
        ['US Triestina','serie-a',2025],
        ['Brescia Calcio','serie-a',275],
        ['Chievo Verona','serie-a',382],
        ['SPAL 2013 Ferrara','serie-a',17467],
        ['AS Livorno','serie-a',135],
        ['Calcio Padova','serie-a',13756],
        ['Calcio Catania','serie-a',313],
        ['US Lecce','serie-a',2020],
        ['Empoli FC','serie-a',543],
        ['Ascoli Calcio','serie-a',143],
        ['US Alessandria 1912','serie-a',17792],
        ['Modena FC','serie-a',1305],
        ['Sassuolo Calcio','serie-a',13744],
        ['AC Perugia','serie-a',13749],
        ['Como 1907','serie-a',17583],
        ['Novara Calcio','serie-a',13765],
        ['Aurora Pro Patria','serie-a',18311],
        ['Venezia FC','serie-a',17626],
        ['Foggia Calcio','serie-a',13778],
        ['Cesena FC','serie-a',39],
        ['ACN Siena 1904','serie-a',45],
        ['Reggina 1914','serie-a',1556],
        ['US Avellino','serie-a',2015],
        ['Lucchese','serie-a',17676],
        ['Piacenza Calcio','serie-a',1469],
        ['Pro Vercelli','serie-a',19015],
        ['US Cremonese','serie-a',13777],
        ['Mantova 1911 SSD','serie-a',42],
        ['Pisa SC','serie-a',1472],
        ['US Catanzaro','serie-a',18392],
        ['AS Varese 1910','serie-a',17791],
        ['US Salernitana 1919','serie-a',13743],
        ['AC Liguria','serie-a',21606],
        ['ACR Messina','serie-a',672],
        ['Delfino Pescara','serie-a',13767],
        ['Casale','serie-a',19032],
        ['AC Monza','serie-a',13760],
        ['Spezia Calcio','serie-a',1768],
        ['Sampierdarenese','serie-a',21469],
        ['Calcio Lecco 1912','serie-a',18305],
        ['FC Crotone','serie-a',13759],
        ['Frosinone Calcio','serie-a',840],
        ['AC Reggiana','serie-a',13751],
        ['Legnano','serie-a',13763],
        ['Benevento Calcio','serie-a',13755],
        ['Ternana Calcio','serie-a',18096],
        ['AC Carpi','serie-a',17647],
        ['AC Ancona','serie-a',13742],
        ['US Pistoiese','serie-a',17651],
        ['ACD Treviso','serie-a',1932],
        ['Novese','serie-a',21471],
        ['Real Madrid','la-liga',1545],
        ['FC Barcelona','la-liga',597],
        ['Atlético Madrid','la-liga',162],
        ['Athletic Club','la-liga',156],
        ['Valencia CF','la-liga',2041],
        ['Sevilla FC','la-liga',1681],
        ['RCD Espanyol','la-liga',560],
        ['Real Sociedad','la-liga',1550],
        ['Real Betis','la-liga',1543],
        ['Celta de Vigo','la-liga',355],
        ['Real Zaragoza','la-liga',1553],
        ['Deportivo La Coruña','la-liga',469],
        ['Real Valladolid','la-liga',1552],
        ['CA Osasuna','la-liga',306],
        ['Sporting Gijón','la-liga',1779],
        ['Racing Santander','la-liga',1517],
        ['Real Oviedo','la-liga',13858],
        ['Málaga CF','la-liga',1262],
        ['RCD Mallorca','la-liga',1541],
        ['Villarreal CF','la-liga',2102],
        ['UD Las Palmas','la-liga',1975],
        ['Granada CF','la-liga',907],
        ['Rayo Vallecano','la-liga',1535],
        ['Getafe CF','la-liga',880],
        ['Elche CF','la-liga',538],
        ['CD Alavés','la-liga',327],
        ['Hércules CF','la-liga',972],
        ['Levante UD','la-liga',1207],
        ['Cádiz CF','la-liga',309],
        ['CD Tenerife','la-liga',350],
        ['Real Murcia','la-liga',1546],
        ['CE Sabadell','la-liga',18002],
        ['UD Salamanca','la-liga',1979],
        ['CD Castellón','la-liga',330],
        ['CD Logroñés','la-liga',17556],
        ['Burgos CF','la-liga',289],
        ['Córdoba CF','la-liga',411],
        ['Albacete','la-liga',81],
        ['UD Almería','la-liga',1973],
        ['SD Eibar','la-liga',1666],
        ['Girona FC','la-liga',627],
        ['Pontevedra CF','la-liga',1485],
        ['SD Compostela','la-liga',17860],
        ['CD Leganés','la-liga',17575],
        ['Recreativo Huelva','la-liga',1555],
        ['Arenas de Getxo','la-liga',19435],
        ['CD Numancia','la-liga',344],
        ['Gimnàstic de Tarragona','la-liga',886],
        ['CD Alcoyano','la-liga',328],
        ['Real Jaén','la-liga',1544],
        ['CF Extremadura','la-liga',17672],
        ['Mérida AD','la-liga',17108],
        ['Real Unión','la-liga',1551],
        ['AD Almería','la-liga',45477],
        ['SD Huesca','la-liga',1667],
        ['CE Europa','la-liga',20190],
        ['Lleida Esportiu','la-liga',17917],
        ['Xerez CD','la-liga',2163],
        ['CD Condal','la-liga',19467],
        ['Atlético Tetuán','la-liga',20179],
        ['Cultural Leonesa','la-liga',18975],
        ['Bayern München','bundesliga',209],
        ['Borussia Dortmund','bundesliga',258],
        ['Werder Bremen','bundesliga',2134],
        ['VfB Stuttgart','bundesliga',2076],
        ['Bor. Mönchengladbach','bundesliga',253],
        ['Hamburger SV','bundesliga',943],
        ['Eintracht Frankfurt','bundesliga',530],
        ['FC Schalke 04','bundesliga',694],
        ['Bayer Leverkusen','bundesliga',205],
        ['1. FC Köln','bundesliga',9],
        ['1. FC Kaiserslautern','bundesliga',6],
        ['Hertha BSC','bundesliga',977],
        ['VfL Bochum','bundesliga',2079],
        ['VfL Wolfsburg','bundesliga',2086],
        ['1. FC Nürnberg','bundesliga',12],
        ['Hannover 96','bundesliga',951],
        ['MSV Duisburg','bundesliga',1322],
        ['SC Freiburg','bundesliga',1639],
        ['Fortuna Düsseldorf','bundesliga',826],
        ['Karlsruher SC','bundesliga',1109],
        ['Eintracht Braunschweig','bundesliga',528],
        ['TSV 1860 München','bundesliga',1943],
        ['1. FSV Mainz 05','bundesliga',21],
        ['1899 Hoffenheim','bundesliga',24],
        ['Arminia Bielefeld','bundesliga',124],
        ['RB Leipzig','bundesliga',29680],
        ['FC Augsburg','bundesliga',594],
        ['KFC Uerdingen 05','bundesliga',1122],
        ['Hansa Rostock','bundesliga',953],
        ['FC St. Pauli','bundesliga',702],
        ['1. FC Union Berlin','bundesliga',19],
        ['SV Elversberg','bundesliga',13214],
        ['Waldhof Mannheim','bundesliga',2126],
        ['Kickers Offenbach','bundesliga',1127],
        ['Rot-Weiss Essen','bundesliga',1583],
        ['Energie Cottbus','bundesliga',545],
        ['Alemannia Aachen','bundesliga',86],
        ['SG Wattenscheid 09','bundesliga',13217],
        ['1. FC Saarbrücken','bundesliga',15],
        ['Dynamo Dresden','bundesliga',515],
        ['Rot-Weiß Oberhausen','bundesliga',1586],
        ['SV Darmstadt 98','bundesliga',1852],
        ['Wuppertaler SV','bundesliga',2157],
        ['Borussia Neunkirchen','bundesliga',260],
        ['FC 08 Homburg','bundesliga',589],
        ['SpVgg Unterhaching','bundesliga',1789],
        ['Stuttgarter Kickers','bundesliga',1838],
        ['FC Ingolstadt 04','bundesliga',644],
        ['1. FC Heidenheim 1846','bundesliga',5],
        ['SC Paderborn 07','bundesliga',1651],
        ['TeBe Berlin','bundesliga',1895],
        ['SpVgg Greuther Fürth','bundesliga',1787],
        ['SSV Ulm 1846','bundesliga',1798],
        ['Fortuna Köln','bundesliga',13215],
        ['Preußen Münster','bundesliga',1498],
        ['Holstein Kiel','bundesliga',995],
        ['Blau-Weiß 90 Berlin','bundesliga',18101],
        ['1. FC Lok Leipzig','bundesliga',13031],
        ['SV Tasmania Berlin','bundesliga',17842],
        ['Dresdner SC','bundesliga',17856],
        ['Rapid Vienna','bundesliga',1531],
        ['Viktoria Berlin','bundesliga',31115],
        ['Freiburger FC','bundesliga',17501],
        ['Karlsruher FV','bundesliga',18750],
        ['Olympique Marseille','ligue-1',1421],
        ['AS Monaco','ligue-1',136],
        ['Girondins Bordeaux','ligue-1',888],
        ['AS Saint-Étienne','ligue-1',139],
        ['Olympique Lyonnais','ligue-1',1420],
        ['Lille OSC','ligue-1',1435],
        ['Paris Saint-Germain','ligue-1',1457],
        ['OGC Nice','ligue-1',1408],
        ['Stade Rennais','ligue-1',1811],
        ['FC Nantes','ligue-1',676],
        ['FC Sochaux','ligue-1',700],
        ['RC Lens','ligue-1',1539],
        ['RC Strasbourg','ligue-1',1540],
        ['FC Metz','ligue-1',673],
        ['Stade de Reims','ligue-1',1810],
        ['Montpellier HSC','ligue-1',1314],
        ['AJ Auxerre','ligue-1',75],
        ['Toulouse FC','ligue-1',1925],
        ['Nîmes Olympique','ligue-1',1367],
        ['SC Bastia','ligue-1',1631],
        ['Racing Club de France','ligue-1',17870],
        ['Valenciennes FC','ligue-1',2042],
        ['Angers SCO','ligue-1',104],
        ['AS Nancy Lorraine','ligue-1',137],
        ['CS Sedan','ligue-1',435],
        ['Havre AC','ligue-1',1190],
        ['AS Cannes','ligue-1',17584],
        ['FC Rouen 1899','ligue-1',689],
        ['Stade Brestois 29','ligue-1',1806],
        ['SM Caen','ligue-1',1744],
        ['FC Lorient','ligue-1',663],
        ['Toulouse FC (old)','ligue-1',372165],
        ['SC Sète','ligue-1',698],
        ['FC Nancy','ligue-1',21749],
        ['Stade Français','ligue-1',18824],
        ['Stade Lavallois','ligue-1',1808],
        ['ESTAC Troyes','ligue-1',562],
        ['EA Guingamp','ligue-1',516],
        ['Red Star FC','ligue-1',17618],
        ['AC Ajaccio','ligue-1',36],
        ['SC Toulon','ligue-1',17378],
        ['CO Roubaix-Tourcoing','ligue-1',19938],
        ['Olympique Lillois Lille','ligue-1',18827],
        ['Excelsior Roubaix','ligue-1',18826],
        ['SC Fives Lille','ligue-1',18828],
        ['Le Mans FC','ligue-1',1191],
        ['FC Antibes','ligue-1',18829],
        ['Dijon FCO','ligue-1',482],
        ['FC Mulhouse','ligue-1',17401],
        ['Thonon Évian GGFC','ligue-1',423],
        ['Tours FC','ligue-1',1926],
        ['Olympique Alès','ligue-1',18532],
        ['Grenoble Foot 38','ligue-1',916],
        ['Limoges FC','ligue-1',19443],
        ['Paris FC','ligue-1',1456],
        ['Angoulême CFC','ligue-1',18946],
        ['Clermont Foot 63','ligue-1',392],
        ['FC Martigues','ligue-1',669],
        ['Amiens SC','ligue-1',100],
        ['RC Roubaix (old)','ligue-1',18823],
        ['Troyes AF','ligue-1',372147],
        ['SC Nîmes','ligue-1',374232],
        ['Chamois Niortais','ligue-1',368],
        ['SR Colmar','ligue-1',18938],
        ['CA Paris (old)','ligue-1',18832],
        ['Lyon OU','ligue-1',372012],
        ['FC Gueugnon','ligue-1',632],
        ['Gazélec FC Ajaccio','ligue-1',881],
        ['AS Béziers (old)','ligue-1',374706],
        ['FC Istres','ligue-1',647],
        ['LB Châteauroux','ligue-1',1188],
        ['US Boulogne','ligue-1',2017],
        ['Avenir Club Avignonnais','ligue-1',18936],
        ['AS Aix-en-Provence','ligue-1',17822],
        ['AC Arles-Avignon','ligue-1',37],
        ['Club Francais Paris','ligue-1',18833],
        ['Hyères FC','ligue-1',17597]
    ].map(([name, league, crestId]) => ({ name, league, crestId }));

    // The dropdown in the search bar picks a sport and competition; the
    // query is read for teams, a season and what the visitor is after (a
    // table, head to head, streaks, last time, season finishes, match
    // finder), and every result opens that view, or the Team Dashboard
    // (?league=&team= / ?team=) for a team on its own. Both pages redirect
    // to their Mobile versions with the query string intact, so every link
    // here is the desktop URL.

    // Season ranges mirror generateSeasons() on each page; an open end
    // ('1946-') runs up to the current season.
    const SEARCH_COMPETITIONS = [
        { key: 'premier-league', page: 'DomesticEurope.html', name: 'Premier League', badge: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
            seasons: '1888-1914,1919-1938,1946-',
            aliases: ['premier league', 'epl', 'english first division', 'first division', 'english league', 'england'] },
        { key: 'la-liga', page: 'DomesticEurope.html', name: 'La Liga', badge: '🇪🇸 La Liga',
            seasons: '1928-1935,1939-',
            aliases: ['la liga', 'laliga', 'primera division', 'spanish league', 'spain'] },
        { key: 'serie-a', page: 'DomesticEurope.html', name: 'Serie A', badge: '🇮🇹 Serie A',
            seasons: '1929-1942,1946-',
            aliases: ['serie a', 'italian league', 'italy'] },
        { key: 'bundesliga', page: 'DomesticEurope.html', name: 'Bundesliga', badge: '🇩🇪 Bundesliga',
            seasons: '1963-',
            aliases: ['bundesliga', 'german league', 'germany'] },
        { key: 'ligue-1', page: 'DomesticEurope.html', name: 'Ligue 1', badge: '🇫🇷 Ligue 1',
            seasons: '1932-1938,1945-',
            aliases: ['ligue 1', 'ligue un', 'french division 1', 'division 1', 'french league', 'france'] },
        { key: 'champions-league', page: 'ContinentalEurope.html', name: 'Champions League', badge: '🏆 Champions League',
            continental: true,
            seasons: '1955-',
            aliases: ['champions league', 'european cup', 'ucl', 'cl', 'europe'] }
    ];
    // Competition names that also mean an era - the old and new formats,
    // not just a rename (so Ligue 1 / Division 1 aren't here). Typing the
    // name means that era; leaving it out, or "all-time", means every
    // season. Values are the pages' own season keys.
    const ALIAS_ERAS = {
        'premier league': 'premier-league-era-1992-2025',
        'epl': 'premier-league-era-1992-2025',
        'first division': 'english-first-division-era-1888-1992',
        'english first division': 'english-first-division-era-1888-1992',
        'champions league': 'champions-league-era-1992-2026',
        'ucl': 'champions-league-era-1992-2026',
        'cl': 'champions-league-era-1992-2026',
        'european cup': 'european-cup-era-1955-1992'
    };
    // An era's name in answers and result labels
    const ERA_NAMES = {
        'premier-league-era-1992-2025': 'the Premier League',
        'english-first-division-era-1888-1992': 'the First Division',
        'champions-league-era-1992-2026': 'the Champions League',
        'european-cup-era-1955-1992': 'the European Cup'
    };

    const SEARCH_SCOPES = {
        'domestic': SEARCH_COMPETITIONS.filter(comp => !comp.continental)
    };
    SEARCH_COMPETITIONS.forEach(comp => { SEARCH_SCOPES[comp.key] = [comp]; });

    // Top-5-league clubs that have also played in the Champions League,
    // and the Champions-League-only clubs with their crests (from
    // getTeamColors() in ContinentalEurope.html). The live roster from
    // /api/teams?div=C1 is merged in on load, so a club new to the
    // competition still turns up (without a crest) before this is updated.
    const CONTINENTAL_DOMESTIC_TEAMS = [
        'Liverpool FC', 'Arsenal FC', 'Everton FC', 'Manchester United', 'Aston Villa', 'Manchester City',
        'Chelsea FC', 'Tottenham Hotspur', 'Newcastle United', 'Wolverhampton Wanderers', 'Blackburn Rovers',
        'Derby County', 'Leeds United', 'Burnley FC', 'Nottingham Forest', 'Leicester City', 'Ipswich Town',
        'Juventus', 'Inter', 'AC Milan', 'AS Roma', 'ACF Fiorentina', 'Lazio Roma', 'SSC Napoli', 'Torino FC',
        'Bologna FC', 'Sampdoria', 'Atalanta', 'Udinese Calcio', 'Cagliari Calcio', 'Parma Calcio 1913',
        'Hellas Verona', 'Chievo Verona', 'Como 1907', 'Real Madrid', 'FC Barcelona', 'Atlético Madrid',
        'Athletic Club', 'Valencia CF', 'Sevilla FC', 'Real Sociedad', 'Real Betis', 'Celta de Vigo',
        'Deportivo La Coruña', 'CA Osasuna', 'Málaga CF', 'RCD Mallorca', 'Villarreal CF', 'Girona FC',
        'Bayern München', 'Borussia Dortmund', 'Werder Bremen', 'VfB Stuttgart', 'Bor. Mönchengladbach',
        'Hamburger SV', 'Eintracht Frankfurt', 'FC Schalke 04', 'Bayer Leverkusen', '1. FC Köln',
        '1. FC Kaiserslautern', 'Hertha BSC', 'VfL Wolfsburg', '1. FC Nürnberg', 'Eintracht Braunschweig',
        'TSV 1860 München', '1899 Hoffenheim', 'RB Leipzig', 'Hansa Rostock', '1. FC Union Berlin',
        'Rot-Weiss Essen', '1. FC Saarbrücken', 'Dynamo Dresden', 'Rapid Vienna', 'Olympique Marseille', 'AS Monaco',
        'Girondins Bordeaux', 'AS Saint-Étienne', 'Olympique Lyonnais', 'Lille OSC', 'Paris Saint-Germain',
        'OGC Nice', 'Stade Rennais', 'FC Nantes', 'RC Lens', 'RC Strasbourg', 'FC Metz', 'Stade de Reims',
        'Montpellier HSC', 'AJ Auxerre', 'Toulouse FC', 'Stade Brestois 29'
    ];
    const CONTINENTAL_ONLY_CRESTS = {
        '1. FC Frankfurt (Oder)': 18726,
        '1. FC Magdeburg': 11,
        'AB Gladsaxe': 76,
        'AE Lárissa': 61,
        'AEK Athen': 62,
        'AEK Larnaca': 63,
        'AEL Limassol': 13915,
        'AFC Ajax': 64,
        'AIK': 72,
        'APOEL Nikosia': 110,
        'AS Trenčín': 17484,
        'AZ Alkmaar': 181,
        'Aalborg BK': 26,
        'Aarhus GF': 30,
        'Aberdeen FC': 33,
        'Anorthosis Famagusta': 106,
        'Apollon Limassol': 112,
        'Araks Ararat': 18592,
        'Ards FC': 18595,
        'Argeș Pitești': 121,
        'Aris Bonnevoie': 22641,
        'Aris Limassol': 18379,
        'Astra Giurgiu': 19098,
        'Athlone Town': 157,
        'Atlétic Escaldes': 21861,
        'Austria Wien': 175,
        'Avenir Beggen': 18514,
        'B 1903 København': 18133,
        'B 1909 Odense': 18121,
        'B 1913 Odense': 19334,
        'B36 Tórshavn': 12933,
        'B68 Toftir': 18583,
        'BATE Borisov': 204,
        'BFC Dynamo': 222,
        'BK Häcken': 232,
        'BSC Young Boys': 283,
        'Bangor City': 193,
        'Baník Ostrava': 195,
        'Barry Town United': 20138,
        'Beitar Jerusalem': 214,
        'Belshina Bobruisk': 18529,
        'Beşiktaş': 221,
        'Birkirkara FC': 12934,
        'Boavista': 242,
        'Bohemian FC': 245,
        'Bohemians Praha 1905': 246,
        'Borac Banja Luka': 255,
        'Botev Plovdiv': 263,
        'Breiðablik': 273,
        'Brøndby IF': 279,
        'Budapest Honvéd': 286,
        'Budapesti Vasas': 1208,
        'Bursaspor': 291,
        'CFR Cluj': 367,
        'CS FOLA Esch': 17881,
        'CS Grevenmacher': 12935,
        'CS Petrocub': 93015,
        'CS Universitatea Craiova': 69852,
        'CSKA Moskva': 439,
        'CSKA Sofia': 440,
        'Celtic FC': 356,
        'Chemnitzer FC': 375,
        'Cliftonville FC': 393,
        'Club Brugge KV': 396,
        'Coleraine FC': 404,
        'Connah\'s Quay Nomads': 3552,
        'Cork Celtic': 17793,
        'Cork City': 414,
        'Cork Hibernians': 18961,
        'Crusaders FC': 425,
        'Crvena Zvezda': 428,
        'Csepel SC': 20255,
        'Cwmbran Town': 20450,
        'DWS Amsterdam': 18478,
        'Dacia Chişinău': 12936,
        'Debreceni VSC': 1210,
        'Derry City': 477,
        'Dila Gori': 21860,
        'Dinamo Batumi': 18691,
        'Dinamo Brest': 483,
        'Dinamo Kiev': 486,
        'Dinamo Minsk': 487,
        'Dinamo Moskva': 488,
        'Dinamo Tbilisi': 12921,
        'Dinamo Zagreb': 489,
        'Djurgårdens IF': 493,
        'Dnepr Mogilev': 494,
        'Dnipro Dnipropetrovsk': 495,
        'Drogheda United': 504,
        'Drumcondra Dublin': 22598,
        'Dunaferr SE': 18535,
        'Dundalk FC': 509,
        'Dundee FC': 510,
        'Dundee United': 511,
        'EB/Streymur': 12937,
        'EPA Larnaca': 22508,
        'Egnatia Rrogozhine': 19585,
        'Erzgebirge Aue': 553,
        'Esbjerg fB': 557,
        'Etar Veliko Tarnovo': 17418,
        'Europa FC': 73791,
        'F91 Dudelange': 12922,
        'FBK Kaunas': 588,
        'FC Aarau': 590,
        'FC Admira Wacker': 57,
        'FC Alashkert': 50216,
        'FC Ararat': 12938,
        'FC Ararat-Armenia': 135578,
        'FC Atert Bissen': 22697,
        'FC Basel 1893': 598,
        'FC Blau Weiß Linz': 604,
        'FC Carl Zeiss Jena': 608,
        'FC Daugava': 753,
        'FC Differdange 03': 18517,
        'FC Dinamo Bucureşti': 485,
        'FC Dinamo City': 12911,
        'FC Flora': 818,
        'FC Hradec Králové': 642,
        'FC Iberia 1999': 57513,
        'FC Jazz Pori': 18679,
        'FC Koper': 2328,
        'FC Kuusysi (old)': 28968,
        'FC København': 651,
        'FC La Chaux-de-Fonds': 655,
        'FC Lausanne-Sport': 658,
        'FC Lugano': 664,
        'FC Lusitanos': 31101,
        'FC Luzern': 667,
        'FC Maxline Vitebsk': 174183,
        'FC Midtjylland': 674,
        'FC Milsami': 29744,
        'FC Noah': 157745,
        'FC Nordsjælland': 678,
        'FC Petržalka': 131,
        'FC Porto': 686,
        'FC Prishtina': 17844,
        'FC Reipas Lahti (old)': 18069,
        'FC Rànger’s': 893,
        'FC Samtredia': 22796,
        'FC Santa Coloma': 12924,
        'FC Sheriff': 12928,
        'FC Sion': 699,
        'FC St. Gallen': 701,
        'FC Steaua Bucureşti': 1821,
        'FC Struga': 136026,
        'FC Suðuroy': 18586,
        'FC TVMK': 709,
        'FC Thun Berner Oberland': 704,
        'FC Timişoara': 1482,
        'FC Tiraspol': 705,
        'FC Twente': 1965,
        'FC Unirea': 710,
        'FC Urartu': 12939,
        'FC Utrecht': 711,
        'FC VSS Košice': 1288,
        'FC Vaslui': 713,
        'FC Viitorul Constanța': 35906,
        'FC Wacker Innsbruck': 720,
        'FC Zestafoni': 12941,
        'FC Zimbru': 18460,
        'FC Zürich': 728,
        'FCI Levadia': 1204,
        'FCI Tallinn': 30731,
        'FH Hafnarfjörður': 739,
        'FK Aktobe': 12925,
        'FK Astana': 28951,
        'FK Baku': 18563,
        'FK Bodø/Glimt': 749,
        'FK Budućnost Podgorica': 751,
        'FK Dečić Tuzi': 754,
        'FK Ekranas': 756,
        'FK Gomel': 759,
        'FK Kairat': 17544,
        'FK Krasnodar': 29508,
        'FK Kukësi': 44807,
        'FK Liepāja': 100495,
        'FK Liepājas Metalurgs': 1215,
        'FK Mladá Boleslav': 779,
        'FK Modriča': 1306,
        'FK Mogren Budva': 781,
        'FK Obilić': 18087,
        'FK Ordabasy': 18644,
        'FK Panevėžys': 107852,
        'FK Partizani': 12912,
        'FK Pobeda': 788,
        'FK Příbram': 777,
        'FK RFS': 19650,
        'FK Rabotnički': 1512,
        'FK Renova': 1557,
        'FK Rostov': 791,
        'FK Rudar Pljevlja': 792,
        'FK Sarajevo': 793,
        'FK Slaviya Mozyr': 18528,
        'FK Spartaks': 36076,
        'FK Sutjeska': 804,
        'FK Sūduva': 803,
        'FK Teplice': 805,
        'FK Ventspils': 809,
        'FK Vllaznia': 12913,
        'FK Yerevan': 22574,
        'FK Zeta': 815,
        'FK Zhenis': 17338,
        'FK Žalgiris': 813,
        'FKS Stal Mielec': 18342,
        'Farul Constanța': 584,
        'Fehérvár FC': 622,
        'Fenerbahçe': 735,
        'Ferencvárosi TC': 17420,
        'Feyenoord': 736,
        'Flamurtari Vlorë': 12914,
        'Floriana FC': 18490,
        'Fram Reykjavík': 832,
        'Fredrikstad FK': 838,
        'Galatasaray': 853,
        'Glenavon FC': 894,
        'Glentoran FC': 895,
        'Grasshopper Club Zürich': 910,
        'Grazer AK': 911,
        'Gwardia Warszawa': 18389,
        'Győri ETO FC': 933,
        'GÍ Gøta': 18580,
        'Górnik Zabrze': 904,
        'HB Tórshavn': 964,
        'HJK Helsinki': 986,
        'HNK Rijeka': 989,
        'HPS Helsinki': 19533,
        'Hajduk Split': 936,
        'Haka Valkeakoski': 937,
        'Halmstads BK': 940,
        'Hammarby IF': 946,
        'Hamrun Spartans': 18495,
        'Hapoel Be\'er Sheva': 1184,
        'Hapoel Haifa': 17852,
        'Hapoel Tel Aviv': 956,
        'Heart of Midlothian': 965,
        'Helsingborgs IF': 970,
        'Helsingfors IFK': 984,
        'Herfølge BK': 974,
        'Hibernian FC': 982,
        'Hibernians FC': 983,
        'Hvidovre IF': 1010,
        'IF Elfsborg': 1014,
        'IFK Göteborg': 1022,
        'IFK Malmö': 1028,
        'IFK Mariehamn': 1029,
        'IFK Norrköping': 1030,
        'IK Start': 1042,
        'Ilves Tampere': 13681,
        'Inter Bratislava': 17485,
        'Inter Club d\'Escaldes': 31102,
        'Inter Turku': 1053,
        'Ironi Kiryat Shmona': 1062,
        'Irtysh Pavlodar': 18922,
        'JK Nõmme Kalju': 1085,
        'Jagiellonia Białystok': 1068,
        'Jeunesse Esch': 17843,
        'KA Akureyri': 17835,
        'KAA Gent': 1097,
        'KB København': 17776,
        'KF Ballkani': 149642,
        'KF Drita': 29438,
        'KF Elbasani': 12915,
        'KF Feronikeli': 115940,
        'KF Shkupi': 17479,
        'KF Shkëndija 79': 18615,
        'KF Skënderbeu': 18702,
        'KF Teuta Durrës': 12920,
        'KF Tiranë': 12919,
        'KF Trepça\'89': 119250,
        'KPV Kokkola': 1151,
        'KR Reykjavík': 1152,
        'KRC Genk': 1153,
        'KSK Beveren': 1161,
        'KV Mechelen': 1173,
        'Kalmar FF': 1101,
        'Kapaz PFK': 19866,
        'Kareda Kaunas': 18572,
        'Kauno Žalgiris': 73159,
        'Keflavík ÍF': 1012,
        'Khazar Lankaran': 12943,
        'Kilmarnock FC': 1132,
        'Kuopion PS': 1171,
        'KÍ Klaksvík': 18582,
        'Køge BK': 1140,
        'LASK': 1186,
        'Lantana Tallinn': 21434,
        'Larne FC': 18597,
        'Lech Poznań': 1194,
        'Legia Warszawa': 1198,
        'Leotar Trebinje': 1202,
        'Levski Sofia': 1208,
        'Lierse SK (old)': 1216,
        'Lillestrøm SK': 1218,
        'Limerick FC (1937-2007)': 18999,
        'Lincoln Red Imps': 39614,
        'Linfield FC': 1222,
        'Lisburn Distillery': 1224,
        'Llanelli Town': 1231,
        'Lokomotiv Moskva': 1235,
        'Lokomotiv Plovdiv': 1236,
        'Lokomotiv Sofia': 1237,
        'Lokomotiva Zagreb': 18501,
        'Lyn Oslo': 1250,
        'Lyngby BK': 1251,
        'MFK Ružomberok': 1290,
        'MFK Vítkovice': 717,
        'MTK Budapest': 1324,
        'Maccabi Haifa': 1254,
        'Maccabi Tel Aviv': 1258,
        'Makedonija GP': 1261,
        'Malmö FF': 1266,
        'Marsaxlokk FC': 12944,
        'Metalist Kharkiv': 1281,
        'Metalurgi Rustavi': 18477,
        'Mjällby AIF': 1296,
        'Molde FK': 1309,
        'Moss FK': 1318,
        'Motherwell FC': 1319,
        'MyPa-47': 1328,
        'MŠK Žilina': 1321,
        'N.E.C.': 1347,
        'ND Gorica': 1345,
        'NK Brotnjo': 18499,
        'NK Celje': 1369,
        'NK Domžale': 1371,
        'NK Maribor': 1374,
        'NK Zagreb': 1382,
        'NSÍ Runavík': 12927,
        'Neftchi Baku PFK': 1348,
        'Neuchâtel Xamax FCS': 1351,
        'Norma Tallinn': 18638,
        'NŠ Mura': 104311,
        'OFK Titograd': 780,
        'OPS Oulu': 31867,
        'Odense BK': 1402,
        'Olimpija Ljubljana': 17431,
        'Olympiacos FC': 1418,
        'Olympiakos Nikosia': 17349,
        'Omonia Nikosia': 1424,
        'Oţelul Galaţi': 1442,
        'PAOK Saloniki': 1454,
        'PFC Beroe': 1467,
        'PFC Litex Lovech': 1465,
        'PFC Ludogorets Razgrad': 37760,
        'PSV Eindhoven': 1502,
        'Pafos FC': 13914,
        'Panathinaikos': 1451,
        'Partizan': 1460,
        'Paços de Ferreira': 1446,
        'Petrolul Ploieşti': 17984,
        'Pezoporikos Larnaca': 22479,
        'Piast Gliwice': 1470,
        'Polonia Bytom': 1483,
        'Polonia Warszawa': 1484,
        'Portadown FC': 18593,
        'Progrès Niedercorn': 18903,
        'Pyunik FC': 12923,
        'Qarabağ FK': 18670,
        'RB Salzburg': 1536,
        'RSC Anderlecht': 1591,
        'RWDM Brussels': 607,
        'Rabat Ajax': 18491,
        'Raków Częstochowa': 19860,
        'Rangers FC': 893,
        'Rapid Bucureşti': 1530,
        'Rhyl FC': 1560,
        'Riga FC': 86629,
        'Roda JC Kerkrade': 1574,
        'Rosenborg BK': 1578,
        'Royal Antwerp FC': 1590,
        'Rubin Kazan': 1594,
        'Ruch Chorzów': 1595,
        'S.C. Braga': 1773,
        'SG Sachsen Leipzig': 1603,
        'SJK Seinäjoki': 30389,
        'SK Brann': 1704,
        'SK Dnipro-1': 134731,
        'SL Benfica': 1731,
        'SP La Fiorita': 18556,
        'SP Tre Fiori': 18539,
        'SP Tre Penne': 18547,
        'SS Folgore/Falciano': 18538,
        'SS Murata': 12929,
        'SS Virtus': 18545,
        'SV Zulte Waregem': 1877,
        'Sabah FK': 136820,
        'Servette FC': 1678,
        'Shakhtar Donetsk': 1688,
        'Shakhter Soligorsk': 1689,
        'Shakter Karaganda': 12947,
        'Shamkir FK': 18672,
        'Shamrock Rovers': 1690,
        'Shelbourne FC': 1693,
        'Shirak FC': 18590,
        'Sileks Kratovo': 1698,
        'Silkeborg IF': 1699,
        'Sioni Bolnisi': 18601,
        'Sivasspor': 1702,
        'Skeid Fotball': 1719,
        'Skonto FC': 1726,
        'Slavia Praha': 1736,
        'Sliema Wanderers': 17458,
        'Sligo Rovers': 1739,
        'Slovan Bratislava': 1742,
        'Slovan Liberec': 1743,
        'Sparta Prague': 1761,
        'Sparta Rotterdam': 1762,
        'Spartak Moskva': 1764,
        'Spartak Plovdiv': 18640,
        'Spartak Trnava': 1766,
        'Spartak Vladikavkaz': 13827,
        'Spora Luxemburg': 18512,
        'Sporting CP': 1776,
        'St Patrick\'s Athletic': 893,
        'Stabæk IF': 1805,
        'Stade Dudelange': 22098,
        'Standard Liège': 1818,
        'Strømsgodset IF': 1836,
        'Sturm Graz': 1837,
        'Swift Hesperange': 18511,
        'Szombierki Bytom': 18320,
        'TPS Turku': 1927,
        'TSC Bačka Topola': 150710,
        'Tampere United': 1888,
        'Tavriya Simferopol (1958-2014)': 1893,
        'The New Saints': 1910,
        'Tobyl Kostanay': 12948,
        'Torpedo Kutaisi': 18129,
        'Torpedo Moskva': 1919,
        'Trabzonspor': 1928,
        'UE Sant Julià': 12949,
        'UE Santa Coloma': 31104,
        'UMF Stjarnan': 18126,
        'UTA Arad': 2033,
        'Ulisses FC': 19838,
        'Union Luxembourg': 18261,
        'Union Saint-Gilloise': 1997,
        'Valletta FC': 12930,
        'Valmiera FC': 19304,
        'Valur Reykjavík': 2045,
        'Vardar Skopje': 2049,
        'Vejle BK': 2057,
        'Viking FC': 2097,
        'Viking FK': 2097,
        'Viktoria Plzeň': 2099,
        'Vitória Guimarães': 2109,
        'Vojvodina': 2112,
        'Vác FC': 19829,
        'Vålerenga IF': 2043,
        'Víkingur': 19880,
        'Víkingur Reykjavík': 18162,
        'WIT Georgia': 12950,
        'Waterford FC': 2129,
        'Widzew Łódź': 2143,
        'Wiener Sport-Club': 2144,
        'Willem II': 2146,
        'Wisła Kraków': 2147,
        'Zagłębie Lubin': 2170,
        'Zalaegerszegi TE': 2173,
        'Zbrojovka Brno': 2,
        'Zenit St. Petersburg': 2179,
        'Zorya Lugansk': 2185,
        'Zrinjski Mostar': 2186,
        'sc Heerenveen': 1644,
        'Åtvidabergs FF': 169,
        'ÍA Akranes': 1011,
        'ÍBV Vestmannaeyjar': 18287,
        'Örgryte IS': 1429,
        'Östers IF': 1439,
        'Újpest FC': 1984,
        'İstanbul Başakşehir': 295,
        'ŁKS Łódź': 1229,
        'Śląsk Wrocław': 1734,
        'Şamaxı FK': 12926,
        'Široki Brijeg': 1701,
        'Željezničar Sarajevo': 2177
    };
    const LEAGUE_TABLE_API_BASE = 'https://leaguetable-api.league-table-api.workers.dev';

    // Words in a club's name that nobody types ("FC", "1.", "Calcio"),
    // and endings that can be left off when the rest is unique enough
    // ("Leicester" for Leicester City).
    const CLUB_NAME_FILLER_WORDS = new Set([
        'fc', 'afc', 'cf', 'sc', 'ac', 'as', 'ssc', 'us', 'cd', 'ud', 'rcd', 'sd', 'ca', 'fk', 'sk', 'nk',
        'hnk', 'gnk', 'sl', 'sv', 'vfb', 'vfl', 'fsv', 'tsv', 'ssv', 'spvgg', 'sg', 'bsc', 'ogc', 'rc',
        'cfc', 'acf', 'bk', 'if', 'ik', 'ff', 'kv', 'rsc', 'osc', 'calcio'
    ]);
    const CLUB_NAME_OPTIONAL_ENDINGS = new Set([
        'city', 'united', 'town', 'county', 'rovers', 'wanderers', 'athletic', 'albion', 'hotspur'
    ]);
    const TEAM_ALIASES = {
        'man utd': 'Manchester United', 'man united': 'Manchester United', 'manchester utd': 'Manchester United',
        'man city': 'Manchester City', 'spurs': 'Tottenham Hotspur', 'wolves': 'Wolverhampton Wanderers',
        'west brom': 'West Bromwich Albion', 'forest': 'Nottingham Forest', 'villa': 'Aston Villa',
        'brighton': 'Brighton & Hove Albion', 'qpr': 'Queens Park Rangers', 'bournemouth': 'AFC Bournemouth',
        'barca': 'FC Barcelona', 'atletico': 'Atlético Madrid', 'atleti': 'Atlético Madrid',
        'athletic bilbao': 'Athletic Club', 'bilbao': 'Athletic Club', 'betis': 'Real Betis',
        'celta vigo': 'Celta de Vigo', 'celta': 'Celta de Vigo', 'deportivo': 'Deportivo La Coruña',
        'depor': 'Deportivo La Coruña', 'sociedad': 'Real Sociedad',
        'juve': 'Juventus', 'inter milan': 'Inter', 'internazionale': 'Inter', 'milan': 'AC Milan',
        'lazio': 'Lazio Roma', 'parma': 'Parma Calcio 1913',
        'bayern': 'Bayern München', 'bayern munich': 'Bayern München', 'munich': 'Bayern München',
        'dortmund': 'Borussia Dortmund', 'bvb': 'Borussia Dortmund', 'gladbach': 'Bor. Mönchengladbach',
        'monchengladbach': 'Bor. Mönchengladbach', 'moenchengladbach': 'Bor. Mönchengladbach',
        'borussia monchengladbach': 'Bor. Mönchengladbach', 'leverkusen': 'Bayer Leverkusen',
        'schalke': 'FC Schalke 04', 'frankfurt': 'Eintracht Frankfurt', 'bremen': 'Werder Bremen',
        'werder': 'Werder Bremen', 'hamburg': 'Hamburger SV', 'hsv': 'Hamburger SV', 'koln': '1. FC Köln',
        'koeln': '1. FC Köln', 'cologne': '1. FC Köln', 'leipzig': 'RB Leipzig', 'hertha berlin': 'Hertha BSC',
        'union berlin': '1. FC Union Berlin', 'kaiserslautern': '1. FC Kaiserslautern',
        'nurnberg': '1. FC Nürnberg', 'nuremberg': '1. FC Nürnberg', 'mainz': '1. FSV Mainz 05',
        'psg': 'Paris Saint-Germain', 'paris': 'Paris Saint-Germain', 'paris sg': 'Paris Saint-Germain',
        'marseille': 'Olympique Marseille', 'lyon': 'Olympique Lyonnais', 'lille': 'Lille OSC',
        'losc': 'Lille OSC', 'rennes': 'Stade Rennais', 'saint etienne': 'AS Saint-Étienne',
        'st etienne': 'AS Saint-Étienne', 'bordeaux': 'Girondins Bordeaux', 'reims': 'Stade de Reims',
        'brest': 'Stade Brestois 29', 'montpellier': 'Montpellier HSC',
        'benfica': 'SL Benfica', 'sporting lisbon': 'Sporting CP', 'sporting': 'Sporting CP',
        'psv': 'PSV Eindhoven', 'celtic': 'Celtic FC', 'rangers': 'Rangers FC', 'club brugge': 'Club Brugge KV',
        'brugge': 'Club Brugge KV', 'anderlecht': 'RSC Anderlecht', 'salzburg': 'RB Salzburg',
        'basel': 'FC Basel 1893', 'young boys': 'BSC Young Boys', 'red star': 'Crvena Zvezda',
        'red star belgrade': 'Crvena Zvezda', 'steaua': 'FC Steaua Bucureşti', 'dynamo kyiv': 'Dinamo Kiev',
        'dynamo kiev': 'Dinamo Kiev', 'cska moscow': 'CSKA Moskva', 'spartak moscow': 'Spartak Moskva',
        'zenit': 'Zenit St. Petersburg', 'olympiakos': 'Olympiacos FC', 'braga': 'S.C. Braga'
    };

    const STREAK_TYPE_LABELS = {
        'winning': 'Winning', 'unbeaten': 'Unbeaten', 'draw': 'Draw', 'winless': 'Winless',
        'losing': 'Losing', 'clean-sheet': 'Clean sheet', 'goals-conceded': 'Goals conceded',
        'scoring': 'Scoring', 'no-score': 'Failed to score'
    };
    // Checked in order, so "without a win" is Winless before "win" is Winning
    const STREAK_TYPE_PATTERNS = [
        ['no-score', /\b(failed to score|without scoring|not scoring|goalless|blanks?)\b/],
        ['clean-sheet', /\b(clean sheets?|shut ?outs?)\b/],
        ['goals-conceded', /\bconced(ed|ing)\b/],
        ['scoring', /\bscor(ed|ing)\b/],
        ['winless', /\b(winless|without (a )?win(ning)?|no wins?)\b/],
        ['unbeaten', /\b(unbeaten|undefeated|without (losing|(a )?defeat|a loss))\b/],
        ['losing', /\b(losing|loss|losses|lost|defeats?)\b/],
        ['draw', /\b(draws?|drawing|drew)\b/],
        ['winning', /\b(wins?|winning|won|victor(y|ies))\b/]
    ];
    const MATCH_FINDER_LABELS = {
        'victories': 'Biggest victories', 'defeats': 'Biggest defeats', 'draws': 'Highest-scoring draws',
        'totalGoals': 'Most total goals', 'leastGoals': 'Least total goals', 'scoreline': 'Scoreline'
    };
    // Team Seasons' Champions League progressions ("how far they got")
    const CONTINENTAL_STAGE_PATTERNS = [
        ['Semi-Finals', /\b(semi ?finals?|semis)\b/],
        ['Quarter-Finals', /\b(quarter ?finals?|quarters)\b/],
        ['Round Of 16', /\b(round of 16|last 16)\b/],
        ['Play-Offs', /\bplay ?offs?\b/],
        ['Group Stage', /\b(group stages?|groups|league phase)\b/],
        ['Final', /\b(finals?|runners? up|beaten finalists?)\b/]
    ];
    // Words the query parser understands, so a trailing one is never
    // mistaken for the start of a team name still being typed
    const SEARCH_KEYWORDS = new Set((
        'vs v versus against h2h head to 2 meeting meetings table tables standings standing ' +
        'league classification ranking rankings streak streaks run runs in a row consecutive unbeaten ' +
        'undefeated winless last time when did was the of at on for and with without win wins winning won ' +
        'victory victories lost loss losses losing defeat defeats draw draws drawing drew clean sheet sheets ' +
        'scoring scored score scores conceded conceding failed goalless longest historic history record ' +
        'records all ever best worst biggest heaviest most least fewest goals highest lowest match matches ' +
        'game games result results fixtures seasons season finish finished finishes finishing position ' +
        'positions placed title titles champions winners top reached reach better final finals semi semis ' +
        'quarter quarters round group stage home away active current since after before between until ' +
        'from points deductions penalties pens knockout knockouts big six era time ' +
        'by via over under through into than their his her its they we our any every which what who how ' +
        'much many times or but not no do does got get getting beat beaten ' +
        // Everyday words, so they're never taken for the start of a team
        'far well good bad did went go goes going reach reaching ever still yet now then also just only ' +
        'more less very really team teams club clubs side sides play plays played playing year years ' +
        'stats statistics score finish place out knocked eliminated runners up second third fourth ' +
        'show list tell give find me us is are were has have had will would should can could ' +
        // Weekdays ("on a Wednesday" isn't Sheffield Wednesday being typed)
        'monday tuesday wednesday thursday friday saturday sunday ' +
        'mondays tuesdays wednesdays thursdays fridays saturdays sundays'
    ).split(' '));

    function normalizeSearchText(text) {
        return text.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/æ/g, 'ae').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ı/g, 'i')
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function escapeSearchHtml(text) {
        return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    // --- Teams ---

    // name -> { name, league (domestic league key or null), crestId, continental }
    const SEARCH_TEAMS = new Map();
    TEAM_DIRECTORY.forEach(team => {
        SEARCH_TEAMS.set(team.name, { name: team.name, league: team.league, crestId: team.crestId, continental: false });
    });
    CONTINENTAL_DOMESTIC_TEAMS.forEach(name => {
        if (SEARCH_TEAMS.has(name)) SEARCH_TEAMS.get(name).continental = true;
    });
    Object.entries(CONTINENTAL_ONLY_CRESTS).forEach(([name, crestId]) => {
        SEARCH_TEAMS.set(name, { name, league: null, crestId, continental: true });
    });

    // Every way of writing each team -> the team names it can mean
    // (more than one when a shortened name is shared, e.g. "Manchester")
    let teamPhraseIndex = null;
    let teamNameIndex = null; // [normalized full name, alias or short name, team name] for typed-ahead matching

    function buildTeamIndexes() {
        teamPhraseIndex = new Map();
        teamNameIndex = [];
        const add = (phrase, name) => {
            if (phrase.length < 3) return;
            if (!teamPhraseIndex.has(phrase)) teamPhraseIndex.set(phrase, new Set());
            teamPhraseIndex.get(phrase).add(name);
            teamNameIndex.push([phrase, name]);
        };
        SEARCH_TEAMS.forEach(team => {
            const full = normalizeSearchText(team.name);
            add(full, team.name);
            const words = full.split(' ').filter(word => !CLUB_NAME_FILLER_WORDS.has(word) && !/^\d+$/.test(word));
            if (words.length === 0) return;
            add(words.join(' '), team.name);
            if (words.length > 1 && CLUB_NAME_OPTIONAL_ENDINGS.has(words[words.length - 1])) {
                add(words.slice(0, -1).join(' '), team.name);
            }
        });
        // An alias always means its one team, even over a shared short name
        Object.entries(TEAM_ALIASES).forEach(([alias, name]) => {
            if (!SEARCH_TEAMS.has(name)) return;
            teamPhraseIndex.set(alias, new Set([name]));
            teamNameIndex.push([alias, name]);
        });
        // Search words are never team names ("Nice" stays a team only
        // when nothing else reads it; these are the ones that collide)
        ['home', 'away', 'win', 'wins', 'draw', 'title', 'record'].forEach(word => teamPhraseIndex.delete(word));
    }
    buildTeamIndexes();

    // Merge in the live Champions League roster (clubs new to the
    // competition since the list above was taken). Fetched once per
    // page; onUpdate re-runs a search that's showing.
    let continentalTeamsRequest = null;
    function loadContinentalTeams(onUpdate) {
        if (!continentalTeamsRequest) {
            continentalTeamsRequest = fetch(`${LEAGUE_TABLE_API_BASE}/api/teams?div=C1`)
                .then(res => res.ok ? res.json() : { teams: [] })
                .then(data => {
                    let added = false;
                    (data.teams || []).forEach(name => {
                        const team = SEARCH_TEAMS.get(name);
                        if (team) {
                            team.continental = true;
                        } else {
                            SEARCH_TEAMS.set(name, { name, league: null, crestId: null, continental: true });
                            added = true;
                        }
                    });
                    if (added) buildTeamIndexes();
                    return added;
                })
                .catch(() => false); // the embedded list above still covers search
        }
        continentalTeamsRequest.then(added => { if (added) onUpdate(); });
    }

    // --- Reading the query ---

    function seasonKey(startYear) {
        return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
    }

    function currentSeasonStart() {
        const now = new Date();
        return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    }

    function competitionHasSeason(comp, startYear) {
        return comp.seasons.split(',').some(range => {
            const [from, to] = range.split('-');
            const end = to === undefined ? Number(from) : (to === '' ? currentSeasonStart() : Number(to));
            return startYear >= Number(from) && startYear <= end;
        });
    }

    const NUMBER_WORDS = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, fifty: 50
    };
    const NUMBER_PATTERN = `(\\d{1,3}|${Object.keys(NUMBER_WORDS).join('|')})`;

    function toNumber(text) {
        return /^\d+$/.test(text) ? Number(text) : NUMBER_WORDS[text];
    }

    // "2003-04", "2003/04", "2003-2004", "03-04", "this season", "last
    // season", or a single year, which means the season that ended in it
    // (2004 -> 2003-04). Returns { startYear, text } or null.
    function extractSeason(text) {
        let m = text.match(/\b(this|current) season\b/);
        if (m) return { startYear: currentSeasonStart(), text: m[0] };
        m = text.match(/\b(last|previous) season\b/);
        if (m) return { startYear: currentSeasonStart() - 1, text: m[0] };
        m = text.match(/\b(1[89]\d{2}|20\d{2})\s*[-\/–]\s*(\d{4}|\d{2})\b/);
        if (m) {
            const start = Number(m[1]);
            if (Number(m[2]) % 100 === (start + 1) % 100) return { startYear: start, text: m[0] };
        }
        m = text.match(/\b(\d{2})\s*[-\/–]\s*(\d{2})\b/);
        if (m && (Number(m[1]) + 1) % 100 === Number(m[2])) {
            const yy = Number(m[1]);
            const start = yy <= currentSeasonStart() % 100 ? 2000 + yy : 1900 + yy;
            return { startYear: start, text: m[0] };
        }
        m = text.match(/\b(1[89]\d{2}|20\d{2})\b/);
        if (m) return { startYear: Number(m[1]) - 1, text: m[0] };
        return null;
    }

    const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
        'september', 'october', 'november', 'december'];
    // Full names first, so "march" is never read as "mar" + "ch"
    const MONTH_PATTERN = `(${[...MONTHS, 'sept', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].join('|')})`;

    function monthNumber(name) {
        return MONTHS.findIndex(month => month.startsWith(name.slice(0, 3))) + 1;
    }

    function isoDate(year, month, day) {
        const date = new Date(Date.UTC(year, month - 1, day));
        // Rejects 31/02 and the like (the date rolls over into another month)
        if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
        return date.toISOString().slice(0, 10);
    }

    function addDays(iso, days) {
        const date = new Date(`${iso}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
    }

    // 03/04/2010: day first, except for US English visitors (month first).
    // A number over 12 settles it either way.
    function dayFirst() {
        const language = typeof navigator !== 'undefined' && navigator.language ? navigator.language.toLowerCase() : 'en-gb';
        return language !== 'en-us';
    }

    // Dates written out in full, each as the span it covers: a day
    // ("01/01/1991", "1991-01-01", "1 January 1991", "Jan 1 1991") or a
    // month ("January 1991"). Returns [{ text, start, end }] (ISO dates).
    function findDates(text) {
        const found = [];
        const add = (match, start, end) => {
            if (start && end) found.push({ text: match, start, end });
        };
        const monthEnd = (year, month) => addDays(isoDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1), -1);
        let rest = text;
        const take = (pattern, handle) => {
            rest = rest.replace(pattern, (...m) => {
                handle(m);
                return ' ';
            });
        };
        take(/\b(1[89]\d{2}|20\d{2})-(\d{1,2})-(\d{1,2})\b/g, m => {
            const date = isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
            add(m[0], date, date);
        });
        take(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](1[89]\d{2}|20\d{2})\b/g, m => {
            let [first, second] = [Number(m[1]), Number(m[2])];
            const swap = first > 12 ? false : (second > 12 ? true : !dayFirst());
            const [day, month] = swap ? [second, first] : [first, second];
            const date = isoDate(Number(m[3]), month, day);
            add(m[0], date, date);
        });
        take(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_PATTERN}\\.?,?\\s+(1[89]\\d{2}|20\\d{2})\\b`, 'g'), m => {
            const date = isoDate(Number(m[3]), monthNumber(m[2]), Number(m[1]));
            add(m[0], date, date);
        });
        take(new RegExp(`\\b${MONTH_PATTERN}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(1[89]\\d{2}|20\\d{2})\\b`, 'g'), m => {
            const date = isoDate(Number(m[3]), monthNumber(m[1]), Number(m[2]));
            add(m[0], date, date);
        });
        take(new RegExp(`\\b${MONTH_PATTERN}\\.?,?\\s+(1[89]\\d{2}|20\\d{2})\\b`, 'g'), m => {
            const month = monthNumber(m[1]);
            add(m[0], isoDate(Number(m[2]), month, 1), monthEnd(Number(m[2]), month));
        });
        return found;
    }

    // A date range: "since 2010" / "since 01/01/1991" / "since the 2010-11
    // season", "after ...", "before ...", "until ...", "between ... and
    // ...", "from ... to ...", "last 5 seasons", or a lone date or month
    // ("on 10/05/2026", "in January 2010"). Each end can be a year or a
    // written-out date. Returns { from, to, text } - ISO dates ('' for an
    // open end) and the query with the range taken out - or null. Read
    // before the season, so its years are never taken as one.
    function extractDateRange(text) {
        // Swap written-out dates for placeholders (§0§) so one pattern
        // per kind of range covers years and dates alike
        const dates = findDates(text);
        let marked = text;
        dates.forEach((date, i) => { marked = marked.replace(date.text, ` §${i}§ `); });
        const restore = remaining => remaining.replace(/§(\d+)§/g, (_, i) => dates[Number(i)].text);
        const BOUND = '(§\\d+§|1[89]\\d{2}|20\\d{2})';
        const span = bound => {
            const token = bound.match(/^§(\d+)§$/);
            if (token) return dates[Number(token[1])];
            return { start: `${bound}-01-01`, end: `${bound}-12-31` };
        };
        const result = (m, from, to) => ({ from, to, text: restore(marked.replace(m[0], ' ')) });

        let m = marked.match(new RegExp(`\\b(?:between|from)\\s+${BOUND}\\s*(?:and|to|until|till|-|–)\\s*${BOUND}`));
        if (m) {
            let [first, last] = [span(m[1]), span(m[2])];
            if (first.start > last.start) [first, last] = [last, first];
            return result(m, first.start, last.end);
        }
        m = marked.match(new RegExp(`\\b(since|after)\\s+(?:the\\s+)?${BOUND}(?:\\s*[-\\/–]\\s*(\\d{4}|\\d{2})\\b)?(?:\\s+season)?`));
        if (m) {
            const isSeason = m[3] !== undefined && /^\d{4}$/.test(m[2]) && Number(m[3]) % 100 === (Number(m[2]) + 1) % 100;
            if (isSeason) return result(m, `${m[2]}-07-01`, '');
            const bound = span(m[2]);
            return result(m, m[1] === 'after' ? addDays(bound.end, 1) : bound.start, '');
        }
        m = marked.match(new RegExp(`\\b(?:before|prior to)\\s+${BOUND}`));
        if (m) return result(m, '', addDays(span(m[1]).start, -1));
        m = marked.match(new RegExp(`\\b(?:until|up to|till)\\s+${BOUND}`));
        if (m) return result(m, '', span(m[1]).end);
        m = marked.match(new RegExp(`\\b(?:last|past|previous)\\s+${NUMBER_PATTERN}\\s+seasons\\b`));
        if (m) return result(m, `${currentSeasonStart() - toNumber(m[1]) + 1}-07-01`, '');
        // A lone date or month: just that day / month
        m = marked.match(/(?:\b(?:on|in|during)\s+)?§(\d+)§/);
        if (m) {
            const date = dates[Number(m[1])];
            return result(m, date.start, date.end);
        }
        return null;
    }

    // "last 10 meetings", "last five games" -> 10 / 5 (with a noun, so a
    // stage like "last 16" is never read as a count)
    function extractLastN(text) {
        const m = text.match(new RegExp(`\\b(?:last|past|previous|most recent)\\s+${NUMBER_PATTERN}\\s+(?:meetings?|games?|matches|fixtures|results|h2hs?|head to heads?|times?|encounters?)\\b`));
        return m ? { n: toNumber(m[1]), text: m[0] } : null;
    }

    // A scoreline like "5-0" or "3:3" -> { home, away }
    function extractScoreline(text) {
        const m = text.match(/(?:^|\s)(\d{1,2})\s*[-:]\s*(\d{1,2})(?=\s|$)/);
        return m ? { home: m[1], away: m[2], text: m[0] } : null;
    }

    // Filters written out in words, read off the raw query (and removed
    // from it) before teams are looked for: points system, deductions,
    // and the Champions League's penalty shootouts and qualifier toggles
    const TEXT_FILTERS = [
        ['points', '0', /\b(?:2|two)[ -]points?\s+(?:for|per)\s+(?:a\s+)?win\b|\b(?:historic(?:al)?|old|original)\s+points(?:\s+system)?\b/],
        ['points', '1', /\b(?:3|three)[ -]points?\s+(?:for|per)\s+(?:a\s+)?win\b/],
        ['deductions', '0', /\b(?:without|no|ignoring|excluding|minus)\s+(?:points?\s+)?deductions?\b/],
        ['deductions', '1', /\bwith\s+(?:points?\s+)?deductions?\b/],
        ['excludeMainStage', true, /\b(?:qualif(?:iers?|ying)(?:\s+rounds?)?\s+only|only\s+(?:the\s+)?qualif(?:iers?|ying)(?:\s+rounds?)?)\b/],
        ['excludeQualifiers', true, /\b(?:excluding|without|no|not including)\s+(?:the\s+)?qualif(?:iers?|ying)(?:\s+rounds?)?\b|\bmain\s+(?:stage|draw|competition)(?:\s+only)?\b/],
        ['penalties', true, /\b(?:(?:on|via|by|after|decided on|decided by)\s+)?(?:penalt(?:y|ies)(?:\s+shoot\s*-?\s*outs?)?|pens|shoot\s*-?\s*outs?)\b/],
        // Match Finder (Champions League)
        ['extraTime', true, /\b(?:(?:after|in|during|decided in)\s+)?extra[ -]?time\b|\baet\b/],
        ['awayGoals', true, /\b(?:(?:on|via|by|through|decided on|decided by)\s+)?(?:the\s+)?away[ -]goals?(?:\s+rule)?\b/],
        ['tieMode', true, /\b(?:on\s+)?aggregate\b|\b(?:two|double|2)[ -]?legged(?:\s+ties?)?\b|\bover two legs\b|\bties\b/]
    ];

    const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Champions League stages, in the words people use. Keys are the
    // canonical stage; the page values differ by filter (see STAGE_VALUES)
    const STAGE_PATTERNS = [
        ['group', /\b(group stages?|group phase|groups|league phase|league stage)\b/],
        ['knockout', /\b(knock ?outs?|knock ?out stage|ko stage)\b/],
        ['Semi-Finals', /\b(semi ?finals?|semis)\b/],
        ['Quarter-Finals', /\b(quarter ?finals?|quarters)\b/],
        ['Round Of 16', /\b(round of 16|last 16)\b/],
        ['Play-Offs', /\bplay ?offs?\b/],
        ['Final', /\bfinals?\b/],
        ['Qualifiers', /\b(qualifiers?|qualifying)\b/]
    ];
    // League table stage (?stage=) and the H2H / match history boxes'
    // stage (?h2hStage= / ?mhStage=) use different values for two stages
    const STAGE_VALUES = {
        table: { group: 'group-stage', knockout: 'knockout-stage' },
        box: { group: 'League/Group Stage', knockout: 'Knock-Out Stage' }
    };
    const STAGE_WORDS = {
        'group': 'the group stage', 'group-stage': 'the group stage', 'League/Group Stage': 'the group stage',
        'knockout': 'the knockout stage', 'knockout-stage': 'the knockout stage', 'Knock-Out Stage': 'the knockout stage',
        'Final': 'the final', 'Semi-Finals': 'the semi-finals', 'Quarter-Finals': 'the quarter-finals',
        'Round Of 16': 'the round of 16', 'Play-Offs': 'the play-offs', 'Qualifiers': 'qualifying'
    };

    // Champions League opponents by country: "English clubs", "vs Spain"
    const COUNTRY_DEMONYMS = {
        english: 'England', scottish: 'Scotland', welsh: 'Wales', spanish: 'Spain', italian: 'Italy',
        german: 'Germany', french: 'France', portuguese: 'Portugal', dutch: 'Netherlands', belgian: 'Belgium',
        turkish: 'Turkey', greek: 'Greece', serbian: 'Serbia', ukrainian: 'Ukraine', russian: 'Russia',
        czech: 'Czech Republic', swiss: 'Switzerland', austrian: 'Austria', danish: 'Denmark',
        swedish: 'Sweden', norwegian: 'Norway', croatian: 'Croatia', polish: 'Poland', romanian: 'Romania',
        bulgarian: 'Bulgaria', hungarian: 'Hungary', cypriot: 'Cyprus', israeli: 'Israel', irish: 'Republic of Ireland'
    };
    const COUNTRY_NAMES = [
        'England', 'Scotland', 'Wales', 'Northern Ireland', 'Spain', 'Italy', 'Germany', 'France', 'Portugal',
        'Netherlands', 'Belgium', 'Turkey', 'Greece', 'Serbia', 'Ukraine', 'Russia', 'Czech Republic',
        'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway', 'Croatia', 'Poland', 'Romania', 'Bulgaria',
        'Hungary', 'Cyprus', 'Israel', 'Scotland', 'Republic of Ireland'
    ];
    const OPPONENT_GROUP_NOUNS = new Set(['teams', 'team', 'clubs', 'club', 'sides', 'side', 'opposition', 'opponents']);
    const VERSUS_WORDS = new Set(['vs', 'v', 'versus', 'against']);

    // A group as Team 2 - the Big 6 (Premier League) or every club from
    // one country (Champions League) - on words no team took.
    // Returns 'BIG_6' / 'COUNTRY:<name>' (marking its words used), or null.
    function findOpponentGroup(words, used) {
        const free = (i, n) => i + n <= words.length && !used.slice(i, i + n).some(Boolean);
        const take = (i, n) => { for (let k = i; k < i + n; k++) used[k] = true; };
        for (let i = 0; i < words.length; i++) {
            if (free(i, 2) && words[i] === 'big' && (words[i + 1] === '6' || words[i + 1] === 'six')) {
                take(i, 2);
                return 'BIG_6';
            }
        }
        for (let i = 0; i < words.length; i++) {
            let country = null;
            let length = 1;
            if (COUNTRY_DEMONYMS[words[i]]) {
                country = COUNTRY_DEMONYMS[words[i]];
            } else {
                const name = COUNTRY_NAMES.find(c => {
                    const parts = normalizeSearchText(c).split(' ');
                    return words.slice(i, i + parts.length).join(' ') === parts.join(' ');
                });
                if (name) {
                    country = name;
                    length = normalizeSearchText(name).split(' ').length;
                }
            }
            if (!country || !free(i, length)) continue;
            const before = i > 0 && !used[i - 1] && VERSUS_WORDS.has(words[i - 1]);
            const after = OPPONENT_GROUP_NOUNS.has(words[i + length]) && !used[i + length];
            if (!before && !after) continue;
            take(i, length + (after ? 1 : 0));
            return `COUNTRY:${country}`;
        }
        return null;
    }

    function detectStreakType(text) {
        const match = STREAK_TYPE_PATTERNS.find(([, pattern]) => pattern.test(text));
        return match ? match[0] : '';
    }

    // Which finishing position a Team Seasons search is after:
    // { rank } for a domestic league, { stage } for the Champions League,
    // better = "or better" (top 4, reached the semis), first = each club's
    // first time only ("first-time champions"), historic = with the
    // pre-Serie A / pre-Bundesliga champions
    function detectFinish(text) {
        const has = pattern => pattern.test(text);
        const finish = {
            rank: '', stage: '', better: false,
            first: has(/\b(first (time|title|ever|win)|for the first time|first time (champions|winners))\b/),
            historic: has(/\b(historic|pre (serie a|bundesliga)|before the (serie a|bundesliga)|old championships?)\b/)
        };
        const top = text.match(/\btop (\d{1,2}|two|three|four|five|six|seven|eight|ten)\b/);
        const ordinal = text.match(/\b(\d{1,2})(st|nd|rd|th)\b/);
        const runnersUp = has(/\b(runners? up|second place|beaten finalists?|lost (in )?the final)\b/);
        if (has(/\b(titles?|champions|winners|(won|win|wins) (the )?(league|title|cup|it|competition|championship|scudetto))\b/) && !runnersUp) {
            finish.rank = '1';
            finish.stage = 'Champions';
        } else if (top) {
            finish.rank = String(toNumber(top[1]));
            finish.better = true;
        } else if (runnersUp) {
            finish.rank = '2';
        } else if (ordinal) {
            finish.rank = ordinal[1];
        }
        if (!finish.stage) {
            const stage = CONTINENTAL_STAGE_PATTERNS.find(([, pattern]) => pattern.test(text));
            if (stage) {
                finish.stage = stage[0];
                // "semi finals" / "reached the final" = that far or further;
                // "knocked out in the semis" / "lost the final" = out there
                const wentOut = runnersUp || has(/\b(knocked out|went out|go out|out in|eliminated|lost in|exit(ed)?)\b/);
                finish.better = !wentOut;
            }
        }
        if (has(/\b(or better|at least|or higher)\b/)) finish.better = true;
        if (Number(finish.rank) > 24) finish.rank = '';
        return finish;
    }

    // What the visitor is after, from the words left once teams,
    // competitions and the season are taken out
    function detectIntent(text, scoreline) {
        const has = pattern => pattern.test(text);
        const location = has(/\bhome\b/) ? 'home' : (has(/\b(away|road)\b/) ? 'away' : '');

        if (has(/\b(streaks?|runs?|in a row|consecutive|unbeaten|undefeated|winless)\b/)) {
            return {
                view: 'team-streaks',
                streakType: detectStreakType(text),
                historic: has(/\b(longest|historic|historical|history|records?|all time|ever|best|worst|biggest)\b/),
                location
            };
        }
        if (has(/\b(last time|when did|when was|last (win|won|beat|loss|lost|defeat|draw|drew|victory|played|met|game|match))\b|\blast (beat|lost|drew|played)\b/)) {
            // "When did Arsenal last win the league" is a season question
            // ("won the ·" - a competition name was taken out there)
            if (/\b(won?|win) (the |a )?(·|league|title|titles|championship|scudetto|cup|competition|it\b)/.test(text) ||
                /\b(finish(ed)?|top \d|runners? up|relegated|titles?)\b/.test(text)) {
                return { view: 'team-seasons', finish: detectFinish(text.replace(/·/g, 'league')), location };
            }
            // Which result: lost first ("were beaten by"), then drew, then won
            let result = 'any';
            if (/\b(lost|lose|loses|losing|loss|defeat(ed)? by|beaten by|were beaten|was beaten)\b/.test(text)) result = 'loss';
            else if (/\b(drew|draws?|drawn|tied|level)\b/.test(text)) result = 'draw';
            else if (/\b(beat|beaten|won|wins?|winning|victory|defeated|thrashed)\b/.test(text)) result = 'win';
            return { view: 'last-time-when', result, location };
        }
        let category = null;
        if (scoreline) category = 'scoreline';
        else if (has(/\b(biggest|heaviest|largest|record|best) (wins?|victory|victories)\b|\bthrashings?\b|\bbiggest margins?\b/)) category = 'victories';
        else if (has(/\b(biggest|heaviest|worst|largest|record) (defeats?|loss|losses|beatings?)\b/)) category = 'defeats';
        else if (has(/\b(highest scoring|biggest) draws?\b|\bscore draws?\b/)) category = 'draws';
        else if (has(/\b(most (total |combined |aggregate )?goals|highest scoring|goal ?fests?)\b/)) category = 'totalGoals';
        else if (has(/\b((least|fewest) (total |combined |aggregate )?goals|lowest scoring|goalless|scoreless|nil nil)\b/)) category = 'leastGoals';
        else if (has(/\b(match finder|biggest)\b/)) category = 'victories';
        if (category) return { view: 'match-finder', category, location };

        // A table asked for by name wins over the stage words in it
        // ("2004-05 group stage table")
        if (has(/\b(tables?|standings?|classification|rankings?)\b/)) return { view: 'table', location };
        if (has(/\b(seasons|season by season|history|finish|finished|finishes|finishing|positions?|placed|titles?|champions|winners|won (the )?(league|title|cup|it|competition)|top (\d{1,2}|two|three|four|five|six|seven|eight|ten)|runners? up|finals?|finalists?|semi ?finals?|semis|quarter ?finals?|quarters|round of 16|last 16|play ?offs?|group stages?|knocked out|eliminated|how far|\d{1,2}(st|nd|rd|th))\b/)) {
            return { view: 'team-seasons', finish: detectFinish(text), location };
        }
        if (has(/\b(vs|v|versus|against|h2h|head to head|head 2 head|meetings?|record)\b/)) return { view: 'h2h', location };
        if (has(/\b(match|matches|games?|results?|fixtures|scores|history|form)\b/)) return { view: 'matches', location };
        return { view: null, location };
    }

    // The League Tables tab's own filters, from the words left over
    function detectTableFilters(text) {
        const filters = { day: '', stage: '' };
        const day = WEEKDAYS.findIndex(name => new RegExp(`\\b${name}s?\\b`).test(text));
        if (day >= 0) filters.day = String(day);
        const stage = STAGE_PATTERNS.find(([, pattern]) => pattern.test(text));
        if (stage) filters.stage = stage[0];
        return filters;
    }

    // Teams named in the query, longest name first:
    // [{ start, end, teams: [name, ...] }]
    function findTeamMentions(words, used) {
        const mentions = [];
        for (let i = 0; i < words.length;) {
            let found = null;
            if (!used[i]) {
                for (let len = Math.min(6, words.length - i); len > 0 && !found; len--) {
                    if (used.slice(i, i + len).some(Boolean)) continue;
                    const phrase = words.slice(i, i + len).join(' ');
                    if (teamPhraseIndex.has(phrase)) {
                        found = { start: i, end: i + len, teams: [...teamPhraseIndex.get(phrase)] };
                    }
                }
            }
            if (found) {
                mentions.push(found);
                for (let k = found.start; k < found.end; k++) used[k] = true;
                i = found.end;
            } else {
                i++;
            }
        }
        return mentions;
    }

    // The end of the query may be a team name still being typed
    // ("arsenal vs chel"): match the last few words against the start
    // of team names. Returns a mention like findTeamMentions(), or null.
    function completeTrailingTeam(words, used, mentions) {
        const last = words.length - 1;
        if (last < 0 || used[last] || SEARCH_KEYWORDS.has(words[last])) return null;
        for (let k = Math.min(4, words.length); k > 0; k--) {
            const start = words.length - k;
            // Only through words that are unused or part of a team mention
            const blocked = words.slice(start).some((word, j) => used[start + j] && !mentions.some(m => start + j >= m.start && start + j < m.end));
            if (blocked) continue;
            const fragment = words.slice(start).join(' ');
            // Too short to mean a team yet ("by" isn't the start of Bytom)
            if (fragment.length < 3) continue;
            const matches = new Map();
            teamNameIndex.forEach(([phrase, name]) => {
                if (phrase.startsWith(fragment)) matches.set(name, Math.min(matches.get(name) ?? 2, 0));
                else if (phrase.includes(' ' + fragment)) matches.set(name, Math.min(matches.get(name) ?? 2, 1));
            });
            if (matches.size > 0) {
                const teams = [...matches.entries()]
                    .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length)
                    .slice(0, 5)
                    .map(([name]) => name);
                return { start, end: words.length, teams };
            }
        }
        return null;
    }

    function parseSearchQuery(query) {
        let text = ' ' + query.toLowerCase() + ' ';
        const filters = {
            dateFrom: '', dateTo: '', day: '', location: '', lastN: '', points: '', deductions: '',
            stage: '', penalties: false, excludeQualifiers: false, excludeMainStage: false,
            extraTime: false, awayGoals: false, tieMode: false
        };
        TEXT_FILTERS.forEach(([key, value, pattern]) => {
            const m = text.match(pattern);
            if (m && (filters[key] === '' || filters[key] === false)) {
                filters[key] = value;
                text = text.replace(m[0], ' ');
            }
        });
        const dateRange = extractDateRange(text);
        if (dateRange) {
            filters.dateFrom = dateRange.from;
            filters.dateTo = dateRange.to;
            filters.exactDates = hasWrittenDate(text);
            text = dateRange.text;
        }
        const lastN = extractLastN(text);
        if (lastN) {
            filters.lastN = String(lastN.n);
            text = text.replace(lastN.text, ' ');
        }
        const season = extractSeason(text);
        if (season) text = text.replace(season.text, ' ');
        const scoreline = extractScoreline(text);
        if (scoreline) text = text.replace(scoreline.text, ' ');

        const words = normalizeSearchText(text).split(' ').filter(Boolean);
        const used = words.map(() => false);
        let mentions = findTeamMentions(words, used);
        const opponentGroup = findOpponentGroup(words, used);

        // Competitions named in the query, on the words no team took (and
        // the era a name means: "Premier League" = 1992 onwards)
        const competitions = [];
        const eras = {};
        SEARCH_COMPETITIONS
            .flatMap(comp => comp.aliases.map(alias => [alias.split(' '), comp.key]))
            .sort((a, b) => b[0].length - a[0].length)
            .forEach(([aliasWords, key]) => {
                for (let i = 0; i + aliasWords.length <= words.length; i++) {
                    const span = words.slice(i, i + aliasWords.length);
                    if (span.join(' ') === aliasWords.join(' ') && !used.slice(i, i + aliasWords.length).some(Boolean)) {
                        for (let k = i; k < i + aliasWords.length; k++) used[k] = true;
                        if (!competitions.includes(key)) competitions.push(key);
                        const era = ALIAS_ERAS[aliasWords.join(' ')];
                        if (era && !eras[key]) eras[key] = era;
                    }
                }
            });

        const completion = completeTrailingTeam(words, used, mentions);
        if (completion) {
            mentions = mentions.filter(m => m.end <= completion.start);
            mentions.push(completion);
            for (let k = completion.start; k < completion.end; k++) used[k] = true;
        }

        // Taken-out words become a marker, so the words either side of a
        // team are never read as one phrase ("last · time")
        const rest = words.map((word, i) => used[i] ? '·' : word).join(' ');
        const intent = detectIntent(rest, scoreline);
        Object.assign(filters, detectTableFilters(rest));
        filters.location = intent.location || '';
        // "Barcelona at Real Madrid": the first team away
        if (mentions.length >= 2 && words.slice(mentions[0].end, mentions[1].start).join(' ') === 'at') {
            filters.location = 'away';
        }
        // Away goals only decide two-legged ties
        if (filters.awayGoals) filters.tieMode = true;
        // Two-legged ties, extra time and away goals only exist in Match
        // Finder: on their own they mean its default (biggest wins)
        if ((filters.tieMode || filters.extraTime || filters.awayGoals) && intent.view !== 'match-finder') {
            intent.view = 'match-finder';
            if (scoreline) intent.category = 'scoreline';
            else if (/\b(lost|lose|losses|defeats?|knocked out|eliminated|beaten|went out|go out)\b/.test(rest)) intent.category = 'defeats';
            else if (/\b(draws?|drew|level)\b/.test(rest)) intent.category = 'draws';
            else intent.category = 'victories';
        }
        // A named opponent makes it a head to head, whatever else the
        // words suggest (a stage, "matches", "table")
        if ((mentions.length >= 2 || opponentGroup) && ['team-seasons', 'table', 'matches', null].includes(intent.view)) {
            intent.view = 'h2h';
        }

        // A season or dates are more specific than an era, and "all-time"
        // asks for every season
        const allTime = /\b(all time|alltime|all seasons|every season)\b/.test(rest);
        if (season || dateRange || allTime) Object.keys(eras).forEach(key => delete eras[key]);

        return {
            season: season ? season.startYear : null,
            scoreline,
            competitions,
            eras,
            mentions: mentions.slice(0, 6),
            opponentGroup,
            intent,
            filters,
            isEmpty: words.length === 0 && !season && !scoreline && !dateRange
        };
    }

    // --- Building results ---

    function competitionUrl(comp, view, params) {
        const qs = new URLSearchParams({ view, lg: comp.key });
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) value.forEach(v => qs.append(key, v));
            else if (value !== '' && value !== null && value !== undefined) qs.set(key, value);
        });
        return `${comp.page}?${qs.toString()}`;
    }

    function dashboardUrl(comp, team) {
        return comp.continental
            ? `ContinentalEurope.html?team=${encodeURIComponent(team)}`
            : `DomesticEurope.html?league=${encodeURIComponent(comp.key)}&team=${encodeURIComponent(team)}`;
    }

    function locationLabel(location) {
        return location === 'home' ? 'Home games' : (location === 'away' ? 'Away games' : '');
    }

    function joinDetail(parts) {
        return parts.filter(Boolean).join(' · ');
    }

    function capitalize(text) {
        return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    }

    // Team 2 for display: a team, the Big 6, a country's clubs, or a list
    function opponentLabel(opponents) {
        const labels = opponents.map(opp => {
            if (opp === 'BIG_6') return 'the Big 6';
            if (opp.startsWith('COUNTRY:')) return `clubs from ${opp.slice('COUNTRY:'.length)}`;
            return opp;
        });
        if (labels.length <= 1) return labels[0] || '';
        return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    }

    // "since 2010", "before 2000", "between 1990 and 2000", "since the
    // 2010-11 season", "in January 2010". exact: the question had a
    // written-out date, so a day is always spelled out ("since January 1,
    // 1991", not "since 1991"), in the visitor's own date style.
    function describeDates(from, to, exact) {
        const yearStart = date => !exact && /^\d{4}-01-01$/.test(date);
        const seasonStart = date => !exact && /^\d{4}-07-01$/.test(date);
        const yearEnd = date => !exact && /^\d{4}-12-31$/.test(date);
        const year = date => Number(date.slice(0, 4));
        const day = date => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
        if (from && !to) {
            if (yearStart(from)) return `since ${year(from)}`;
            if (seasonStart(from)) return `since the ${seasonKey(year(from))} season`;
            return `since ${day(from)}`;
        }
        // "before" a date is up to the day before it
        if (to && !from) return yearEnd(to) ? `before ${year(to) + 1}` : `before ${day(addDays(to, 1))}`;
        if (from && to) {
            if (from === to) return `on ${day(from)}`;
            if (/-01$/.test(from) && to === addDays(addDays(`${from.slice(0, 7)}-28`, 4).slice(0, 7) + '-01', -1)) {
                return `in ${new Date(`${from}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
            }
            if (yearStart(from) && yearEnd(to)) return year(from) === year(to) ? `in ${year(from)}` : `between ${year(from)} and ${year(to)}`;
            return `between ${day(from)} and ${day(to)}`;
        }
        return '';
    }

    // Whether a query wrote out a date (not just a year or season)
    function hasWrittenDate(query) {
        return findDates(` ${(query || '').toLowerCase()} `).length > 0;
    }

    // Short labels for a result's filters (season or dates, home/away,
    // day, last N, stage, penalties)
    function filterDetailParts(parsed, comp, kind) {
        const f = parsed.filters;
        const era = parsed.eras[comp.key];
        const parts = [parsed.season !== null ? seasonKey(parsed.season)
            : (era ? `${capitalize(ERA_NAMES[era].replace(/^the /, ''))} era`
                : capitalize(describeDates(f.dateFrom, f.dateTo, f.exactDates)) || 'All seasons')];
        parts.push(locationLabel(f.location));
        if (f.day) parts.push(`${capitalize(WEEKDAYS[Number(f.day)])}s`);
        if (f.lastN && kind !== 'table') parts.push(`Last ${f.lastN}`);
        if (comp.continental && f.stage) parts.push(capitalize(STAGE_WORDS[f.stage].replace(/^the /, '')));
        if (comp.continental && f.penalties && kind !== 'table') parts.push('Penalty shootouts');
        if (comp.continental && kind === 'match-finder' && f.extraTime) parts.push('After extra time');
        if (comp.continental && kind === 'match-finder' && f.awayGoals) parts.push('Away goals');
        if (comp.continental && f.excludeQualifiers) parts.push('Main stage only');
        if (comp.continental && f.excludeMainStage) parts.push('Qualifiers only');
        if (f.points === '0') parts.push('2 points for a win');
        if (f.points === '1') parts.push('3 points for a win');
        if (f.deductions === '0') parts.push('No deductions');
        return parts;
    }

    // The League Tables tab's Copy Link parameters for the query's filters.
    // kind: 'table' (no team), 'team' (one team) or 'h2h'.
    function leagueFilterParams(comp, parsed, kind) {
        const f = parsed.filters;
        const params = {};
        if (parsed.season !== null) {
            params.season = seasonKey(parsed.season);
        } else if (parsed.eras[comp.key]) {
            params.season = parsed.eras[comp.key];
        } else {
            params.from = f.dateFrom;
            params.to = f.dateTo;
        }
        params.day = f.day;
        if (f.location === 'home') params.away = '0';
        if (f.location === 'away') params.home = '0';
        params.ded = f.deductions;
        params.p3 = f.points;
        if (kind === 'h2h') params.h2hN = f.lastN;
        if (kind === 'team') params.mhN = f.lastN;
        if (comp.continental) {
            if (f.excludeQualifiers) params.exQ = '1';
            if (f.excludeMainStage) params.exM = '1';
            if (f.stage) {
                params.stage = STAGE_VALUES.table[f.stage] || f.stage;
                const boxStage = STAGE_VALUES.box[f.stage] || f.stage;
                if (kind === 'h2h') params.h2hStage = boxStage;
                if (kind === 'team') params.mhStage = boxStage;
            }
            if (f.penalties && kind === 'h2h') params.h2hPso = '1';
            if (f.penalties && kind === 'team') params.mhPso = '1';
        }
        return params;
    }

    // Each result: { kind, icon, crestTeam?, title, detail, comp, href }
    function tableResult(comp, parsed) {
        const parts = filterDetailParts(parsed, comp, 'table');
        // A plain single season is that season's final standings in Team
        // Seasons (medal colors, each club's matches a click away). League
        // Tables only for what Team Seasons can't do: home / away / weekday
        // tables, dates, points systems, deductions, stages, qualifiers.
        const f = parsed.filters;
        const leagueTablesOnly = f.location || f.day || f.points || f.deductions ||
            (comp.continental && (f.stage || f.excludeQualifiers || f.excludeMainStage));
        if (parsed.season !== null && !leagueTablesOnly) {
            return {
                kind: 'team-seasons', icon: '📊', comp,
                title: `${comp.name} table · ${seasonKey(parsed.season)}`,
                detail: 'Final standings',
                href: competitionUrl(comp, 'team-seasons', {
                    league: comp.continental ? comp.key : '',
                    season: seasonKey(parsed.season)
                })
            };
        }
        return {
            kind: 'table', icon: '📊', comp,
            title: `${comp.name} table · ${parts[0]}`,
            detail: joinDetail(['League table', ...parts.slice(1)]),
            href: competitionUrl(comp, 'league-filters', leagueFilterParams(comp, parsed, 'table'))
        };
    }

    function teamRecordResult(comp, team, parsed) {
        const parts = filterDetailParts(parsed, comp, 'team');
        return {
            kind: 'team', icon: '', crestTeam: team, comp,
            title: `${team} · ${parts[0]}`,
            detail: joinDetail(['Record and match history', ...parts.slice(1)]),
            href: competitionUrl(comp, 'league-filters', { ...leagueFilterParams(comp, parsed, 'team'), t1: team })
        };
    }

    function headToHeadResult(comp, t1, opponents, parsed) {
        const parts = filterDetailParts(parsed, comp, 'h2h');
        return {
            kind: 'h2h', icon: '⚔️', comp,
            title: `${t1} vs ${opponentLabel(opponents).replace(/^the /, '')}`,
            detail: joinDetail(['Head to head', ...parts]),
            href: competitionUrl(comp, 'league-filters', { ...leagueFilterParams(comp, parsed, 'h2h'), t1, t2: opponents })
        };
    }

    function streaksResult(comp, t1, t2, intent) {
        const type = intent.streakType || 'winning';
        const typeLabel = STREAK_TYPE_LABELS[type];
        const who = t1 ? (t2 ? `${t1} vs ${t2}` : t1) : 'All teams';
        return {
            kind: 'streaks', icon: '⚡', comp,
            title: `${who} · ${typeLabel} streaks`,
            detail: joinDetail([intent.historic ? 'Longest in history' : 'Active streaks', locationLabel(intent.location)]),
            href: competitionUrl(comp, 'team-streaks', {
                t1, t2, type,
                status: intent.historic ? 'historic' : '',
                loc: intent.location
            })
        };
    }

    const LAST_TIME_VERBS = { win: 'won', loss: 'lost', draw: 'drew', any: 'played' };

    // Last Time When: the last time Team 1 won / lost / drew (or played),
    // against Team 2 (a team, the Big 6 or a country's clubs) or anyone.
    // The tab has no season or date filters. res= is the search's own
    // parameter (which result was asked about) - the page ignores it.
    function lastTimeResult(comp, t1, opponent, parsed, result) {
        const f = parsed.filters;
        const params = { t1, t2: opponent || '', day: f.day, loc: f.location, res: result || 'any' };
        if (comp.continental && f.stage) params.stage = STAGE_VALUES.box[f.stage] || f.stage;
        const verb = opponent
            ? `${{ win: 'beat', loss: 'lost to', draw: 'drew with', any: 'played' }[result || 'any']} ${opponentLabel([opponent])}`
            : LAST_TIME_VERBS[result || 'any'];
        return {
            kind: 'last-time-when', icon: '🔍', comp,
            title: `Last time ${t1} ${verb}`,
            detail: joinDetail([
                'Last Time When',
                locationLabel(f.location),
                f.day ? `${capitalize(WEEKDAYS[Number(f.day)])}s` : '',
                comp.continental && f.stage ? capitalize(STAGE_WORDS[f.stage].replace(/^the /, '')) : ''
            ]),
            href: competitionUrl(comp, 'last-time-when', params)
        };
    }

    function finishLabel(comp, finish) {
        const pos = comp.continental ? finish.stage : finish.rank;
        if (!pos) return '';
        if (comp.continental) {
            if (pos === 'Champions') return 'Titles';
            const round = phaseWords(pos);
            if (pos === 'Final' && !finish.better) return 'Lost in the final';
            return finish.better ? `Reached the ${round}` : `Out in the ${round}`;
        }
        if (pos === '1') return 'Titles';
        return finish.better ? `Top ${pos} finishes` : `${pos}${ordinalSuffix(pos)} place finishes`;
    }

    // Team Seasons: one team's season-by-season finishes (optionally at a
    // position / progression), or every team at a position
    function seasonsResult(comp, team, parsed, finish) {
        const pos = comp.continental ? finish.stage : finish.rank;
        const era = parsed.eras[comp.key];
        const params = {
            league: comp.continental ? comp.key : '',
            t1: team,
            season: parsed.season !== null ? seasonKey(parsed.season) : (era || ''),
            pos,
            better: pos && finish.better && pos !== '1' && pos !== 'Champions' ? '1' : '',
            first: !team && pos && finish.first ? '1' : '',
            hist: !comp.continental && finish.historic ? '1' : ''
        };
        return {
            kind: 'team-seasons', icon: '📈', comp,
            title: `${team || 'All teams'} · ${finishLabel(comp, finish) || 'Season-by-season finishes'}`,
            detail: joinDetail([
                'Team Seasons',
                parsed.season !== null ? seasonKey(parsed.season) : (era ? `${capitalize(ERA_NAMES[era].replace(/^the /, ''))} era` : 'All seasons'),
                params.first ? 'First time only' : '',
                params.hist ? 'With historic seasons' : ''
            ]),
            href: competitionUrl(comp, 'team-seasons', params)
        };
    }

    function ordinalSuffix(n) {
        const num = Number(n);
        if (num % 100 >= 11 && num % 100 <= 13) return 'th';
        return { 1: 'st', 2: 'nd', 3: 'rd' }[num % 10] || 'th';
    }

    const MATCH_FINDER_TIE_LABELS = {
        'victories': 'Biggest aggregate wins', 'defeats': 'Biggest aggregate defeats',
        'draws': 'Highest-scoring aggregate draws', 'totalGoals': 'Most aggregate goals',
        'leastGoals': 'Fewest aggregate goals', 'scoreline': 'Aggregate scoreline'
    };

    // Match Finder (needs Team 1). Single matches, or two-legged ties on
    // aggregate (Champions League, "aggregate" / "two-legged"). A
    // scoreline is home-away for single matches, Team 1-opponent for ties.
    function matchFinderResult(comp, t1, opponents, parsed, category) {
        const f = parsed.filters;
        const tie = comp.continental && f.tieMode;
        const params = { t1, t2: opponents };
        if (parsed.season !== null) params.season = seasonKey(parsed.season);
        else if (parsed.eras[comp.key]) params.season = parsed.eras[comp.key];
        else {
            params.from = f.dateFrom;
            params.to = f.dateTo;
        }
        params.day = f.day;
        if (f.location === 'home') params.away = '0';
        if (f.location === 'away') params.home = '0';
        if (category !== 'victories') params.cat = category;
        const scoreline = parsed.scoreline;
        if (category === 'scoreline' && scoreline) {
            if (tie) Object.assign(params, { t1sOp: 'exactly', t1sVal: scoreline.home, osOp: 'exactly', osVal: scoreline.away });
            else Object.assign(params, { hsOp: 'exactly', hsVal: scoreline.home, asOp: 'exactly', asVal: scoreline.away });
        }
        if (comp.continental) {
            if (tie) params.mode = 'tie';
            if (f.stage) params.stage = STAGE_VALUES.table[f.stage] || f.stage;
            if (f.penalties) params.pso = '1';
            if (f.extraTime) params.aet = '1';
            if (f.awayGoals) params.ag = '1';
            if (f.excludeQualifiers) params.exQ = '1';
            if (f.excludeMainStage) params.exM = '1';
        }
        const label = category === 'scoreline' && scoreline
            ? `${scoreline.home}-${scoreline.away} ${tie ? 'on aggregate' : 'matches'}`
            : (tie ? MATCH_FINDER_TIE_LABELS : MATCH_FINDER_LABELS)[category];
        const who = opponents.length ? `${t1} vs ${opponentLabel(opponents).replace(/^the /, '')}` : t1;
        const parts = filterDetailParts(parsed, comp, 'match-finder');
        return {
            kind: 'match-finder', icon: '🎯', comp,
            title: `${who} · ${label}`,
            detail: joinDetail([
                category === 'scoreline' && !tie ? 'Home score - away score' : (tie ? 'Two-legged ties' : 'Match Finder'),
                ...parts
            ]),
            href: competitionUrl(comp, 'match-finder', params)
        };
    }

    function dashboardResult(comp, team) {
        return {
            kind: 'dashboard', icon: '', crestTeam: team, comp,
            title: team,
            detail: 'Team Dashboard (full page)',
            href: dashboardUrl(comp, team)
        };
    }

    // Results for one competition and one set of teams ([] / [team1] /
    // [team1, ...opponents]): { primary: [...], related: [...] }
    function competitionResults(comp, teams, parsed) {
        const [t1, ...opponents] = teams;
        // A single real team as Team 2 (not the Big 6 or a country), for the
        // tabs that only take one
        const t2 = opponents.length === 1 && opponents[0] !== 'BIG_6' && !opponents[0].startsWith('COUNTRY:') ? opponents[0] : '';
        const { season, intent, scoreline } = parsed;
        const location = parsed.filters.location;
        const primary = [];
        const related = [];
        const asksForTable = season !== null || parsed.competitions.includes(comp.key) ||
            parsed.filters.dateFrom || parsed.filters.dateTo;

        switch (intent.view) {
            case 'team-streaks':
                primary.push(streaksResult(comp, t1, t2, { ...intent, location }));
                break;
            case 'last-time-when':
                // Needs a team; takes one opponent (a team, the Big 6 or a country)
                if (t1) primary.push(lastTimeResult(comp, t1, opponents[0], parsed, intent.result));
                break;
            case 'match-finder':
                // Match Finder needs a team to look from
                if (t1) primary.push(matchFinderResult(comp, t1, opponents, parsed, intent.category));
                break;
            case 'team-seasons': {
                const { rank, stage } = intent.finish;
                // A stage on its own with no team is a stage of the table
                // ("champions league 2004-05 group stage")
                if (!t1 && stage && !rank) {
                    primary.push(tableResult(comp, parsed));
                    break;
                }
                // A league position ("top 4") means nothing in the
                // Champions League, and a stage ("semi finals") nothing
                // in a league - skip the competition that can't show it
                if (comp.continental ? (rank && !stage) : (stage && !rank)) break;
                primary.push(seasonsResult(comp, t1, parsed, intent.finish));
                break;
            }
            case 'h2h':
                if (opponents.length > 0) {
                    primary.push(headToHeadResult(comp, t1, opponents, parsed));
                } else if (t1) {
                    primary.push(teamRecordResult(comp, t1, parsed));
                } else {
                    primary.push(tableResult(comp, parsed));
                }
                break;
            case 'table':
            case 'matches':
                if (t1) primary.push(teamRecordResult(comp, t1, parsed));
                else primary.push(tableResult(comp, parsed));
                break;
            default:
                if (opponents.length > 0) {
                    primary.push(headToHeadResult(comp, t1, opponents, parsed));
                    if (t2) {
                        related.push(lastTimeResult(comp, t1, t2, parsed, 'any'));
                        related.push(matchFinderResult(comp, t1, opponents, parsed, 'victories'));
                        related.push(streaksResult(comp, t1, t2, { streakType: 'winning', historic: true, location }));
                    }
                } else if (t1) {
                    primary.push(teamRecordResult(comp, t1, parsed));
                    related.push(dashboardResult(comp, t1));
                    related.push(seasonsResult(comp, t1, parsed, { rank: '', stage: '', better: false }));
                    related.push(streaksResult(comp, t1, null, { streakType: 'winning', historic: false, location }));
                    related.push(lastTimeResult(comp, t1, '', parsed, 'win'));
                    related.push(matchFinderResult(comp, t1, [], parsed, 'victories'));
                } else if (asksForTable || location || parsed.filters.day) {
                    primary.push(tableResult(comp, parsed));
                }
        }
        return { primary, related };
    }

    // An opponent group (Big 6, a country) is only in one competition
    function teamInCompetition(teamName, comp) {
        if (teamName === 'BIG_6') return comp.key === 'premier-league';
        if (teamName.startsWith('COUNTRY:')) return !!comp.continental;
        const team = SEARCH_TEAMS.get(teamName);
        if (!team) return false;
        return comp.continental ? team.continental : team.league === comp.key;
    }

    // Every reading of the mentioned teams: the first mention is Team 1,
    // the rest (and any group) its opponents. A mention can mean more than
    // one team ("Manchester") - only the first two mentions are expanded.
    function teamCombinations(mentions, opponentGroup) {
        const group = opponentGroup ? [opponentGroup] : [];
        if (mentions.length === 0) return [[]];
        const [first, second, ...others] = mentions;
        const extra = others.map(m => m.teams[0]);
        const combos = [];
        first.teams.forEach(a => {
            if (!second) combos.push([a, ...group]);
            else second.teams.forEach(b => {
                const opponents = [b, ...extra].filter(team => team !== a);
                if (opponents.length > 0) combos.push([a, ...new Set(opponents), ...group]);
            });
        });
        return combos.slice(0, 8);
    }

    const MAX_SEARCH_RESULTS = 10;

    // { results: [...], message: '' }
    function searchFor(query, scopeKey) {
        const parsed = parseSearchQuery(query);
        if (parsed.isEmpty) return { results: [], message: '' };

        const scopeComps = SEARCH_SCOPES[scopeKey] || SEARCH_SCOPES.domestic;
        let comps = scopeComps;
        if (parsed.competitions.length > 0) {
            comps = scopeComps.filter(comp => parsed.competitions.includes(comp.key));
            if (comps.length === 0) {
                const named = SEARCH_COMPETITIONS.filter(comp => parsed.competitions.includes(comp.key)).map(comp => comp.name).join(' / ');
                return { results: [], message: `${named} isn't part of this search - pick it in the dropdown.` };
            }
        }
        if (parsed.season !== null) {
            const withSeason = comps.filter(comp => competitionHasSeason(comp, parsed.season));
            if (withSeason.length === 0) {
                return { results: [], message: `There's no ${seasonKey(parsed.season)} season in ${comps.map(comp => comp.name).join(' / ')}.` };
            }
            comps = withSeason;
        }

        const primary = [];
        const related = [];
        teamCombinations(parsed.mentions, parsed.opponentGroup).forEach(teams => {
            comps.forEach(comp => {
                if (!teams.every(team => teamInCompetition(team, comp))) return;
                const found = competitionResults(comp, teams, parsed);
                primary.push(...found.primary);
                related.push(...found.related);
            });
        });

        const seen = new Set();
        const results = [...primary, ...related].filter(result => {
            if (seen.has(result.href)) return false;
            seen.add(result.href);
            return true;
        }).slice(0, MAX_SEARCH_RESULTS);

        if (results.length === 0) {
            if (parsed.intent.view === 'last-time-when' && parsed.mentions.length === 0) {
                return { results: [], message: 'Last Time When looks from one team\'s side - add a team, e.g. "last time Arsenal beat Chelsea".' };
            }
            if (parsed.intent.view === 'match-finder' && parsed.mentions.length === 0) {
                return { results: [], message: 'Match Finder looks from one team\'s side - add a team, e.g. "Arsenal biggest wins".' };
            }
            if (parsed.opponentGroup === 'BIG_6' && !comps.some(comp => comp.key === 'premier-league')) {
                return { results: [], message: 'The Big 6 are Premier League clubs - pick the Premier League in the dropdown.' };
            }
            if (parsed.opponentGroup && parsed.opponentGroup.startsWith('COUNTRY:') && !comps.some(comp => comp.continental)) {
                return { results: [], message: 'Clubs by country are a Champions League search - pick it in the dropdown.' };
            }
            if (parsed.mentions.length > 0) {
                const names = parsed.mentions.map(m => m.teams[0]).join(' and ');
                const where = comps.map(comp => comp.name).join(' / ');
                return { results: [], message: `No results for ${names} in ${where}${parsed.mentions.length > 1 ? ' together' : ''}.` };
            }
            return { results: [], message: 'No results. Try a team, a season like 2003-04, or words like table, vs, streak, last time.' };
        }
        return { results, message: '' };
    }

    // --- Answer line (search mode) ---

    // The one-line answer above a search-mode page's results. The page
    // passes what it worked out (ctx); the filters are read off the URL,
    // which is the question. ctx: { view: 'h2h' | 'team' | 'table', ready,
    // league (key), competition ('the Champions League'; used when the
    // league key has no era names), season ('2003-04' or ''), team1,
    // opponents (Team 2 values), record ({ w, d, l, total }, h2h), matches
    // (team's match rows, newest first), table (rows, by position),
    // seasonMatches (one Champions League season's match rows), logo(name) }
    function renderAnswer(el, ctx) {
        if (!el) return;
        if (!ctx.ready) {
            el.innerHTML = '<p class="search-answer-loading">Working out the answer...</p>';
            return;
        }
        const answer = describeAnswer(ctx, new URLSearchParams(window.location.search));
        if (!answer) {
            el.innerHTML = '';
            return;
        }
        const logo = answer.crestTeam && ctx.logo ? ctx.logo(answer.crestTeam) : '';
        el.innerHTML = `
            ${logo ? `<img src="${logo}" class="search-answer-crest" alt="">` : ''}
            <p class="search-answer-text">${answer.html}</p>`;
    }

    function recordHtml(w, d, l) {
        return `<span class="search-answer-record">W${w} D${d} L${l}</span>`;
    }

    function formatNumber(n) {
        return Number(n).toLocaleString('en-US');
    }

    // Competitions whose format changed in 1992-93: the English First
    // Division became the Premier League, the European Cup the Champions
    // League. [new format's first season, old name, new name, both together]
    const LEAGUE_ERAS = {
        'premier-league': [1992, 'the First Division', 'the Premier League', 'the English top flight'],
        'champions-league': [1992, 'the European Cup', 'the Champions League', 'the European Cup and Champions League']
    };

    // The competition's name for the span asked about
    function competitionName(ctx, params, recentOnly) {
        const era = LEAGUE_ERAS[ctx.league];
        if (!era) return ctx.competition;
        const [firstYear, oldName, newName, bothNames] = era;
        if (recentOnly) return newName;
        if (ERA_NAMES[params.get('season')]) return ERA_NAMES[params.get('season')];
        if (ctx.season) return Number(ctx.season.slice(0, 4)) >= firstYear ? newName : oldName;
        const from = params.get('from');
        const to = params.get('to');
        if (from && from >= `${firstYear}-07-01`) return newName;
        if (to && to < `${firstYear}-07-01`) return oldName;
        return bothNames;
    }

    // A Champions League round in words: "1. Round" -> "first round",
    // "Play-Offs (Q)" -> "qualifying play-offs"
    function phaseWords(phase) {
        if (!phase) return '';
        const qualifying = /\(Q\)/.test(phase);
        let words = phase.replace(/\s*\(Q\)/, '')
            .replace(/^1\. Round$/, 'first round').replace(/^2\. Round$/, 'second round').replace(/^3\. Round$/, 'third round')
            .toLowerCase();
        return qualifying ? `qualifying ${words}` : words;
    }

    function possessive(name) {
        return /s$/i.test(name) ? `${name}'` : `${name}'s`;
    }

    function longDate(date) {
        return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Match Finder: the top result for the category, and how many share it.
    // ctx.finder: { mode: 'single' | 'tie', category, results } - the
    // page's own sorted results (single: { match, isHome, team1Goals,
    // opponentGoals, margin, totalGoals }; tie: the same plus breakdown,
    // legMatches, lastLegDate).
    function describeMatchFinder(ctx, params, { b, location, span, penalties }) {
        const finder = ctx.finder;
        if (!ctx.team1 || !finder) return null;
        const tie = finder.mode === 'tie';
        const results = finder.results || [];
        const team1 = b(ctx.team1);
        const team1s = b(possessive(ctx.team1));
        const singleOpponent = ctx.opponents.length === 1 && ctx.opponents[0] !== 'BIG_6' && !ctx.opponents[0].startsWith('COUNTRY:');
        const against = ctx.opponents.length
            ? ` against ${singleOpponent ? b(ctx.opponents[0]) : escapeSearchHtml(opponentLabel(ctx.opponents))}`
            : '';
        const how = [
            params.get('aet') === '1' ? 'after extra time' : '',
            params.get('ag') === '1' ? 'decided on away goals' : '',
            penalties ? 'decided on penalties' : ''
        ].filter(Boolean).join(', ');
        const scope = `${how ? ` ${how}` : ''}${against} ${span}`;
        const venue = location === 'home' ? 'home ' : (location === 'away' ? 'away ' : '');
        const unit = tie ? 'tie' : 'game';

        // One result in words: "7-0 at home to Everton FC on May 11, 2005" /
        // "9-2 on aggregate against X in the 1961-62 Round Of 16"
        const opponentOf = entry => tie
            ? (entry.breakdown.teamA === ctx.team1 ? entry.breakdown.teamB : entry.breakdown.teamA)
            : (entry.isHome ? entry.match.AwayTeam : entry.match.HomeTeam);
        // "2022-23 quarter-finals" for a tie
        const tieRound = entry => {
            const last = new Date(entry.lastLegDate);
            const season = seasonKey(last.getMonth() >= 6 ? last.getFullYear() : last.getFullYear() - 1);
            const phase = entry.legMatches[0] && entry.legMatches[0].CompetitionPhase;
            return `${season}${phase ? ` ${escapeSearchHtml(phaseWords(phase))}` : ''}`;
        };
        const describeOne = entry => {
            const score = `${entry.team1Goals}-${entry.opponentGoals}`;
            if (tie) {
                return `${score} on aggregate against ${b(opponentOf(entry))} in the ${tieRound(entry)}`;
            }
            const when = `on ${longDate(entry.match.dateObj)}`;
            // One named opponent is already in the sentence
            if (singleOpponent) return `${score} ${venue ? '' : (entry.isHome ? 'at home ' : 'away ')}${when}`;
            // The venue's already in the question for a home / away search
            const where = venue ? (entry.isHome ? 'against' : 'at') : (entry.isHome ? 'at home to' : 'away at');
            return `${score} ${where} ${b(opponentOf(entry))} ${when}`;
        };
        const nothing = what => ({ crestTeam: ctx.team1, html: `No ${what} found for ${team1}${scope}.` });

        if (results.length === 0) {
            return nothing({
                victories: `${venue}${tie ? 'aggregate ' : ''}wins`, defeats: `${venue}${tie ? 'aggregate ' : ''}defeats`,
                draws: `${venue}${tie ? 'aggregate ' : ''}draws`
            }[finder.category] || `${venue}${tie ? 'ties' : 'matches'}`);
        }
        const top = results[0];
        const sharing = test => results.filter(test).length;

        switch (finder.category) {
            case 'victories':
            case 'defeats': {
                const win = finder.category === 'victories';
                // Ties won / lost on away goals are level on aggregate, so
                // there's no "biggest" - count them instead
                if (params.get('ag') === '1') {
                    const latest = [...results].sort((x, y) => new Date(y.lastLegDate) - new Date(x.lastLegDate))[0];
                    const scopeWithoutHow = scope.replace(/^ decided on away goals,?/, '');
                    return {
                        crestTeam: ctx.team1,
                        html: `${team1} have ${win ? 'won' : 'gone out of'} ${formatNumber(results.length)} two-legged tie${results.length === 1 ? '' : 's'} on away goals${scopeWithoutHow}; the most recent was ${describeOne(latest)}.`
                    };
                }
                const k = sharing(r => r.margin === top.margin);
                const noun = `${venue}${tie ? 'aggregate ' : ''}${win ? 'win' : 'defeat'}`;
                const goals = Math.abs(top.margin);
                return {
                    crestTeam: ctx.team1,
                    html: `${team1s} biggest ${noun}${scope} is ${describeOne(top)}${k > 1 ? ` - one of ${k} ${win ? 'wins' : 'defeats'} by ${goals} goal${goals === 1 ? '' : 's'}` : ''}.`
                };
            }
            case 'draws': {
                const k = sharing(r => r.totalGoals === top.totalGoals);
                return {
                    crestTeam: ctx.team1,
                    html: `${team1s} highest-scoring ${venue}${tie ? 'aggregate ' : ''}draw${scope} is ${describeOne(top)}${k > 1 ? ` - one of ${k} at ${top.team1Goals}-${top.opponentGoals}` : ''}.`
                };
            }
            case 'totalGoals': {
                const k = sharing(r => r.totalGoals === top.totalGoals);
                return {
                    crestTeam: ctx.team1,
                    html: `${team1s} highest-scoring ${venue}${unit}${scope} had ${top.totalGoals} goals: ${describeOne(top)}${k > 1 ? ` (one of ${k})` : ''}.`
                };
            }
            case 'leastGoals': {
                const k = sharing(r => r.totalGoals === top.totalGoals);
                if (top.totalGoals === 0) {
                    return {
                        crestTeam: ctx.team1,
                        html: `${team1} have had ${formatNumber(k)} goalless ${venue}${unit}${k === 1 ? '' : 's'}${scope}; the most recent was ${describeOne(top)}.`
                    };
                }
                return {
                    crestTeam: ctx.team1,
                    html: `${team1s} lowest-scoring ${venue}${unit}s${scope} had ${top.totalGoals} goal${top.totalGoals === 1 ? '' : 's'}: ${formatNumber(k)} of them, most recently ${describeOne(top)}.`
                };
            }
            case 'scoreline': {
                const n = results.length;
                if (tie) {
                    const t1Goals = params.get('t1sVal');
                    const oppGoals = params.get('osVal');
                    return {
                        crestTeam: ctx.team1,
                        html: `${formatNumber(n)} of ${team1s} ${venue}two-legged ties${scope} ended ${t1Goals}-${oppGoals} on aggregate; the most recent was against ${b(opponentOf(top))} in the ${tieRound(top)}.`
                    };
                }
                const home = params.get('hsVal');
                const away = params.get('asVal');
                const m = top.match;
                return {
                    crestTeam: ctx.team1,
                    html: `${formatNumber(n)} of ${team1s} ${venue}games${scope} ended ${home}-${away} (home team first); the most recent was ${b(m.HomeTeam)} ${m.FTHG}-${m.FTAG} ${b(m.AwayTeam)} on ${longDate(m.dateObj)}.`
                };
            }
        }
        return null;
    }

    // Last Time When. ctx.lastTime: the page's six results - team1HomeWin,
    // team1AwayWin, team1HomeDraw, team1AwayDraw, team1HomeLoss,
    // team1AwayLoss - each the latest such match (or null). res= in the URL
    // says which result was asked about (win / loss / draw / any).
    function describeLastTime(ctx, params, { b, competition }) {
        const results = ctx.lastTime;
        if (!ctx.team1 || !results) return null;
        const res = params.get('res') || 'any';
        const loc = params.get('loc') || '';
        const kinds = { win: ['Win'], loss: ['Loss'], draw: ['Draw'], any: ['Win', 'Draw', 'Loss'] }[res] || ['Win', 'Draw', 'Loss'];
        const venues = loc === 'home' ? ['Home'] : (loc === 'away' ? ['Away'] : ['Home', 'Away']);
        const candidates = [];
        kinds.forEach(kind => venues.forEach(venue => {
            const match = results[`team1${venue}${kind}`];
            if (match) candidates.push({ match, kind });
        }));
        candidates.sort((x, y) => new Date(y.match.dateObj) - new Date(x.match.dateObj));
        const latest = candidates[0];

        const opponent = ctx.opponents[0] || '';
        const against = !opponent ? ''
            : (opponent === 'BIG_6' ? ' a Big 6 club'
                : (opponent.startsWith('COUNTRY:') ? ` a club from ${escapeSearchHtml(opponent.slice('COUNTRY:'.length))}` : ` ${b(opponent)}`));
        const day = params.get('day');
        const stage = params.get('stage');
        const extras = [
            loc === 'home' ? 'at home' : (loc === 'away' ? 'away' : ''),
            day !== null && day !== '' ? `on a ${capitalize(WEEKDAYS[Number(day)])}` : '',
            stage ? `in ${STAGE_WORDS[stage] || stage}` : ''
        ].filter(Boolean).join(' ');
        const tail = extras ? ` ${extras}` : '';
        const team1 = b(ctx.team1);
        // "beat Real Madrid" / "lost to Real Madrid" / "drew with" / "played"
        const action = {
            win: opponent ? `beat${against}` : 'won',
            loss: opponent ? `lost to${against}` : 'lost',
            draw: opponent ? `drew with${against}` : 'drew',
            any: opponent ? `played${against}` : 'played'
        }[res];

        if (!latest) {
            const never = {
                win: opponent ? `beaten${against}` : 'won', loss: opponent ? `lost to${against}` : 'lost',
                draw: opponent ? `drawn with${against}` : 'drawn', any: opponent ? `played${against}` : 'played'
            }[res];
            return { crestTeam: ctx.team1, html: `${team1} have never ${never}${tail} in ${competition}.` };
        }
        const m = latest.match;
        const days = Math.floor((Date.now() - new Date(m.dateObj)) / 86400000);
        // Days, like the page, until it's long enough that years read better
        const ago = days === 0 ? 'today' : (days === 1 ? 'yesterday'
            : (days < 730 ? `${formatNumber(days)} days ago` : `${Math.floor(days / 365.25)} years ago`));
        const outcome = res === 'any' ? `, a ${{ Win: 'win', Draw: 'draw', Loss: 'defeat' }[latest.kind]}` : '';
        return {
            crestTeam: ctx.team1,
            html: `The last time ${team1} ${action}${tail} was ${longDate(m.dateObj)}: ${b(m.HomeTeam)} ${m.FTHG}-${m.FTAG} ${b(m.AwayTeam)}${outcome} (${ago}).`
        };
    }

    // Team Seasons. ctx.seasons: { rows, position, better, first } - the
    // page's own rows (newest first or any order; each has season, team
    // when it's every team at a position, and position for a league or
    // tournamentProgression for the Champions League).
    function describeTeamSeasons(ctx, params, { b, competition, shortCompetition }) {
        const data = ctx.seasons;
        if (!data) return null;
        const continental = !SEARCH_SCOPES.domestic.some(comp => comp.key === ctx.league);
        const startYear = row => Number(String(row.season).slice(0, 4));
        const rows = [...(data.rows || [])].sort((x, y) => startYear(y) - startYear(x));
        const pos = data.position || '';
        const better = !!data.better;
        const finishOf = row => continental ? row.tournamentProgression : row.position;
        const revoked = (row, team) => !!(data.revoked && data.revoked(team || row.team || ctx.team1, row.season, finishOf(row)));
        const won = row => continental ? finishOf(row) === 'Champions' : Number(finishOf(row)) === 1 && !revoked(row);
        const times = n => n === 1 ? 'once' : (n === 2 ? 'twice' : `${formatNumber(n)} times`);
        const latest = rows[0];
        const earliest = rows[rows.length - 1];
        // What the position means in words: "won", "finished 3rd in",
        // "finished in the top 4 of", "reached the semi-finals of",
        // "gone out in the quarter-finals of"
        const reachedText = () => {
            if (continental) {
                if (pos === 'Champions') return { verb: 'won', of: '' };
                const round = phaseWords(pos);
                if (pos === 'Final' && !better) return { verb: 'lost', of: ' final', noun: `lost the final of` };
                return better ? { noun: `reached the ${round} of` } : { noun: `gone out in the ${round} of` };
            }
            if (pos === '1') return { verb: 'won' };
            if (better) return { noun: `finished in the top ${pos} of` };
            return { noun: `finished ${pos}${ordinalSuffix(pos)} in` };
        };

        // One team's seasons
        if (ctx.team1) {
            const team = b(ctx.team1);
            // A single season: where they finished
            if (ctx.season) {
                const row = rows.find(r => r.season === ctx.season);
                if (!row) return { crestTeam: ctx.team1, html: `${team} weren't in the ${ctx.season} ${shortCompetition}.` };
                const current = ctx.season === seasonKey(currentSeasonStart());
                if (continental) {
                    const how = row.tournamentProgression === 'Champions' ? `won the ${ctx.season} ${shortCompetition}`
                        : (row.tournamentProgression === 'Final' ? `lost the final of the ${ctx.season} ${shortCompetition}`
                            : `${current ? 'are in' : 'went out in'} the ${phaseWords(row.tournamentProgression)} of the ${ctx.season} ${shortCompetition}`);
                    return { crestTeam: ctx.team1, html: `${team} ${how}.` };
                }
                const record = row.won !== undefined ? ` (${recordHtml(row.won, row.drawn, row.lost)})` : '';
                const points = row.points !== undefined ? ` with ${formatNumber(row.points)} points` : '';
                return {
                    crestTeam: ctx.team1,
                    html: current
                        ? `${team} are ${row.position}${ordinalSuffix(row.position)} in the ${ctx.season} ${shortCompetition}${points} after ${row.played} games${record}.`
                        : `${team} finished ${row.position}${ordinalSuffix(row.position)} in the ${ctx.season} ${shortCompetition}${points}${record}.`
                };
            }
            // At a position: how often, first and most recent
            if (pos) {
                const what = reachedText();
                if (rows.length === 0) {
                    return { crestTeam: ctx.team1, html: what.verb === 'won'
                        ? `${team} have never won ${competition}.`
                        : `${team} have never ${what.noun} ${competition}.` };
                }
                const span = rows.length > 1 ? `, first in ${earliest.season} and most recently in ${latest.season}` : ` in ${latest.season}`;
                const html = what.verb === 'won'
                    ? `${team} have won ${competition} ${times(rows.length)}${span}.`
                    : `${team} have ${what.noun} ${competition} ${times(rows.length)}${span}.`;
                return { crestTeam: ctx.team1, html };
            }
            // Every season: how many, titles, best finish
            if (rows.length === 0) return { crestTeam: ctx.team1, html: `No ${shortCompetition} seasons found for ${team}.` };
            const titles = rows.filter(won);
            let tail;
            if (titles.length) {
                tail = `winning it ${times(titles.length)}, most recently in ${titles[0].season}`;
            } else if (continental) {
                const order = ['Final', 'Semi-Finals', 'Quarter-Finals', 'Round Of 16', 'Play-Offs', 'Group Stage', '2. Round', '1. Round'];
                const best = order.find(stage => rows.some(r => finishOf(r) === stage));
                const bestRows = rows.filter(r => finishOf(r) === best);
                tail = best ? `their best run reaching the ${phaseWords(best)} (${times(bestRows.length)}, most recently in ${bestRows[0].season})` : '';
            } else {
                const bestPos = Math.min(...rows.map(r => Number(finishOf(r))));
                const bestRows = rows.filter(r => Number(finishOf(r)) === bestPos);
                tail = `with a best finish of ${bestPos}${ordinalSuffix(bestPos)} (${times(bestRows.length)}, most recently in ${bestRows[0].season})`;
            }
            return {
                crestTeam: ctx.team1,
                html: `${team} have played ${formatNumber(rows.length)} season${rows.length === 1 ? '' : 's'} in ${competition}${tail ? `, ${tail}` : ''}.`
            };
        }

        // A season's final standings: who won it (Domestic rows carry a
        // position, Continental rows how far each club got)
        if (!pos && ctx.season) {
            if (rows.length === 0) return null;
            const current = ctx.season === seasonKey(currentSeasonStart());
            if (continental) {
                const winner = rows.find(r => r.tournamentProgression === 'Champions');
                const runnerUp = rows.find(r => r.tournamentProgression === 'Final');
                if (!winner) return { html: `No final has been played yet in the ${ctx.season} ${shortCompetition}.` };
                return {
                    crestTeam: winner.team,
                    html: `${b(winner.team)} won the ${ctx.season} ${shortCompetition}${runnerUp ? `, beating ${b(runnerUp.team)} in the final` : ''}.`
                };
            }
            const leader = rows.find(r => Number(r.position) === 1) || rows[0];
            const second = rows.find(r => Number(r.position) === 2);
            // Top but stripped of the title, which wasn't awarded
            if (revoked(leader) && Number(leader.position) === 1) {
                return {
                    crestTeam: leader.team,
                    html: `${b(leader.team)} finished top of the ${ctx.season} ${shortCompetition} with ${formatNumber(leader.points)} points, but were stripped of the title - it wasn't awarded.`
                };
            }
            const gap = second ? leader.points - second.points : 0;
            if (current) {
                return {
                    crestTeam: leader.team,
                    html: `${b(leader.team)} are top of the ${ctx.season} ${shortCompetition} with ${formatNumber(leader.points)} points from ${leader.played} games${second ? `, ${gap === 0 ? `level with ${b(second.team)}` : `${gap} ahead of ${b(second.team)}`}` : ''}.`
                };
            }
            return {
                crestTeam: leader.team,
                html: `${b(leader.team)} won the ${ctx.season} ${shortCompetition} with ${formatNumber(leader.points)} points${second ? `, ${gap === 0 ? `level on points with ${b(second.team)}` : `${gap} ahead of ${b(second.team)}`}` : ''}.`
            };
        }

        // Every team at a position
        if (!pos) return null;
        if (rows.length === 0) return { html: `No seasons found.` };
        const what = reachedText();
        // A single season: who finished there
        if (ctx.season) {
            const names = rows.map(r => b(r.team));
            const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
            // Past tense for one season: "went out in", not "gone out in"
            const verb = what.verb === 'won' ? 'won' : what.noun.replace(/^gone out/, 'went out');
            return { crestTeam: rows[0].team, html: `${who} ${verb} the ${ctx.season} ${shortCompetition}.` };
        }
        const counts = {};
        rows.forEach(r => { counts[r.team] = (counts[r.team] || 0) + 1; });
        const clubs = Object.keys(counts).length;
        if (data.first) {
            const label = what.verb === 'won' ? `won ${competition}` : `${what.noun} ${competition}`;
            return {
                crestTeam: latest.team,
                html: `${formatNumber(clubs)} club${clubs === 1 ? ' has' : 's have'} ${label}; the most recent first-timer was ${b(latest.team)} in ${latest.season}.`
            };
        }
        const [leader, most] = Object.entries(counts).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
        const label = what.verb === 'won' ? `won ${competition} the most` : `${what.noun} ${competition} the most`;
        return {
            crestTeam: leader,
            html: `${b(leader)} have ${label} (${times(most)}), one of ${formatNumber(clubs)} club${clubs === 1 ? '' : 's'} to do it. The most recent was ${b(latest.team)} in ${latest.season}.`
        };
    }

    // { html, crestTeam } for the answer, or null when there's nothing to say
    function describeAnswer(ctx, params) {
        const b = text => `<strong>${escapeSearchHtml(text)}</strong>`;
        const location = params.get('home') === '0' ? 'away' : (params.get('away') === '0' ? 'home' : '');
        const lastN = Number(params.get(ctx.view === 'h2h' ? 'h2hN' : 'mhN')) || 0;
        const competition = competitionName(ctx, params, !!lastN);
        const shortCompetition = competition.replace(/^the /, '');
        const dates = describeDates(params.get('from') || '', params.get('to') || '', hasWrittenDate(params.get('q')));
        const day = params.get('day');
        const dayText = day !== null && day !== '' ? `on ${capitalize(WEEKDAYS[Number(day)])}s` : '';
        const stage = params.get(ctx.view === 'h2h' ? 'h2hStage' : (ctx.view === 'team' ? 'mhStage' : 'stage')) || params.get('stage');
        const penalties = params.get({ h2h: 'h2hPso', team: 'mhPso', 'match-finder': 'pso' }[ctx.view]) === '1';
        const qualifiersOnly = stage === 'Qualifiers' || params.get('exM') === '1';
        const mainStageOnly = params.get('exQ') === '1';

        // "in the Premier League", "in the semi-finals of the Champions
        // League", "in Champions League qualifying", "in the Champions
        // League main stage"
        let where;
        if (qualifiersOnly) where = `in ${shortCompetition} qualifying`;
        else if (stage) where = `in ${STAGE_WORDS[stage] || stage} of ${competition}`;
        else if (mainStageOnly) where = `in the ${shortCompetition} main stage`;
        else where = `in ${competition}`;
        // "all-time" only when nothing else narrows it down
        const era = !!ERA_NAMES[params.get('season')];
        const narrowed = !!(ctx.season || era || dates || dayText || stage || penalties || qualifiersOnly || mainStageOnly ||
            params.get('aet') === '1' || params.get('ag') === '1');
        const when = ctx.season ? `in ${ctx.season}` : (dates || (narrowed ? '' : 'all‑time')); // non-breaking hyphen
        const span = [where, when, dayText].filter(Boolean).join(' ');
        const onPenalties = penalties ? ', in matches decided on penalties' : '';

        if (ctx.view === 'h2h') {
            if (!ctx.team1 || !ctx.record) return null;
            const { w, d, l, total } = ctx.record;
            const singleTeam = ctx.opponents.length === 1 && ctx.opponents[0] !== 'BIG_6' && !ctx.opponents[0].startsWith('COUNTRY:');
            const against = singleTeam ? b(ctx.opponents[0]) : escapeSearchHtml(opponentLabel(ctx.opponents));
            const at = location === 'home' ? 'at home ' : (location === 'away' ? 'away ' : '');
            if (total === 0) {
                return {
                    crestTeam: ctx.team1,
                    html: `No matches found for ${b(ctx.team1)} ${at}against ${against} ${span}${penalties ? ' decided on penalties' : ''}.`
                };
            }
            const meetings = lastN
                ? `in their last ${Math.min(lastN, total)} ${shortCompetition} meetings${[when, dayText].filter(Boolean).map(t => ` ${t}`).join('')}`
                : span;
            return { crestTeam: ctx.team1, html: `${b(ctx.team1)} have a ${recordHtml(w, d, l)} record ${at}against ${against} ${meetings}${onPenalties}.` };
        }

        if (ctx.view === 'match-finder') return describeMatchFinder(ctx, params, { b, location, span, penalties });
        if (ctx.view === 'last-time-when') return describeLastTime(ctx, params, { b, competition });
        if (ctx.view === 'team-seasons') {
            // With the pre-Bundesliga / pre-Serie A champions it's the
            // national championship, not the league
            const historic = params.get('hist') === '1' && { 'bundesliga': 'the German championship', 'serie-a': 'the Italian championship' }[ctx.league];
            return describeTeamSeasons(ctx, params, {
                b,
                competition: historic || competition,
                shortCompetition: historic ? historic.replace(/^the /, '') : shortCompetition
            });
        }

        if (ctx.view === 'team') {
            if (!ctx.team1 || !ctx.matches) return null;
            const matches = lastN ? ctx.matches.slice(0, lastN) : ctx.matches;
            let w = 0, d = 0, l = 0, scored = 0, conceded = 0;
            matches.forEach(m => {
                const home = m.HomeTeam === ctx.team1;
                const gf = Number(home ? m.FTHG : m.FTAG) || 0;
                const ga = Number(home ? m.FTAG : m.FTHG) || 0;
                scored += gf;
                conceded += ga;
                if (gf > ga) w++; else if (gf < ga) l++; else d++;
            });
            const at = location === 'home' ? ' at home' : (location === 'away' ? ' away' : '');
            if (matches.length === 0) {
                return { crestTeam: ctx.team1, html: `No matches found for ${b(ctx.team1)}${at} ${span}${penalties ? ' decided on penalties' : ''}.` };
            }
            const past = ctx.season && ctx.season !== seasonKey(currentSeasonStart());
            const games = lastN
                ? `in their last ${matches.length} ${shortCompetition} games${[when, dayText].filter(Boolean).map(t => ` ${t}`).join('')}`
                : span;
            return {
                crestTeam: ctx.team1,
                html: `${b(ctx.team1)} ${past ? 'had' : 'have'} a ${recordHtml(w, d, l)} record${at} ${games}${onPenalties}, scoring ${formatNumber(scored)} and conceding ${formatNumber(conceded)}.`
            };
        }

        if (ctx.view === 'table') {
            // One Champions League season: who won the final
            if (ctx.seasonMatches) {
                const finals = ctx.seasonMatches
                    .filter(m => m.CompetitionPhase === 'Final')
                    .sort((x, y) => new Date(x.dateObj) - new Date(y.dateObj));
                const final = finals[finals.length - 1];
                if (!final) return { html: `No final has been played yet in the ${ctx.season} ${shortCompetition}.` };
                let homeWon = Number(final.FTHG) > Number(final.FTAG);
                if (Number(final.FTHG) === Number(final.FTAG)) {
                    const pso = (final.AdditionalInfo || '').match(/pso\s*(\d+):(\d+)/i);
                    if (!pso) return null;
                    homeWon = Number(pso[1]) > Number(pso[2]);
                }
                const winner = homeWon ? final.HomeTeam : final.AwayTeam;
                const runnerUp = homeWon ? final.AwayTeam : final.HomeTeam;
                return { crestTeam: winner, html: `${b(winner)} won the ${ctx.season} ${shortCompetition}, beating ${b(runnerUp)} in the final.` };
            }
            const leader = ctx.table && ctx.table[0];
            if (!leader) return null;
            // A home / away / one-weekday table
            const kindOfTable = [location, day !== null && day !== '' ? capitalize(WEEKDAYS[Number(day)]) : ''].filter(Boolean).join(' ');
            const points = `${formatNumber(leader.points)} points`;
            if (ctx.season) {
                if (ctx.season === seasonKey(currentSeasonStart())) {
                    return { crestTeam: leader.team, html: `${b(leader.team)} are top of the ${ctx.season} ${shortCompetition}${kindOfTable ? ` ${kindOfTable} table` : ''} with ${points} from ${leader.played} games.` };
                }
                return {
                    crestTeam: leader.team,
                    html: kindOfTable
                        ? `${b(leader.team)} topped the ${ctx.season} ${shortCompetition} ${kindOfTable} table with ${points}.`
                        : `${b(leader.team)} won the ${ctx.season} ${shortCompetition} with ${points}.`
                };
            }
            return {
                crestTeam: leader.team,
                html: `${b(leader.team)} have the most ${kindOfTable ? `${kindOfTable} ` : ''}points ${[where, when].filter(Boolean).join(' ')}: ${formatNumber(leader.points)} from ${formatNumber(leader.played)} games.`
            };
        }
        return null;
    }

    // --- Search bar ---

    // Result kinds whose page has a search mode: the page opens with its
    // controls hidden and just the answer showing (?search=<kind>). The
    // rest still open the full page.
    const SEARCH_MODE_KINDS = ['h2h', 'team', 'table', 'match-finder', 'team-seasons', 'last-time-when'];

    function resultHref(result, query, scope) {
        if (!SEARCH_MODE_KINDS.includes(result.kind)) return result.href;
        const qs = new URLSearchParams({ search: result.kind, q: query, scope });
        return `${result.href}&${qs.toString()}`;
    }

    function crestUrl(teamName) {
        const team = SEARCH_TEAMS.get(teamName);
        return team && team.crestId ? `https://s.hs-data.com/gfx/emblem/common/80x80/${team.crestId}.png` : '';
    }

    const SCOPE_OPTIONS_HTML = `
        <optgroup label="Domestic Football">
            <option value="domestic">Top 5 Leagues</option>
            <option value="premier-league">Premier League</option>
            <option value="la-liga">La Liga</option>
            <option value="serie-a">Serie A</option>
            <option value="bundesliga">Bundesliga</option>
            <option value="ligue-1">Ligue 1</option>
        </optgroup>
        <optgroup label="Continental Football">
            <option value="champions-league">Champions League</option>
        </optgroup>
        <optgroup label="Other Sports">
            <option value="nfl" disabled>NFL - Coming Soon</option>
            <option value="nba" disabled>NBA - Coming Soon</option>
        </optgroup>`;

    // Puts the search bar (dropdown, input, results) into container.
    // options: { query, scope, autofocus }. Returns { setQuery(text) }.
    function mount(container, options = {}) {
        container.classList.add('search-mount');
        container.innerHTML = `
            <form class="search-bar" role="search" autocomplete="off">
                <select class="search-scope" aria-label="Sport and competition to search">${SCOPE_OPTIONS_HTML}</select>
                <input type="search" class="search-input" placeholder="Teams, seasons, head to head, streaks..." aria-label="Search">
                <button type="submit" class="search-submit" aria-label="Search">🔍</button>
            </form>
            <div class="search-results hidden" role="listbox" aria-label="Search results"></div>`;
        const form = container.querySelector('.search-bar');
        const scopeSelect = container.querySelector('.search-scope');
        const input = container.querySelector('.search-input');
        const resultsEl = container.querySelector('.search-results');
        let activeIndex = -1;

        // The page's own query/scope (search mode), else the last
        // dropdown choice on this browser
        let scope = options.scope;
        if (!scope) {
            try { scope = localStorage.getItem('searchScope'); } catch (err) { /* storage blocked */ }
        }
        if (scope && SEARCH_SCOPES[scope]) scopeSelect.value = scope;
        if (options.query) input.value = options.query;
        if (options.autofocus) input.focus();

        function render(results, message) {
            activeIndex = -1;
            if (results.length === 0 && !message) {
                resultsEl.classList.add('hidden');
                resultsEl.innerHTML = '';
                return;
            }
            if (results.length === 0) {
                resultsEl.innerHTML = `<div class="search-empty">${escapeSearchHtml(message)}</div>`;
            } else {
                resultsEl.innerHTML = results.map(result => {
                    const crest = result.crestTeam ? crestUrl(result.crestTeam) : '';
                    const icon = crest
                        ? `<img src="${crest}" class="search-result-crest" alt="" loading="lazy">`
                        : `<span class="search-result-icon" aria-hidden="true">${result.icon || '⚽'}</span>`;
                    return `
                        <a class="search-result" role="option" href="${escapeSearchHtml(resultHref(result, input.value.trim(), scopeSelect.value))}">
                            ${icon}
                            <span class="search-result-text">
                                <span class="search-result-title">${escapeSearchHtml(result.title)}</span>
                                <span class="search-result-detail">${escapeSearchHtml(result.detail)}</span>
                            </span>
                            <span class="search-result-comp">${result.comp.badge}</span>
                        </a>`;
                }).join('');
            }
            resultsEl.classList.remove('hidden');
        }

        function run() {
            const { results, message } = searchFor(input.value, scopeSelect.value);
            render(results, message);
        }

        function setActive(index) {
            const items = resultsEl.querySelectorAll('.search-result');
            if (items.length === 0) return;
            activeIndex = (index + items.length) % items.length;
            items.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }

        scopeSelect.addEventListener('change', () => {
            try { localStorage.setItem('searchScope', scopeSelect.value); } catch (err) { /* ignore */ }
            run();
            input.focus();
        });
        input.addEventListener('input', run);
        input.addEventListener('focus', () => {
            if (input.value.trim() && resultsEl.classList.contains('hidden')) run();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive(activeIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive(activeIndex - 1);
            } else if (e.key === 'Escape') {
                resultsEl.classList.add('hidden');
            }
        });
        // Enter opens the highlighted result, or the top one
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            run();
            const items = resultsEl.querySelectorAll('.search-result');
            const target = items[activeIndex >= 0 ? activeIndex : 0];
            if (target) window.location.href = target.getAttribute('href');
        });
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) resultsEl.classList.add('hidden');
        });

        loadContinentalTeams(() => {
            if (!resultsEl.classList.contains('hidden')) run();
        });
        return {
            setQuery(text) {
                input.value = text;
                run();
                input.focus();
            }
        };
    }

    window.LeagueSearch = { mount, searchFor, renderAnswer };
})();
