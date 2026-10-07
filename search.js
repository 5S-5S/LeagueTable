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
            aliases: ['premier league', 'epl', 'english first division', 'first division', 'english league', 'england', 'english'] },
        { key: 'la-liga', page: 'DomesticEurope.html', name: 'La Liga', badge: '🇪🇸 La Liga',
            seasons: '1928-1935,1939-',
            aliases: ['la liga', 'laliga', 'primera division', 'spanish league', 'spain', 'spanish'] },
        { key: 'serie-a', page: 'DomesticEurope.html', name: 'Serie A', badge: '🇮🇹 Serie A',
            seasons: '1929-1942,1946-',
            aliases: ['serie a', 'italian league', 'italy', 'italian'] },
        { key: 'bundesliga', page: 'DomesticEurope.html', name: 'Bundesliga', badge: '🇩🇪 Bundesliga',
            seasons: '1963-',
            aliases: ['bundesliga', 'german league', 'germany', 'german'] },
        { key: 'ligue-1', page: 'DomesticEurope.html', name: 'Ligue 1', badge: '🇫🇷 Ligue 1',
            seasons: '1932-1938,1945-',
            aliases: ['ligue 1', 'ligue un', 'french division 1', 'division 1', 'french league', 'france', 'french'] },
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
    // A title search narrowed to one era: the other era (named, not
    // counted - the page only works out the era asked about) and the
    // search that covers both
    const ERA_TITLE_NOTES = {
        'premier-league-era-1992-2025': { other: 'the First Division era', allQuery: 'English champions' },
        'english-first-division-era-1888-1992': { other: 'the Premier League era', allQuery: 'English champions' },
        'champions-league-era-1992-2026': { other: 'the European Cup era', allQuery: 'Champions League winners all-time' },
        'european-cup-era-1955-1992': { other: 'the Champions League era', allQuery: 'Champions League winners all-time' }
    };

    // An era's name in answers and result labels
    const ERA_NAMES = {
        'premier-league-era-1992-2025': 'the Premier League',
        'english-first-division-era-1888-1992': 'the First Division',
        'champions-league-era-1992-2026': 'the Champions League',
        'european-cup-era-1955-1992': 'the European Cup'
    };

    // Italy and Germany crowned champions before Serie A (1929) and the
    // Bundesliga (1963) - Team Seasons' "historic seasons". Title questions
    // count those by default, as people do; naming the league itself
    // ("Schalke Bundesliga titles") means that league only.
    const HISTORIC_TITLE_LEAGUES = { 'serie-a': 'serie a', 'bundesliga': 'bundesliga' };

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
        'zenit': 'Zenit St. Petersburg', 'olympiakos': 'Olympiacos FC', 'braga': 'S.C. Braga',
        // Club abbreviations fans use
        'om': 'Olympique Marseille', 's04': 'FC Schalke 04', 'b04': 'Bayer Leverkusen', 'svw': 'Werder Bremen',
        'mufc': 'Manchester United', 'mcfc': 'Manchester City', 'lfc': 'Liverpool FC', 'cfc': 'Chelsea FC',
        'thfc': 'Tottenham Hotspur', 'nufc': 'Newcastle United', 'avfc': 'Aston Villa', 'whufc': 'West Ham United',
        'efc': 'Everton FC', 'lufc': 'Leeds United', 'ol': 'Olympique Lyonnais',
        'bmg': 'Bor. Mönchengladbach', 'die fohlen': 'Bor. Mönchengladbach', 'atm': 'Atlético Madrid',
        'atletico de madrid': 'Atlético Madrid'
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
        'totalGoals': 'Most total goals', 'leastGoals': 'Least total goals', 'scoreline': 'Scoreline',
        'recent': 'Most recent'
    };
    // Team Seasons' Champions League progressions ("how far they got")
    const CONTINENTAL_STAGE_PATTERNS = [
        ['Semi-Finals', /\b(semi ?finals?|semi ?finalists?|semis)\b/],
        ['Quarter-Finals', /\b(quarter ?finals?|quarter ?finalists?|quarters)\b/],
        ['Round Of 16', /\b(round of 16|last 16)\b/],
        ['Play-Offs', /\bplay ?offs?\b/],
        ['Group Stage', /\b(group stages?|groups|league phase)\b/],
        ['Final', /\b(finals?|finalists?|runners? up)\b/]
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

    // "2023-01-01" as that day in the visitor's time zone (new Date() would
    // read it as UTC midnight - the evening before, west of Greenwich)
    function localDay(iso) {
        const [year, month, day] = iso.split('-').map(Number);
        return new Date(year, month - 1, day);
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
        // A two-digit year: "1/1/23" (20xx unless that's in the future)
        take(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2})\b/g, m => {
            let [first, second] = [Number(m[1]), Number(m[2])];
            const swap = first > 12 ? false : (second > 12 ? true : !dayFirst());
            const [day, month] = swap ? [second, first] : [first, second];
            const yy = Number(m[3]);
            const year = 2000 + yy <= new Date().getFullYear() ? 2000 + yy : 1900 + yy;
            const date = isoDate(year, month, day);
            add(m[0], date, date);
        });
        // Holidays: "Christmas 2003", "Boxing Day", "New Year's Day 2010" -
        // with no year, the most recent one
        take(/\b(christmas eve|christmas day|christmas|xmas|boxing day|new year'?s? day|new year'?s?)(?:\s+(?:of\s+)?(1[89]\d{2}|20\d{2}))?\b/g, m => {
            const name = m[1];
            const [month, day] = /eve/.test(name) ? [12, 24] : (/boxing/.test(name) ? [12, 26] : (/new year/.test(name) ? [1, 1] : [12, 25]));
            let year = m[2] ? Number(m[2]) : new Date().getFullYear();
            if (!m[2] && localDay(isoDate(year, month, day)) > new Date()) year -= 1;
            const date = isoDate(year, month, day);
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
        // "1990 to 2000", "1990-2000" - two years, no "from" / "between".
        // Back-to-back years with a dash are a season ("2003-2004"), not this.
        m = marked.match(new RegExp(`\\b${BOUND}\\s*(to|until|till|-|–)\\s*${BOUND}`));
        if (m && /^\d{4}$/.test(m[1]) && /^\d{4}$/.test(m[3]) &&
            !(/[-–]/.test(m[2]) && Number(m[3]) === Number(m[1]) + 1)) {
            const first = Math.min(Number(m[1]), Number(m[3]));
            const last = Math.max(Number(m[1]), Number(m[3]));
            return result(m, `${first}-01-01`, `${last}-12-31`);
        }
        // Decades: "the 90s", "the 1990s", "in the 2010s"
        m = marked.match(/\b(?:in\s+)?(?:the\s+)?(?:(1[89]|20)(\d)0'?s|'?(\d)0'?s)\b/);
        if (m) {
            const decade = m[1] ? Number(`${m[1]}${m[2]}0`) : (Number(m[3]) >= 3 ? 1900 + Number(m[3]) * 10 : 2000 + Number(m[3]) * 10);
            return result(m, `${decade}-01-01`, `${decade + 9}-12-31`);
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
        if (m) return { n: toNumber(m[1]), text: m[0] };
        // "arsenal vs chelsea last 5" - a bare count, except the stage
        // "last 16" and spans of seasons / years
        const bare = text.match(new RegExp(`\\b(?:last|past|previous|most recent)\\s+${NUMBER_PATTERN}\\b(?!\\s*(?:seasons?|years?|-|/))`));
        if (bare && toNumber(bare[1]) !== 16) return { n: toNumber(bare[1]), text: bare[0] };
        return null;
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
        ['Semi-Finals', /\b(semi ?finals?|semi ?finalists?|semis)\b/],
        ['Quarter-Finals', /\b(quarter ?finals?|quarter ?finalists?|quarters)\b/],
        ['Round Of 16', /\b(round of 16|last 16)\b/],
        ['Play-Offs', /\bplay ?offs?\b/],
        ['Final', /\b(finals?|finalists?)\b/],
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
        'Round Of 16': 'the round of 16', 'Play-Offs': 'the play-offs', 'Qualifiers': 'qualifying',
        'Main Stage': 'the main stage'
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
            first: has(/\b(first[ -](· )*(time|titles?|ever|win|final|trophy|scudetto|championship)|for the first time|first[ -]time (champions|winners)|maiden)\b/),
            historic: has(/\b(historic|pre (serie a|bundesliga)|before the (serie a|bundesliga)|old championships?)\b/),
            // About clubs reaching a stage, not the stage's matches
            // ("first time finalists", "who reached the semi finals")
            clubs: has(/\b(finalists?|first|maiden|reached|reach|made it|who|which|clubs|teams|knocked out|went out|out in|eliminated|exits?|exited|how far)\b/)
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
                // "knocked out in the semis" / "semi final exits" / "lost the
                // final" / "exactly the quarter finals" = out at that stage
                const wentOut = runnersUp || has(/\b(knocked out|went out|go out|goes out|out in|out at|bowed out|eliminated|eliminations?|lost|lose|loses|losing|loss|losses|defeats?|defeated|exits?|exited|exactly|only|just)\b/);
                finish.better = !wentOut;
            }
        }
        if (has(/\b(or better|at least|or higher)\b/)) finish.better = true;
        if (Number(finish.rank) > 24) finish.rank = '';
        return finish;
    }

    // What the visitor is after, from the words left once teams,
    // competitions and the season are taken out
    // Season records (Seasons tab): "most points in a season", "fewest
    // goals conceded by a champion", "closest title race", "highest
    // scoring season". Team Records ranks club-seasons, League History the
    // seasons themselves. A record needs the word season (or campaign) -
    // "most goals" on its own is Match Finder's matches - except a title
    // race, home advantage or a draw rate, which are only ever seasons.
    const RECORD_SUPERLATIVES = /\b(most|highest|best|record|biggest|largest|greatest|fewest|least|lowest|worst|smallest)\b/;
    const RECORD_LOW_WORDS = /\b(fewest|least|lowest|smallest|narrowest|closest|tightest|shrunk|weakest)\b/;

    function detectRecordIntent(text) {
        const has = pattern => pattern.test(text);
        const low = has(RECORD_LOW_WORDS);
        // "per game", "goals a game" - not "in a game", which is a match
        const perGame = has(/\bper (game|match)\b|\bppg\b|(?<!\bin )\ba (game|match)\b|\baverage\b/);
        const seasonWord = has(/\b(seasons?|campaigns?)\b/);
        const clubWord = has(/\b(team|teams|club|clubs|side|sides|by)\b/);
        const clubNoun = has(/\b(team|teams|club|clubs|side|sides)\b/);

        // League History - the season itself
        // "best title race by points": the top two's average points
        if (has(/\btitle (races?|fights?|battles?)\b/) && !has(/\b(closest|tightest|narrowest|biggest|widest|one sided)\b/) &&
                has(/\b(points|quality|strongest|highest|best|greatest)\b/)) {
            return { view: 'league-history', rank: 'topTwo', order: has(/\b(lowest|weakest|worst|fewest)\b/) ? 'fewest' : 'most', perGame };
        }
        // "season with the most draws": the season is the subject, so it's
        // the league's rate, not one club's total
        const seasonSubject = text.match(/\bseasons? with (the )?(most|fewest|least|highest|lowest)\b(.*)$/);
        if (seasonSubject && (!clubWord || /\b(clubs|teams)\b/.test(seasonSubject[3]))) {
            const what = seasonSubject[3];
            const order = /fewest|least|lowest/.test(seasonSubject[2]) ? 'fewest' : 'most';
            if (/\b(draws?|drawn)\b/.test(what)) return { view: 'league-history', rank: 'drawPct', order, perGame };
            if (/\bhome wins?\b/.test(what)) return { view: 'league-history', rank: 'homePct', order, perGame };
            if (/\baway wins?\b/.test(what)) return { view: 'league-history', rank: 'awayPct', order, perGame };
            if (/\b(clubs|teams)\b/.test(what)) return { view: 'league-history', rank: 'teams', order, perGame };
            if (/\b(matches|games)\b/.test(what)) return { view: 'league-history', rank: 'games', order, perGame };
            if (/\bgoals?\b/.test(what)) return { view: 'league-history', rank: 'goals', order, perGame };
        }
        // How the league has changed: every season, in order
        if (has(/\bhow (has|have|did) (· )*(the )?(· )*(league )?(changed|evolved)\b|\b(by|each|every|per) season\b|\bover the (years|decades)\b/) &&
                !clubNoun && !has(/\b(table|standings|titles?|finish)\b/)) {
            return { view: 'league-history', rank: 'season', order: 'most', perGame: perGame || has(/\bgoals per game\b/) };
        }
        if (has(/\btitle (races?|fights?|battles?)\b/)) {
            const order = has(/\b(biggest|widest|one sided|least competitive|least close)\b/) ? 'most' : 'fewest';
            return { view: 'league-history', rank: 'gap', order, perGame };
        }
        if (has(/\b(winning|title) margins?\b|\bpoints? gaps?\b|\b(won|win|wins) (the )?(league|title|·) by\b/)) {
            return { view: 'league-history', rank: 'gap', order: low ? 'fewest' : 'most', perGame };
        }
        if (has(/\bhome (advantage|win (rate|percentage|%)|wins? percentage)\b/)) {
            return { view: 'league-history', rank: 'homePct', order: low ? 'fewest' : 'most', perGame };
        }
        if (has(/\baway (win|wins) (rate|percentage|%)\b/)) {
            return { view: 'league-history', rank: 'awayPct', order: low ? 'fewest' : 'most', perGame };
        }
        if (has(/\bdraws? (rate|percentage|%)\b/)) {
            return { view: 'league-history', rank: 'drawPct', order: low ? 'fewest' : 'most', perGame };
        }
        // (· = a competition's name taken out: "highest scoring Serie A season")
        if (!clubWord && (has(/\b(highest|lowest|most|least|fewest) scoring (· )*seasons?\b/) ||
                has(/\bseasons? with the (most|fewest|least) goals\b/) || has(/\bleague history\b/))) {
            if (has(/\bleague history\b/) && !has(RECORD_SUPERLATIVES)) return { view: 'league-history', rank: 'season', order: 'most', perGame };
            return { view: 'league-history', rank: 'goals', order: low ? 'fewest' : 'most', perGame };
        }

        // Team Records - a club's season. Match Finder's own phrasings
        // ("biggest wins", "highest scoring draws") stay its own.
        if (!has(RECORD_SUPERLATIVES)) return null;
        if (has(/\b(biggest|heaviest|largest|record|best|worst) (wins?|victory|victories|defeats?|loss|losses|beatings?)\b|\b(scoring|score|biggest) draws?\b|\bthrashings?\b|\bcomebacks?\b/)) return null;
        // How a club went out describes the finish, not the stat: "lost the
        // final" isn't losses
        const statText = text.replace(/\b(lost|lose|losing|beaten|knocked out|went out|out) (in |at )?(the )?(·|final|semi ?finals?|quarter ?finals?|round of 16|last 16|knockouts?|group stages?)\b/g, ' ');
        const hasStat = pattern => pattern.test(statText);
        let stat = null;
        if (hasStat(/\bgoal difference\b|\bgd\b/)) stat = 'goalDifference';
        else if (hasStat(/\b(conceded|conceding|goals against|let in|defen[cs]e|defensive)\b/)) stat = 'goalsAgainst';
        else if (hasStat(/\b(points?|pts|ppg)\b/)) stat = 'points';
        else if (hasStat(/\b(wins|won|victories)\b/)) stat = 'won';
        else if (hasStat(/\b(draws|drawn|drew)\b/)) stat = 'drawn';
        else if (hasStat(/\b(losses|defeats|lost)\b/)) stat = 'lost';
        else if (hasStat(/\b(goals|scored|scoring|attack)\b/)) stat = 'goalsFor';
        // "best season" / "worst season": by points
        const bestSeason = !stat && has(/\b(best|worst|greatest) (· )*(seasons?|campaigns?)\b/);
        if (bestSeason) stat = 'points';
        if (!stat) return null;
        // Goals can be a match's ("highest scoring game") - they need the
        // word season, or "by" a finish ("by a semi finalist"); points,
        // wins, draws, losses and goal difference are only ever a season's,
        // unless it says game or match ("per game" is a season's rate)
        const finishWord = has(/\b(knocked out|went out|out|lost|lose|losing|beaten) (in |at )?(the )?(final|semi|quarter|round|last 16|group)|\b(reached|reaching|reach) (the )?(final|semi|quarter|round|last 16|knockout)/) ||
            has(/\bby (a |the )?(beaten |losing )?(champions?|winners?|runners? up|finalists?|semi ?finalists?|quarter ?finalists?|(\d{1,2})(st|nd|rd|th))\b/);
        const matchWord = has(/\bin (a|the|one) (game|match)\b|(?<!\bper |\ba )\b(games?|matches|match)\b|\bdraws? in\b|\bwin in\b/);
        if (!seasonWord && ((stat === 'goalsFor' && !finishWord) || matchWord)) return null;
        // "worst defence" = most conceded, "best defence" = fewest
        const badIsMore = stat === 'goalsAgainst' || stat === 'lost';
        let order = low ? 'fewest' : 'most';
        if (has(/\bworst\b/)) order = badIsMore ? 'most' : 'fewest';
        if (has(/\bbest\b/) && badIsMore) order = 'fewest';
        const finish = detectFinish(text);
        // "by a champion", "title winners" - one season's winner
        if (!finish.rank && !finish.stage && has(/\b(champion|title winners?|won (the )?(league|title|·))\b/)) {
            finish.rank = '1';
            finish.stage = 'Champions';
        }
        return { view: 'team-records', stat, order, perGame, finish, bestSeason };
    }

    function detectIntent(text, scoreline) {
        const has = pattern => pattern.test(text);
        const location = has(/\bhome\b/) ? 'home' : (has(/\b(away|road)\b/) ? 'away' : '');

        // An unbeaten season is a season record (fewest losses), not a run
        if (has(/\b(unbeaten|undefeated) (· )*(seasons?|campaigns?)\b|\binvincibles?\b/)) {
            return { view: 'team-records', stat: 'lost', order: 'fewest', perGame: false, finish: detectFinish(text), location };
        }

        if (has(/\b(streaks?|runs?|in a row|consecutive|unbeaten|undefeated|winless|(games?|matches) without( a)? (win|winning|defeat|losing|loss|scoring|conceding))\b/)) {
            return {
                view: 'team-streaks',
                streakType: detectStreakType(text),
                // Longest ever, unless it asks about now
                historic: !has(/\b(current|currently|active|ongoing|now|right now|at the moment|this season)\b/) &&
                    has(/\b(longest|historic|historical|history|records?|all time|ever|best|worst|biggest)\b/),
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
            // Which result: "didn't win" / "didn't lose" first, then lost
            // ("were beaten by"), drew, won. Answered by Match Finder's Most
            // Recent (newest first); a scoreline becomes its Team 1 -
            // Opponent score ("lost 5-0" = 0-5 from Team 1's side).
            let result = 'any';
            // ("didn't" can arrive as "didnt" or "didn t" once punctuation goes)
            if (/\b(didn\W?\s?t|did not|failed to|fail to|without|not) (win|beat|winning|beating)\b|\bwinless\b/.test(text)) result = 'not-win';
            else if (/\b(didn\W?\s?t|did not|without|not) (lose|losing)\b|\b(avoided|avoid) defeat\b|\bunbeaten\b/.test(text)) result = 'not-loss';
            else if (/\b(lost|lose|loses|losing|loss|defeat(ed)? by|beaten by|were beaten|was beaten)\b/.test(text)) result = 'loss';
            else if (/\b(drew|draws?|drawn|tied|level)\b/.test(text)) result = 'draw';
            else if (/\b(beat|beaten|won|wins?|winning|victory|defeated|thrashed)\b/.test(text)) result = 'win';
            return { view: 'match-finder', category: 'recent', result, lastTime: true, location };
        }
        const record = detectRecordIntent(text);
        if (record) return { ...record, location };

        let category = null;
        // A two-legged tie won after losing the first leg
        if (has(/\b(comebacks?|come ?backs?|came back|remontadas?|overturn(ed|s|ing)?|turned around)\b/)) category = 'comebacks';
        else if (scoreline) category = 'scoreline';
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
        if (has(/\b(seasons|season by season|history|finish|finished|finishes|finishing|positions?|placed|titles?|champions|winners|won (the )?(league|title|cup|it|competition)|top (\d{1,2}|two|three|four|five|six|seven|eight|ten)|runners? up|finals?|finalists?|semi ?finals?|semi ?finalists?|semis|quarter ?finals?|quarter ?finalists?|quarters|round of 16|last 16|play ?offs?|group stages?|knocked out|eliminated|how far|\d{1,2}(st|nd|rd|th))\b/)) {
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

    // Named derbies, read as the two teams ("el clasico" = Barcelona vs
    // Real Madrid). Written as the clubs' full names so the team lookup
    // finds them; the word "derby" goes with them (not Derby County).
    const DERBIES = [
        [/\b(el )?cl[aá]sico\b/, 'FC Barcelona vs Real Madrid'],
        [/\b(der )?klassiker\b/, 'Bayern München vs Borussia Dortmund'],
        [/\b(le )?classique\b/, 'Paris Saint-Germain vs Olympique Marseille'],
        [/\brevierderby\b|\bruhr derby\b/, 'Borussia Dortmund vs FC Schalke 04'],
        [/\bborussen[ -]?derby\b|\bborussia derby\b/, 'Borussia Dortmund vs Bor. Mönchengladbach'],
        [/\brhein[ -]?derby\b|\brhine derby\b/, '1. FC Köln vs Bor. Mönchengladbach'],
        [/\bderby d'?italia\b/, 'Juventus vs Inter'],
        [/\b(derby della madonnina|milan derby|milano derby)\b/, 'Inter vs AC Milan'],
        [/\b(derby della capitale|rome derby|roma derby)\b/, 'AS Roma vs Lazio Roma'],
        [/\b(derby della mole|turin derby|torino derby)\b/, 'Juventus vs Torino FC'],
        [/\b(madrid derby|derbi madrile[nñ]o)\b/, 'Real Madrid vs Atlético Madrid'],
        [/\b(seville derby|sevilla derby|gran derbi)\b/, 'Sevilla FC vs Real Betis'],
        [/\bbasque derby\b/, 'Athletic Club vs Real Sociedad'],
        [/\bmerseyside derby\b/, 'Liverpool FC vs Everton FC'],
        [/\bmanchester derby\b/, 'Manchester United vs Manchester City'],
        [/\bnorth london derby\b/, 'Arsenal FC vs Tottenham Hotspur'],
        [/\bnorth west derby\b|\bnorthwest derby\b/, 'Liverpool FC vs Manchester United'],
        [/\b(tyne[ -]wear derby|tyne-tees derby)\b/, 'Newcastle United vs Sunderland AFC']
    ];

    function parseSearchQuery(query) {
        let text = ' ' + query.toLowerCase() + ' ';
        // "1st time champions" = "first time", not a 1st-place finish
        text = text.replace(/\b1st(?=[ -](time|title|ever|win|final|league|trophy|scudetto|championship)| (european|champions|bundesliga|serie|la liga|ligue|premier))/g, 'first');
        text = text.replace(/\bfor the 1st\b/g, 'for the first');
        text = text.replace(/\bthe (?=[a-z ]*derby\b)/, ' ');
        DERBIES.forEach(([pattern, teams]) => { text = text.replace(pattern, ` ${teams.toLowerCase()} `); });
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
        const leaguesNamed = []; // "bundesliga" / "serie a" typed as such
        SEARCH_COMPETITIONS
            .flatMap(comp => comp.aliases.map(alias => [alias.split(' '), comp.key]))
            .sort((a, b) => b[0].length - a[0].length)
            .forEach(([aliasWords, key]) => {
                for (let i = 0; i + aliasWords.length <= words.length; i++) {
                    const span = words.slice(i, i + aliasWords.length);
                    if (span.join(' ') === aliasWords.join(' ') && !used.slice(i, i + aliasWords.length).some(Boolean)) {
                        for (let k = i; k < i + aliasWords.length; k++) used[k] = true;
                        if (!competitions.includes(key)) competitions.push(key);
                        if (HISTORIC_TITLE_LEAGUES[key] === aliasWords.join(' ')) leaguesNamed.push(key);
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
        // Season records counting qualifiers too ("including qualifiers")
        if (intent.view === 'team-records' || intent.view === 'league-history') {
            intent.withQualifiers = /\b(including|incl|with|plus) (the )?qualif/.test(rest);
        }

        // A club's season-by-season is Team History ("Arsenal goals per
        // game by season")
        if (intent.view === 'league-history' && intent.rank === 'season' && mentions.length >= 1) {
            Object.assign(intent, { view: 'team-seasons', finish: detectFinish(rest) });
        }

        // A club named in a scoring-seasons question ("highest scoring
        // Aston Villa seasons") means that club's seasons by goals scored,
        // not the league's
        if (intent.view === 'league-history' && intent.rank === 'goals' && mentions.length >= 1) {
            Object.assign(intent, { view: 'team-records', stat: 'goalsFor', finish: detectFinish(rest) });
            delete intent.rank;
        }

        // A named opponent makes it a head to head, whatever else the
        // words suggest (a stage, "matches", "table")
        if ((mentions.length >= 2 || opponentGroup) && ['team-seasons', 'team-records', 'table', 'matches', null].includes(intent.view)) {
            intent.view = 'h2h';
        }

        // A streak with no subject - "longest unbeaten run against Chelsea",
        // "winning streaks vs the Big 6" - is every club against them
        const opponentOnly = (intent.view === 'team-streaks' ||
                (intent.view === 'match-finder' && !intent.lastTime)) && (
            (mentions.length === 1 && mentions[0].start > 0 && /^(against|vs|versus|v|over)$/.test(words[mentions[0].start - 1])) ||
            (mentions.length === 0 && !!opponentGroup));

        // The table on a date: "table on 1/1/23", "who was top at Christmas
        // 2003", "where was Arsenal on 1 January 2023" - from that season's
        // start (1 July) to the date. ("Arsenal on 10/05/2026" with no
        // table words is still that day's match.)
        const standingWords = /\b(top|bottom|leaders?|leading|first place|where (was|were)|positions?|place|standings?|tables?)\b/.test(rest);
        if (dateRange && filters.dateFrom && filters.dateFrom === filters.dateTo && mentions.length <= 1 &&
            (intent.view === 'table' || standingWords)) {
            const day = localDay(filters.dateTo);
            const start = day.getMonth() >= 6 ? day.getFullYear() : day.getFullYear() - 1;
            filters.dateFrom = isoDate(start, 7, 1);
            filters.asOf = filters.dateTo;
            intent.view = 'table';
        }

        // The matches on a day, no club named: "matches on 12/26/1963",
        // "results on Boxing Day 1963" - Match Finder's every-club list
        const matchWords = /\b(matches|match|games|game|results|fixtures|scores|scorelines|played)\b/.test(rest);
        if (dateRange && filters.dateFrom && filters.dateFrom === filters.dateTo && !filters.asOf &&
            mentions.length === 0 && !opponentGroup && matchWords) {
            intent.view = 'match-finder';
            intent.category = 'recent';
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
            leaguesNamed,
            mentions: mentions.slice(0, 6),
            opponentGroup,
            opponentOnly,
            intent,
            filters,
            // "ties decided on away goals" is all filter words, but a question
            isEmpty: words.length === 0 && !season && !scoreline && !dateRange &&
                !filters.tieMode && !filters.awayGoals && !filters.extraTime
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
            // A whole decade: "in the 1990s"
            if (yearStart(from) && yearEnd(to) && year(from) % 10 === 0 && year(to) === year(from) + 9) return `in the ${year(from)}s`;
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
    function tableResult(comp, parsed, focusTeam = '') {
        const parts = filterDetailParts(parsed, comp, 'table');
        // The table on a date: from the season's start to it. asof / who are
        // the search's own parameters (the page ignores them) for the answer.
        if (parsed.filters.asOf) {
            const params = { ...leagueFilterParams(comp, parsed, 'table'), asof: '1', who: focusTeam };
            return {
                kind: 'table', icon: '📊', comp, crestTeam: focusTeam || undefined,
                title: `${focusTeam ? `${focusTeam} · ` : ''}${comp.name} table · ${longDate(localDay(parsed.filters.asOf))}`,
                detail: joinDetail(['League table on the day', ...parts.slice(1)]),
                href: competitionUrl(comp, 'league-filters', params)
            };
        }
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

    // Team Streaks: a team's current streak (active) or its streaks of
    // 3+ games (historic), optionally against one opponent (a team, the
    // Big 6 or a country's clubs), or every team's streaks of a type. The
    // tab has no season / date filters.
    function streaksResult(comp, t1, opponent, intent, parsed) {
        const type = intent.streakType || 'winning';
        const typeLabel = STREAK_TYPE_LABELS[type];
        const vs = opponent ? ` vs ${opponentLabel([opponent]).replace(/^the /, '')}` : '';
        const who = `${t1 || 'All teams'}${vs}`;
        // "excluding qualifiers": the dropdown's All Main Stage
        const stage = parsed && comp.continental
            ? (parsed.filters.stage || (parsed.filters.excludeQualifiers ? 'Main Stage' : '')) : '';
        return {
            kind: 'team-streaks', icon: '⚡', comp,
            title: `${who} · ${typeLabel} streaks`,
            detail: joinDetail([
                intent.historic ? 'Longest in history' : 'Active streaks',
                locationLabel(intent.location),
                stage ? capitalize(STAGE_WORDS[stage].replace(/^the /, '')) : ''
            ]),
            href: competitionUrl(comp, 'team-streaks', {
                t1, t2: opponent || '', type,
                status: intent.historic ? 'historic' : '',
                loc: intent.location,
                stage: stage ? (STAGE_VALUES.box[stage] || stage) : ''
            })
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
            // Titles count the pre-league champions unless the league itself
            // was named; asking for "historic" always does
            hist: !comp.continental && (finish.historic ||
                (HISTORIC_TITLE_LEAGUES[comp.key] && pos === '1' && !finish.better &&
                    parsed.season === null && !parsed.leaguesNamed.includes(comp.key))) ? '1' : ''
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

    const RECORD_STAT_NAMES = {
        points: 'points', won: 'wins', drawn: 'draws', lost: 'losses',
        goalsFor: 'goals scored', goalsAgainst: 'goals conceded', goalDifference: 'goal difference'
    };
    const LEAGUE_HISTORY_NAMES = { homePct: 'home win %', drawPct: 'draw %', awayPct: 'away win %' };

    function eraDetail(parsed, comp) {
        const era = parsed.eras[comp.key];
        return era ? `${capitalize(ERA_NAMES[era].replace(/^the /, ''))} era` : 'All seasons';
    }

    // Team Records, through its Copy Link parameters (sub=records)
    function teamRecordsResult(comp, team, parsed, intent) {
        const { finish } = intent;
        // A league position or a stage reached - and "or better" ("top 4",
        // "reached the final") unless it's exactly that finish
        const pos = comp.continental ? finish.stage : finish.rank;
        const better = !!pos && finish.better && !['1', 'Champions'].includes(pos);
        const params = {
            league: comp.continental ? comp.key : '',
            sub: 'records',
            stat: intent.stat,
            order: intent.order,
            pos,
            better: better ? '1' : '',
            season: parsed.eras[comp.key] || '',
            t1: team,
            pg: intent.perGame ? '1' : '',
            p3: parsed.filters.points === '1' ? '1' : '',
            matches: !comp.continental ? '' : (parsed.filters.excludeMainStage ? 'qualifiers' : (intent.withQualifiers ? 'all' : ''))
        };
        const what = intent.stat === 'goalDifference'
            ? `${intent.order === 'fewest' ? 'Worst' : 'Best'} goal difference${intent.perGame ? ' per game' : ''}`
            : `${intent.order === 'fewest' ? 'Fewest' : 'Most'} ${RECORD_STAT_NAMES[intent.stat]}${intent.perGame ? ' per game' : ''}`;
        return {
            kind: 'team-records', icon: '📈', comp, crestTeam: team || undefined,
            title: `${team || 'All clubs'} · ${what} in a ${comp.continental ? 'campaign' : 'season'}`,
            detail: joinDetail([
                'Team Records',
                eraDetail(parsed, comp),
                pos ? (comp.continental ? `Reached: ${pos}${better ? ' or further' : ''}` : `Finished ${pos}${ordinalSuffix(Number(pos))}${better ? ' or better' : ''}`) : '',
                params.p3 ? '3 points for a win' : ''
            ]),
            href: competitionUrl(comp, 'team-seasons', params)
        };
    }

    // League History, through its Copy Link parameters (sub=league)
    function leagueHistoryResult(comp, parsed, intent) {
        const params = {
            league: comp.continental ? comp.key : '',
            sub: 'league',
            rank: intent.rank,
            order: intent.order,
            season: parsed.eras[comp.key] || '',
            pg: intent.perGame ? '1' : '',
            p3: !comp.continental && parsed.filters.points === '1' ? '1' : '',
            matches: !comp.continental ? '' : (parsed.filters.excludeMainStage ? 'qualifiers' : (intent.withQualifiers ? 'all' : ''))
        };
        const low = intent.order === 'fewest';
        const what = {
            season: 'Every season',
            goals: low ? 'Lowest-scoring seasons' : 'Highest-scoring seasons',
            gap: low ? 'Closest title races' : 'Biggest title-winning margins',
            topTwo: low ? "Lowest top two's points" : 'Best title races by points',
            teams: low ? 'Fewest clubs' : 'Most clubs',
            games: low ? 'Fewest matches' : 'Most matches'
        }[intent.rank] || `${low ? 'Lowest' : 'Highest'} ${LEAGUE_HISTORY_NAMES[intent.rank]}`;
        return {
            kind: 'league-history', icon: '📊', comp,
            title: `${comp.name} · ${what}${intent.perGame && intent.rank === 'goals' ? ' per game' : ''}`,
            detail: joinDetail(['League History', eraDetail(parsed, comp)]),
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
        'leastGoals': 'Fewest aggregate goals', 'scoreline': 'Aggregate scoreline',
        'recent': 'Most recent ties', 'comebacks': 'Comebacks'
    };

    // Match Finder (needs Team 1). Single matches, or two-legged ties on
    // aggregate (Champions League, "aggregate" / "two-legged"). A
    // scoreline is home-away for single matches, Team 1-opponent for ties.
    function matchFinderResult(comp, t1, opponents, parsed, category, lastTime) {
        // No Team 1: biggest defeats are the same list as biggest wins
        if (!t1 && category === 'defeats') category = 'victories';
        const f = parsed.filters;
        const tie = comp.continental && (f.tieMode || category === 'comebacks');
        const params = { t1, t2: opponents };
        // Most Recent's result, relative to Team 1. A match decided on
        // penalties is a draw at full time, so with penalties it's left out.
        const result = lastTime && lastTime.result !== 'any' && category === 'recent' && !f.penalties ? lastTime.result : '';
        if (result) params.res = result;
        // A score from Team 1's side: the bigger number is the winner's
        let recentScore = null;
        if (lastTime && category === 'recent' && parsed.scoreline) {
            const { home, away } = parsed.scoreline;
            const hi = Math.max(home, away), lo = Math.min(home, away);
            recentScore = lastTime.result === 'loss' ? [lo, hi] : (lastTime.result === 'win' ? [hi, lo] : [home, away]);
            params.t1g = recentScore[0];
            params.og = recentScore[1];
        }
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
            : (!t1 && category === 'victories' ? 'Biggest wins' : (tie ? MATCH_FINDER_TIE_LABELS : MATCH_FINDER_LABELS)[category]);
        const who = `${t1 || 'All clubs'}${opponents.length ? ` vs ${opponentLabel(opponents).replace(/^the /, '')}` : ''}`;
        const parts = filterDetailParts(parsed, comp, 'match-finder');
        // "Last time Arsenal FC beat Chelsea FC"
        const lastTimeTitle = () => {
            const opponent = opponents.length ? ` ${opponentLabel(opponents)}` : '';
            const verb = {
                win: opponent ? `beat${opponent}` : 'won', loss: opponent ? `lost to${opponent}` : 'lost',
                draw: opponent ? `drew with${opponent}` : 'drew', any: opponent ? `played${opponent}` : 'played',
                'not-win': opponent ? `didn't beat${opponent}` : "didn't win",
                'not-loss': opponent ? `didn't lose to${opponent}` : "didn't lose"
            }[lastTime.result || 'any'];
            return `Last time ${t1} ${verb}${scoreline ? ` ${scoreline.home}-${scoreline.away}` : ''}`;
        };
        // One day's matches: "First Division matches · December 26, 1963"
        const oneDay = !t1 && category === 'recent' && f.dateFrom && f.dateFrom === f.dateTo;
        // Its name then: the First Division / European Cup before 1992-93
        const oneDayName = oneDay && f.dateFrom < '1992-07-01'
            ? ({ 'premier-league': 'First Division', 'champions-league': 'European Cup' }[comp.key] || comp.name) : comp.name;
        return {
            kind: 'match-finder', icon: lastTime ? '🔍' : '🎯', comp,
            title: lastTime ? lastTimeTitle()
                : (oneDay ? `${oneDayName} matches · ${longDate(localDay(f.dateFrom))}` : `${who} · ${label}`),
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
                primary.push(streaksResult(comp, t1, opponents[0], { ...intent, location }, parsed));
                break;
            case 'match-finder':
                // Comebacks only exist in two-legged ties (the Champions League)
                if (intent.category === 'comebacks' && !comp.continental) break;
                // No Team 1: every club's matches (or ties) - but "last time"
                // is about one club
                if (t1 || !intent.lastTime) primary.push(matchFinderResult(comp, t1, opponents, parsed, intent.category, intent.lastTime ? intent : null));
                break;
            case 'team-seasons': {
                const { rank, stage } = intent.finish;
                // A stage on its own with no team is a stage of the table
                // ("champions league 2004-05 group stage")
                if (!t1 && stage && !rank && !intent.finish.clubs) {
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
            case 'team-records':
                // One season's numbers are that season's table
                if (season !== null) {
                    primary.push(tableResult(comp, parsed, t1));
                    break;
                }
                // A club's best Champions League season is how far it got
                if (comp.continental && intent.bestSeason) {
                    primary.push(seasonsResult(comp, t1, parsed, { rank: '', stage: '', better: false }));
                    break;
                }
                // A position means nothing in the Champions League, a stage
                // nothing in a league
                if (comp.continental ? (intent.finish.rank && !intent.finish.stage) : (intent.finish.stage && !intent.finish.rank)) break;
                primary.push(teamRecordsResult(comp, t1, parsed, intent));
                break;
            case 'league-history':
                // Title races are a league's - the Champions League has none
                if (comp.continental && ['gap', 'topTwo'].includes(intent.rank)) break;
                primary.push(leagueHistoryResult(comp, parsed, intent));
                break;
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
                // "where was Arsenal on ...": the table, the answer naming Arsenal
                if (t1 && parsed.filters.asOf) primary.push(tableResult(comp, parsed, t1));
                else if (t1) primary.push(teamRecordResult(comp, t1, parsed));
                else primary.push(tableResult(comp, parsed));
                break;
            default:
                if (opponents.length > 0) {
                    primary.push(headToHeadResult(comp, t1, opponents, parsed));
                    if (t2) {
                        related.push(matchFinderResult(comp, t1, [t2], parsed, 'recent', { result: 'any' }));
                        related.push(matchFinderResult(comp, t1, opponents, parsed, 'victories'));
                        related.push(streaksResult(comp, t1, t2, { streakType: 'winning', historic: true, location }, parsed));
                    }
                } else if (t1) {
                    primary.push(teamRecordResult(comp, t1, parsed));
                    related.push(dashboardResult(comp, t1));
                    related.push(seasonsResult(comp, t1, parsed, { rank: '', stage: '', better: false }));
                    related.push(streaksResult(comp, t1, '', { streakType: 'winning', historic: false, location }, parsed));
                    related.push(matchFinderResult(comp, t1, [], parsed, 'recent', { result: 'win' }));
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
        // No Team 1 when the only club is the opponent ("... against Chelsea")
        const combinations = parsed.opponentOnly
            ? (parsed.mentions.length ? parsed.mentions[0].teams.map(team => ['', team]) : [['', parsed.opponentGroup]])
            : teamCombinations(parsed.mentions, parsed.opponentGroup);
        combinations.forEach(teams => {
            comps.forEach(comp => {
                // '' = no Team 1 ("... against Chelsea"), which any competition has
                if (!teams.every(team => team === '' || teamInCompetition(team, comp))) return;
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
            if (parsed.intent.view === 'match-finder' && parsed.intent.lastTime && parsed.mentions.length === 0) {
                return { results: [], message: 'Last time questions look from one team\'s side - add a team, e.g. "last time Arsenal beat Chelsea".' };
            }
            if (parsed.intent.view === 'team-records' && parsed.intent.finish && parsed.intent.finish.stage && !parsed.intent.finish.rank && !comps.some(comp => comp.continental)) {
                return { results: [], message: 'Knockout stages (semi finals, finals...) are the Champions League\'s - pick it in the dropdown.' };
            }
            if (parsed.intent.view === 'league-history' && ['gap', 'topTwo'].includes(parsed.intent.rank) && comps.every(comp => comp.continental)) {
                return { results: [], message: 'Title races are a league\'s - the Champions League is decided by knockouts. Pick a league in the dropdown.' };
            }
            if (parsed.intent.category === 'comebacks' && !comps.some(comp => comp.continental)) {
                return { results: [], message: 'Comebacks are two-legged ties won after losing the first leg - pick the Champions League in the dropdown.' };
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
    // Team colours in the answer line: the page's colour (already made
    // readable on dark), darkened here just enough to read on the light
    // background when it's too pale (Real Madrid's gold, City's sky blue)
    const LIGHT_ANSWER_BG = [243, 244, 246];

    function luminance([r, g, b]) {
        const channel = c => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    function readableOnLight(hex) {
        const clean = hex.replace('#', '');
        if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(clean)) return hex;
        const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
        const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
        const contrast = color => (luminance(LIGHT_ANSWER_BG) + 0.05) / (luminance(color) + 0.05);
        // 3:1 is enough for large bold text; mix toward black until it is
        for (let mix = 0; mix <= 1; mix += 0.05) {
            const color = rgb.map(c => Math.round(c * (1 - mix)));
            if (contrast(color) >= 3) return `rgb(${color.join(', ')})`;
        }
        return '#000000';
    }

    function teamColor(ctx, name) {
        if (!ctx.teamColor) return '';
        // "Arsenal FC's" / "Wolves'" -> the team's own name
        const color = ctx.teamColor(name) || ctx.teamColor(name.replace(/'s?$/, ''));
        if (!color) return '';
        return document.body.getAttribute('data-theme') === 'dark' ? color : readableOnLight(color);
    }

    // Redraw the last answer when dark mode is switched, so team colours
    // follow the background
    let lastAnswer = null;
    let themeWatcher = null;
    function watchTheme() {
        if (themeWatcher || typeof MutationObserver === 'undefined') return;
        themeWatcher = new MutationObserver(() => {
            if (lastAnswer) renderAnswer(lastAnswer.el, lastAnswer.ctx);
        });
        themeWatcher.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // The last season each competition gave 2 points for a win (as the
    // Worker's winPointsFor() - Ligue 1's 1988-89 exception aside), and
    // the eras that start after it
    const LAST_TWO_POINT_SEASON = {
        'premier-league': 1980, 'la-liga': 1994, 'serie-a': 1993, 'bundesliga': 1994,
        'ligue-1': 1993, 'champions-league': 1994
    };
    const ERA_START_YEARS = {
        'premier-league-era-1992-2025': 1992, 'ligue-1-era-2002-2025': 2002,
        'champions-league-era-1992-2026': 1992
    };

    // Points as awarded mix 2 and 3 for a win across the seasons ranked -
    // say so, with the other way as a link ('' when every season in range
    // gave 3, or the question isn't about points)
    function pointsSystemNote(ctx, params) {
        const aboutPoints = (ctx.view === 'team-records' && params.get('stat') === 'points') ||
            (ctx.view === 'league-history' && ['gap', 'topTwo'].includes(params.get('rank')));
        const lastTwo = LAST_TWO_POINT_SEASON[ctx.league];
        if (!aboutPoints || lastTwo === undefined) return '';
        const eraStart = ERA_START_YEARS[params.get('season')];
        if (eraStart !== undefined && eraStart > lastTwo) return '';
        const lastSeason = `${lastTwo}-${String((lastTwo + 1) % 100).padStart(2, '0')}`;
        const threePoints = params.get('p3') === '1';
        const flipped = new URLSearchParams(params);
        if (threePoints) flipped.delete('p3'); else flipped.set('p3', '1');
        const href = `${window.location.pathname.split('/').pop()}?${flipped.toString()}`;
        return threePoints
            ? `Every win counted as 3 points here. <a href="${escapeSearchHtml(href)}">Points as awarded</a> gave 2 for a win until ${lastSeason}.`
            : `Points are as awarded: 2 for a win until ${lastSeason}. <a href="${escapeSearchHtml(href)}">Count every win as 3 points</a>?`;
    }

    // The two eras together, or the new one alone: an answer over every
    // season can offer "the Premier League only", and one for an era "the
    // First Division and Premier League together". [new era, its name
    // added to a question, the names taken out, labels]
    const ERA_SWITCHES = {
        'premier-league': {
            newEra: 'premier-league-era-1992-2025', add: 'Premier League', neutral: 'English',
            names: ['english first division', 'first division', 'premier league', 'epl'],
            only: 'the Premier League only', both: 'the First Division and Premier League together'
        },
        'champions-league': {
            newEra: 'champions-league-era-1992-2026', add: 'Champions League', neutral: 'in Europe',
            names: ['european cup', 'champions league', 'ucl', 'cl'],
            only: 'the Champions League only', both: 'the European Cup and Champions League together'
        }
    };
    const ERA_SWITCH_KINDS = ['h2h', 'team', 'table', 'match-finder', 'team-seasons', 'team-records', 'league-history'];

    // The question reworded for the other span, as a link - only when that
    // search really lands on the same view with the season switched
    function eraSwitch(ctx, params) {
        const sw = ERA_SWITCHES[ctx.league];
        const kind = params.get('search');
        const query = params.get('q') || '';
        const scope = params.get('scope') || '';
        if (!sw || !query || !ERA_SWITCH_KINDS.includes(kind)) return '';
        if (['from', 'to', 'h2hN', 'mhN'].some(key => params.get(key))) return '';
        const season = params.get('season') || '';
        const era = !!ERA_NAMES[season];
        if (season && !era) return ''; // one season
        // titles in one era already point to every era's titles
        const pos = params.get('pos');
        if (era && ERA_TITLE_NOTES[season] && (pos === '1' || pos === 'Champions') && params.get('better') !== '1') return '';

        let candidates;
        if (era) {
            const names = new RegExp(`\\b(?:the\\s+)?(?:${sw.names.join('|')})\\b`, 'gi');
            const tidy = q => q.replace(/\s+/g, ' ').replace(/\b(?:in|of)\s*$/i, '').replace(/\b(in|of) (in|of)\b/gi, '$1').trim();
            candidates = [tidy(query.replace(names, ' ')), tidy(query.replace(names, ` ${sw.neutral} `))];
        } else {
            candidates = [`${query} ${sw.add}`];
        }
        const want = era ? '' : sw.newEra;
        const keys = ['view', 'sub', 'stat', 'rank', 'order', 'cat', 'pos', 'better', 't1', 't2', 'type', 'p3', 'pg'];
        for (const q of candidates) {
            const result = (searchFor(q, scope).results || [])[0];
            if (!result || result.kind !== kind || !result.comp || result.comp.key !== ctx.league) continue;
            const href = resultHref(result, q, scope);
            const target = new URLSearchParams(href.split('?')[1] || '');
            if ((target.get('season') || '') !== want) continue;
            if (!keys.every(key => (target.get(key) || '') === (params.get(key) || ''))) continue;
            return `<a href="${escapeSearchHtml(href)}">${escapeSearchHtml(era ? sw.both : sw.only)}</a>`;
        }
        return '';
    }

    // "Did you mean": the other readings of an ambiguous question, as
    // links under the answer - "highest scoring seasons" can be the
    // league's or a club's, "unbeaten season" a season or a run of games.
    // Each is a real search in the same dropdown, so it lands on its own
    // view with its own answer; one that would land back here is skipped.
    function didYouMean(ctx, params) {
        const team = params.get('t1') || '';
        const most = params.get('order') !== 'fewest';
        const sub = params.get('sub');
        const alts = [];
        if (ctx.view === 'league-history') {
            const rank = params.get('rank');
            if (rank === 'goals') alts.push([`the ${most ? 'highest' : 'lowest'}-scoring club seasons`, `${most ? 'highest' : 'lowest'} scoring club seasons`]);
            if (rank === 'drawPct') alts.push(['the club with the most draws in a season', 'most draws in a season']);
            if (rank === 'gap' && !most) alts.push(['the biggest title-winning margins', 'biggest title winning margin'], ['the best title races by points', 'best title race by points']);
            if (rank === 'gap' && most) alts.push(['the closest title races', 'closest title race'], ['the best title races by points', 'best title race by points']);
            if (rank === 'topTwo') alts.push(['the closest title races', 'closest title race']);
        } else if (ctx.view === 'team-records' || (ctx.view === 'team-seasons' && sub === 'records')) {
            const stat = params.get('stat');
            if (stat === 'goalsFor' && !team && !params.get('pos')) alts.push([`the ${most ? 'highest' : 'lowest'}-scoring league seasons (every club's goals added up)`, `${most ? 'highest' : 'lowest'} scoring seasons`]);
            if (stat === 'drawn' && !team && most) alts.push(['the season with the most drawn matches', 'season with the most draws']);
            if (stat === 'lost' && !most) alts.push([`${team ? `${team}'s` : 'the'} longest unbeaten runs (games in a row)`, `${team} longest unbeaten run`.trim()]);
            if (stat === 'points' && team && !params.get('pos')) alts.push([`every ${team} season`, `${team} season by season`]);
        } else if (ctx.view === 'match-finder' && params.get('cat') === 'totalGoals' && !team && !params.get('t2') && params.get('mode') !== 'tie') {
            alts.push(['the highest-scoring club seasons', 'highest scoring club seasons'], ['the highest-scoring league seasons', 'highest scoring seasons']);
        } else if (ctx.view === 'team-streaks' && params.get('type') === 'unbeaten' && params.get('status') === 'historic' && !params.get('t2')) {
            alts.push([`${team ? `${team}'s` : 'the'} unbeaten seasons`, `${team} unbeaten season`.trim()]);
        }

        const scope = params.get('scope') || '';
        const here = window.location.pathname.split('/').pop() + window.location.search;

        // A finish filter, the other way: exactly that finish, or it and better
        const pos = params.get('pos');
        let flip = '';
        if (ctx.view === 'team-records' && pos && !['1', 'Champions'].includes(pos)) {
            const continental = !!(ctx.records && ctx.records.continental);
            const better = params.get('better') === '1';
            const flipped = new URLSearchParams(params);
            if (better) flipped.delete('better'); else flipped.set('better', '1');
            const label = continental
                ? (better
                    ? (pos === 'Final' ? 'only beaten finalists' : `only clubs knocked out in the ${phaseWords(pos)}`)
                    : (pos === 'Final' ? 'finalists and winners' : `clubs that reached the ${phaseWords(pos)} or further`))
                : (better ? `only teams finishing exactly ${pos}${ordinalSuffix(Number(pos))}` : `any team in the top ${pos}`);
            flip = `<a href="${escapeSearchHtml(`${window.location.pathname.split('/').pop()}?${flipped.toString()}`)}">${escapeSearchHtml(label)}</a>`;
        }
        const links = alts.map(([label, query]) => {
            const result = (searchFor(query, scope).results || [])[0];
            if (!result) return '';
            const href = resultHref(result, query, scope);
            // the same view (by its own parameters) isn't another reading
            const target = new URLSearchParams(href.split('?')[1] || '');
            const sameView = ['view', 'sub', 'stat', 'rank', 'order', 'cat', 'type', 't1'].every(key => (target.get(key) || '') === (params.get(key) || ''));
            if (sameView || href === here) return '';
            return `<a href="${escapeSearchHtml(href)}">${escapeSearchHtml(label)}</a>`;
        }).filter(Boolean);
        if (flip) links.unshift(flip);
        const eraLink = eraSwitch(ctx, params);
        if (eraLink) links.push(eraLink);
        if (!links.length) return '';
        const listed = links.length === 1 ? links[0] : `${links.slice(0, -1).join(', ')} or ${links[links.length - 1]}`;
        return `Did you mean ${listed}?`;
    }

    function renderAnswer(el, ctx) {
        if (!el) return;
        lastAnswer = { el, ctx };
        watchTheme();
        if (!ctx.ready) {
            el.innerHTML = '<p class="search-answer-loading">Working out the answer...</p>';
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const answer = describeAnswer(ctx, params);
        if (!answer) {
            el.innerHTML = '';
            return;
        }
        const notes = [answer.note, pointsSystemNote(ctx, params), didYouMean(ctx, params)].filter(Boolean);
        if (notes.length) answer.note = notes.join(' ');
        const logo = answer.crestTeam && ctx.logo ? ctx.logo(answer.crestTeam) : '';
        el.innerHTML = `
            ${logo ? `<img src="${logo}" class="search-answer-crest" alt="">` : ''}
            <div class="search-answer-body">
                <p class="search-answer-text">${answer.html}</p>
                ${answer.note ? `<p class="search-answer-note">${answer.note}</p>` : ''}
            </div>
            <button type="button" class="btn btn-secondary copy-link-trigger copy-link-inline search-answer-share">🔗 Copy Link</button>`;
        el.querySelector('.search-answer-share').addEventListener('click', copySearchLink);
    }

    // The tabs' Copy Link, for an answer: in search mode the address is
    // the question (the page keeps it), so the link is just the address.
    async function copySearchLink(event) {
        const btn = event.currentTarget;
        let copied = true;
        try {
            await navigator.clipboard.writeText(window.location.href);
        } catch (err) {
            copied = false;
        }
        btn.textContent = copied ? '✓ Copied!' : 'Copy failed';
        clearTimeout(btn._resetTimer);
        btn._resetTimer = setTimeout(() => {
            btn.textContent = '🔗 Copy Link';
        }, 1500);
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
    // A stage name in words: "Quarter-Finals" -> "quarter-finals",
    // "3. Round (Q)" / "Qualification 3. Round" -> "third qualifying round"
    function phaseWords(phase) {
        if (!phase) return '';
        const qualifying = /\(Q\)|^Qualification\b|^Qualifying\b/i.test(phase);
        const ordinals = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth' };
        let words = phase.replace(/\s*\(Q\)/, '').replace(/^Qualification\s+|^Qualifying\s+/i, '')
            .replace(/^(\d)\. Round$/, (m, n) => `${ordinals[n] || `${n}th`} round`)
            .toLowerCase();
        if (!qualifying || /preliminary/.test(words)) return words;
        return /round$/.test(words) ? words.replace(/round$/, 'qualifying round') : `qualifying ${words}`;
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
        if (!finder) return null;
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

        // No Team 1: every club's matches - "The biggest win in La Liga is
        // Athletic Club 12-1 FC Barcelona on February 8, 1931"
        if (!ctx.team1 && tie) {
            // Each tie from the winner's side (the page's t.side / t.opponent)
            if (results.length === 0) return { html: `No two-legged ties found${scope}.` };
            const top = results[0];
            const agg = t => `${b(t.side)} ${t.team1Goals}-${t.opponentGoals} ${b(t.opponent)} on aggregate in the ${tieRound(t)}`;
            const oneOf = (k, what) => k > 1 ? ` - one of ${formatNumber(k)} ${what}` : '';
            switch (finder.category) {
                case 'comebacks': {
                    const deficit = t => t.firstLegOpponentGoals - t.firstLegTeam1Goals;
                    const k = results.filter(r => deficit(r) === deficit(top)).length;
                    return { crestTeam: top.side, html: `The biggest comeback${scope} is ${b(top.side)} overturning a ${top.firstLegTeam1Goals}-${top.firstLegOpponentGoals} first-leg defeat${singleOpponent ? '' : ` against ${b(top.opponent)}`} in the ${tieRound(top)}, going through ${top.team1Goals}-${top.opponentGoals} on aggregate${oneOf(k, `from ${deficit(top)} down`)}.` };
                }
                case 'victories':
                case 'defeats': {
                    // Away goals ties are level on aggregate - count them
                    if (params.get('ag') === '1') {
                        const latest = [...results].sort((x, y) => new Date(y.lastLegDate) - new Date(x.lastLegDate))[0];
                        return { crestTeam: latest.side, html: `${formatNumber(results.length)} two-legged ties${scope.replace(/^ decided on away goals,?/, '')} were decided on away goals; the most recent was ${agg(latest)}.` };
                    }
                    const k = results.filter(r => r.margin === top.margin).length;
                    return { crestTeam: top.side, html: `The biggest aggregate win${scope} is ${agg(top)}${oneOf(k, `by ${top.margin} goals`)}.` };
                }
                case 'draws':
                    return { crestTeam: top.side, html: `The highest-scoring level tie${scope} is ${agg(top)}${top.breakdown.penalties ? ', settled on penalties' : ''}.` };
                case 'totalGoals':
                    return { crestTeam: top.side, html: `The highest-scoring tie${scope} is ${agg(top)} - ${top.totalGoals} goals.` };
                case 'leastGoals':
                case 'scoreline': {
                    const latest = [...results].sort((x, y) => new Date(y.lastLegDate) - new Date(x.lastLegDate))[0];
                    return { crestTeam: latest.side, html: `${formatNumber(results.length)} two-legged ties${scope} match; the most recent was ${agg(latest)}.` };
                }
                default:
                    return { crestTeam: top.side, html: `The most recent two-legged tie${scope} was ${agg(top)}.` };
            }
        }
        if (!ctx.team1) {
            if (results.length === 0) return { html: `No matches found${scope}.` };
            const top = results[0];
            const m = top.match;
            const score = `${b(m.HomeTeam)} ${m.FTHG}-${m.FTAG} ${b(m.AwayTeam)} on ${longDate(m.dateObj)}`;
            const crest = top.winner || m.HomeTeam;
            const level = test => results.filter(test).length;
            const oneOf = (k, what) => k > 1 ? ` - one of ${formatNumber(k)} ${what}` : '';
            switch (finder.category) {
                case 'victories':
                case 'defeats': {
                    const k = level(r => r.margin === top.margin);
                    return { crestTeam: crest, html: `The biggest win${scope} is ${score}${oneOf(k, `by ${top.margin} goals`)}.` };
                }
                case 'draws': {
                    const k = level(r => r.totalGoals === top.totalGoals);
                    return { crestTeam: crest, html: `The highest-scoring draw${scope} is ${score}${oneOf(k, 'that high')}.` };
                }
                case 'totalGoals': {
                    const k = level(r => r.totalGoals === top.totalGoals);
                    return { crestTeam: crest, html: `The highest-scoring game${scope} is ${score}, ${top.totalGoals} goals${oneOf(k, `with ${top.totalGoals}`)}.` };
                }
                case 'leastGoals': {
                    const k = level(r => r.totalGoals === top.totalGoals);
                    const latest = [...results].filter(r => r.totalGoals === top.totalGoals).sort((x, y) => new Date(y.match.dateObj) - new Date(x.match.dateObj))[0];
                    const lm = latest.match;
                    return { crestTeam: latest.winner || lm.HomeTeam, html: `${formatNumber(k)} games${scope} ended ${lm.FTHG}-${lm.FTAG}; the most recent was ${b(lm.HomeTeam)} ${lm.FTHG}-${lm.FTAG} ${b(lm.AwayTeam)} on ${longDate(lm.dateObj)}.` };
                }
                case 'scoreline':
                    return { crestTeam: crest, html: `${formatNumber(results.length)} games${scope} ended ${params.get('hsVal')}-${params.get('asVal')} (home team first); the most recent was ${score}.` };
                default: {
                    // One day's matches: how many, the goals, the biggest win
                    if (params.get('from') && params.get('from') === params.get('to')) {
                        const goals = results.reduce((sum, r) => sum + r.totalGoals, 0);
                        const biggest = [...results].sort((x, y) => y.margin - x.margin || y.totalGoals - x.totalGoals)[0];
                        const bm = biggest.match;
                        const highlight = biggest.margin > 0
                            ? `the biggest win was ${b(bm.HomeTeam)} ${bm.FTHG}-${bm.FTAG} ${b(bm.AwayTeam)}`
                            : `every game was a draw`;
                        return {
                            crestTeam: biggest.winner || bm.HomeTeam,
                            html: `${formatNumber(results.length)} game${results.length === 1 ? ' was' : 's were'} played${scope}, with ${formatNumber(goals)} goal${goals === 1 ? '' : 's'}; ${results.length === 1 ? `it finished ${b(bm.HomeTeam)} ${bm.FTHG}-${bm.FTAG} ${b(bm.AwayTeam)}` : highlight}.`
                        };
                    }
                    return { crestTeam: crest, html: `The most recent game${scope} was ${score}.` };
                }
            }
        }

        // Comebacks: "FC Barcelona's biggest comeback in the Champions
        // League was overturning a 0-4 first-leg defeat against PSG ..."
        if (finder.category === 'comebacks') {
            if (results.length === 0) {
                return { crestTeam: ctx.team1, html: `${team1} have never won a two-legged tie after losing the first leg${scope}.` };
            }
            const best = results[0];
            const b2 = best.breakdown;
            const howThrough = b2.decidedByAwayGoals ? ' on away goals'
                : (b2.penalties ? ' on penalties' : (b2.hasAet ? ' after extra time' : ''));
            const level = results.filter(r => (r.firstLegOpponentGoals - r.firstLegTeam1Goals) === (best.firstLegOpponentGoals - best.firstLegTeam1Goals)).length;
            const others = results.length > 1
                ? ` - one of ${formatNumber(results.length)} comebacks${level > 1 ? `, ${level} from that far behind` : ''}` : '';
            return {
                crestTeam: ctx.team1,
                html: `${team1s} biggest comeback${scope} was overturning a ${best.firstLegTeam1Goals}-${best.firstLegOpponentGoals} first-leg defeat against ${b(opponentOf(best))} in the ${tieRound(best)}, going through ${best.team1Goals}-${best.opponentGoals} on aggregate${howThrough}${others}.`
            };
        }

        // Most Recent: "The last time Arsenal FC beat Chelsea FC at home in
        // the Premier League was ..." (Last Time When's answer)
        if (finder.category === 'recent') {
            // The page's filters now, not the question's: a card or the
            // Result dropdown may have changed them since
            const res = finder.result || params.get('res') || 'any';
            const opp = ctx.opponents.length
                ? ` ${singleOpponent ? b(ctx.opponents[0]) : escapeSearchHtml(opponentLabel(ctx.opponents))}` : '';
            const tieWord = tie ? ' a tie' : '';
            const action = {
                win: opp ? `beat${opp}${tie ? ' in a tie' : ''}` : `won${tieWord}`,
                loss: opp ? `lost${tieWord} to${opp}` : `lost${tieWord}`,
                draw: opp ? `drew${tieWord} with${opp}` : `drew${tieWord}`,
                any: opp ? `played${opp}` : `played${tieWord}`,
                'not-win': opp ? `failed to beat${opp}` : 'failed to win',
                'not-loss': opp ? `avoided defeat against${opp}` : 'avoided defeat'
            }[res] || 'played';
            // "lost 5-0" (winner's goals first), "won 4-1", "drew 2-2"
            const goals = (now, asked) => (now === undefined ? asked : (now === '' ? null : now));
            const t1g = goals(finder.team1Goals, params.get('t1g')), og = goals(finder.opponentGoals, params.get('og'));
            const score = t1g !== null || og !== null
                ? ` ${res === 'loss' ? `${og ?? 'any'}-${t1g ?? 'any'}` : `${t1g ?? 'any'}-${og ?? 'any'}`}` : '';
            // "... in a game decided on penalties"
            const where = `${score}${venue ? ` ${venue.trim() === 'home' ? 'at home' : 'away'}` : ''}${how ? ` in a ${unit} ${how}` : ''} ${span.replace(/ all‑time$/, '')}`;
            const latest = results[0];
            if (!latest) {
                const never = {
                    win: opp ? `beaten${opp}` : 'won', loss: opp ? `lost to${opp}` : 'lost',
                    draw: opp ? `drawn with${opp}` : 'drawn', any: opp ? `played${opp}` : 'played',
                    'not-win': opp ? `failed to beat${opp}` : 'failed to win',
                    'not-loss': opp ? `avoided defeat against${opp}` : 'avoided defeat'
                }[res] || 'played';
                return { crestTeam: ctx.team1, html: `${team1} have never ${never}${where}.` };
            }
            const date = new Date(tie ? latest.lastLegDate : latest.match.dateObj);
            const days = Math.floor((Date.now() - date) / 86400000);
            const ago = days === 0 ? 'today' : (days === 1 ? 'yesterday'
                : (days < 730 ? `${formatNumber(days)} days ago` : `${Math.floor(days / 365.25)} years ago`));
            const outcomeWord = { win: 'win', draw: 'draw', loss: 'defeat' }[latest.result];
            const outcome = res === 'win' || res === 'loss' || res === 'draw' ? '' : `, a ${tie ? `${outcomeWord} on aggregate` : outcomeWord}`;
            const m = tie ? null : latest.match;
            const detail = tie
                ? `${latest.team1Goals}-${latest.opponentGoals} on aggregate against ${b(opponentOf(latest))} in the ${tieRound(latest)}`
                : `${b(m.HomeTeam)} ${m.FTHG}-${m.FTAG} ${b(m.AwayTeam)}`;
            return {
                crestTeam: ctx.team1,
                html: `The last time ${team1} ${action}${where} was ${longDate(date)}: ${detail}${outcome} (${ago}).`
            };
        }

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

    // A streak type as a run: "a 12-game unbeaten run"
    const STREAK_RUN_NOUNS = {
        'winning': 'winning run', 'unbeaten': 'unbeaten run', 'draw': 'run of draws', 'winless': 'winless run',
        'losing': 'losing run', 'clean-sheet': 'run of clean sheets', 'goals-conceded': 'run of games conceding',
        'scoring': 'scoring run', 'no-score': 'run of games without scoring'
    };

    // Team Streaks. ctx.streaks: { mode: 'active', streak } (the current
    // run's matches, newest first), { mode: 'historic', streaks } (a team's
    // runs of 3+ games: count, startDate, endDate, matches) or
    // { mode: 'league', streaks } (every team's, each with its team).
    function describeStreaks(ctx, params, { b, competition }) {
        const data = ctx.streaks;
        if (!data) return null;
        const type = params.get('type') || 'winning';
        const run = STREAK_RUN_NOUNS[type] || 'run';
        const loc = params.get('loc');
        const venue = loc === 'home' ? 'home ' : (loc === 'away' ? 'away ' : '');
        const stage = params.get('stage');
        const opponent = ctx.opponents[0] || '';
        const against = !opponent ? ''
            : ` against ${opponent === 'BIG_6' || opponent.startsWith('COUNTRY:') ? escapeSearchHtml(opponentLabel([opponent])) : b(opponent)}`;
        // "in the semi-finals of the Champions League", "in Champions League qualifying"
        const where = stage === 'Qualifiers'
            ? `${against} in ${competition.replace(/^the /, '')} qualifying`
            : `${against}${stage ? ` in ${STAGE_WORDS[stage] || stage} of` : ' in'} ${competition}`;
        const games = n => `${formatNumber(n)} game${n === 1 ? '' : 's'}`;
        // "a 12-game unbeaten run" / "an 8-game ..."
        const aRun = n => `${String(n)[0] === '8' || n === 11 || n === 18 ? 'an' : 'a'} ${n}-game ${venue}${run}`;
        const span = streak => `${longDate(streak.startDate)} to ${longDate(streak.endDate)}`;
        // "an away run", "a home run", "an unbeaten run"
        const article = words => /^[aeiou]/i.test(words) ? 'an' : 'a';

        if (data.mode === 'active') {
            const streak = data.streak || [];
            const team = b(ctx.team1);
            if (streak.length === 0) {
                return { crestTeam: ctx.team1, html: `${team} aren't on ${article(venue + run)} ${venue}${run}${where} right now.` };
            }
            const since = streak[streak.length - 1].dateObj;
            // One game isn't much of a run - say what happened instead
            if (streak.length === 1) {
                const did = {
                    'winning': 'won', 'unbeaten': 'avoided defeat in', 'draw': 'drew', 'winless': 'didn\'t win',
                    'losing': 'lost', 'clean-sheet': 'kept a clean sheet in', 'goals-conceded': 'conceded in',
                    'scoring': 'scored in', 'no-score': 'failed to score in'
                }[type] || 'played';
                return {
                    crestTeam: ctx.team1,
                    html: `${team} ${did} their last ${venue}game${where} (${longDate(since)}) - a 1-game run so far.`
                };
            }
            return {
                crestTeam: ctx.team1,
                html: `${team} are on ${aRun(streak.length)}${where}, since ${longDate(since)}.`
            };
        }

        const streaks = [...(data.streaks || [])].sort((x, y) => y.count - x.count || new Date(y.endDate) - new Date(x.endDate));
        const longest = streaks[0];
        if (data.mode === 'historic') {
            const team = b(ctx.team1);
            if (!longest) return { crestTeam: ctx.team1, html: `${team} have never had ${article(venue + run)} ${venue}${run} of 3 or more games${where}.` };
            const tied = streaks.filter(s => s.count === longest.count).length;
            return {
                crestTeam: ctx.team1,
                html: `${b(possessive(ctx.team1))} longest ${venue}${run}${where} is ${games(longest.count)}, from ${span(longest)}${tied > 1 ? ` (one of ${tied} that long)` : ''}.`
            };
        }

        // Every team's streaks
        if (!longest) return { html: `No ${venue}${run}s of 3 or more games found${where}.` };
        const active = params.get('status') !== 'historic';
        // Others level with it: "(joint with Manchester City, ...)"
        const level = streaks.filter(other => other !== longest && other.count === longest.count);
        const levelTeams = [...new Set(level.map(other => other.team))].filter(team => team !== longest.team);
        const joint = level.length === 0 ? ''
            : (levelTeams.length && levelTeams.length <= 3
                ? ` - level with ${levelTeams.map(b).join(', ')}`
                : ` - one of ${level.length + 1} that long`);
        return {
            crestTeam: longest.team,
            html: active
                ? `${b(longest.team)} are on the longest current ${venue}${run}${where}: ${games(longest.count)}, since ${longDate(longest.startDate)}${joint}.`
                : `${b(longest.team)} hold the longest ${venue}${run}${where}: ${games(longest.count)}, from ${span(longest)}${joint}.`
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
                const span = rows.length > 1 ? `, first in ${earliest.season} and most recently in ${latest.season}` : `, in ${latest.season}`;
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
            // The page may pass every season, not just each club's first:
            // the newest first-timer is the club whose first time is latest
            const firstTimes = {};
            [...rows].reverse().forEach(r => { if (!(r.team in firstTimes)) firstTimes[r.team] = r; });
            const newest = Object.values(firstTimes).sort((x, y) => startYear(y) - startYear(x))[0];
            const label = what.verb === 'won' ? `won ${competition}` : `${what.noun} ${competition}`;
            return {
                crestTeam: newest.team,
                html: `${formatNumber(clubs)} club${clubs === 1 ? ' has' : 's have'} ${label}; the most recent first-timer was ${b(newest.team)} in ${newest.season}.`
            };
        }
        const ranked = Object.entries(counts).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
        const [leader, most] = ranked[0];
        // Others with the same count ("level with Manchester United")
        const level = ranked.slice(1).filter(([, n]) => n === most).map(([team]) => team);
        const label = what.verb === 'won' ? `won ${competition} the most` : `${what.noun} ${competition} the most`;
        return {
            crestTeam: leader,
            // A range ("top 6", "reached the semis") has several clubs a
            // season, so no single "most recent"
            html: `${b(leader)} have ${label} (${times(most)}${level.length ? `, level with ${level.map(b).join(' and ')}` : ''}), one of ${formatNumber(clubs)} club${clubs === 1 ? '' : 's'} to do it.${better ? '' : ` The most recent was ${b(latest.team)} in ${latest.season}.`}`
        };
    }

    // { html, crestTeam } for the answer, or null when there's nothing to say
    // Penalty shootouts (Champions League): AdditionalInfo holds the
    // shootout score home side first ("pso 4:2"). A shootout match is often
    // a draw, or even a defeat in the second leg of a tie the team went
    // through, so a shootout answer counts who won the shootout instead of
    // the match result.
    function shootoutScore(m) {
        const pso = (m.AdditionalInfo || '').match(/pso\s*(\d+):(\d+)/i);
        return pso ? { home: Number(pso[1]), away: Number(pso[2]) } : null;
    }

    // "W2 L1 penalty shootout record ..., most recently losing 4-3 to Paris
    // Saint-Germain in the final on May 30, 2026". matches: newest first.
    // opponent: the one club already named (head to head), left out of the
    // latest shootout's wording. lastN: "in their last 3 penalty shootouts".
    function describeShootouts(b, team, matches, { verb, at, against, span, past, opponent: named = '', lastN = 0, competition = '' }) {
        const shootouts = matches.map(m => ({ m, pso: shootoutScore(m) })).filter(s => s.pso);
        if (shootouts.length === 0) {
            return { crestTeam: team, html: `${b(team)} ${past ? 'had' : 'have had'} no penalty shootouts${at}${against} ${span}.` };
        }
        let won = 0;
        shootouts.forEach(({ m, pso }) => {
            const home = m.HomeTeam === team;
            if ((home ? pso.home : pso.away) > (home ? pso.away : pso.home)) won++;
        });
        const lost = shootouts.length - won;
        const { m, pso } = shootouts[0];
        const home = m.HomeTeam === team;
        const mine = home ? pso.home : pso.away, theirs = home ? pso.away : pso.home;
        const opponent = home ? m.AwayTeam : m.HomeTeam;
        const phase = phaseWords(m.CompetitionPhase);
        const result = opponent === named
            ? (mine > theirs ? `winning ${mine}-${theirs}` : `losing ${theirs}-${mine}`)
            : (mine > theirs ? `beating ${b(opponent)} ${mine}-${theirs}` : `losing ${theirs}-${mine} to ${b(opponent)}`);
        const latest = `${result}${phase ? ` in the ${escapeSearchHtml(phase)}` : ''} on ${longDate(m.dateObj)}`;
        const record = `<span class="search-answer-record">W${won} L${lost}</span>`;
        const what = lastN
            ? `record in their last ${shootouts.length} ${competition} penalty shootouts${at}${against}`
            : `penalty shootout record${at}${against} ${span}`;
        return {
            crestTeam: team,
            html: `${b(team)} ${verb} a ${record} ${what}, ${shootouts.length === 1 ? '' : 'most recently '}${latest}.`
        };
    }

    // --- Season records (Seasons tab) ---

    // "a Premier League season", "an English top flight season", "a
    // European Cup or Champions League campaign"
    function recordScope(competition, continental) {
        const name = competition.replace(/^the /, '').replace(' and ', ' or ');
        // "an English", but "a European" (a "you" sound)
        return `${/^[aeiou]/i.test(name) && !/^(eu|uni|one)/i.test(name) ? 'an' : 'a'} ${name} ${continental ? 'campaign' : 'season'}`;
    }

    function joinNames(items) {
        return items.length <= 1 ? (items[0] || '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
    }

    // Team Records: who holds the record (every rank-1 club-season).
    // ctx.records: { rows (ranked), stat, order, perGame, threePoints,
    // position, team, continental }
    function describeTeamRecords(ctx, params, { b, competition }) {
        const r = ctx.records;
        if (!r || !r.rows) return null;
        const most = r.order !== 'fewest';
        const scope = recordScope(competition, r.continental) + (r.threePoints && r.stat === 'points' ? ' (3 points for a win)' : '');
        const rate = ['won', 'drawn', 'lost'].includes(r.stat) && r.perGame;
        const statPhrase = rate
            ? `the ${most ? 'highest' : 'lowest'} ${{ won: 'win', drawn: 'draw', lost: 'loss' }[r.stat]} rate`
            : r.stat === 'goalDifference'
                ? `the ${most ? 'best' : 'worst'} goal difference${r.perGame ? ' per game' : ''}`
                : `the ${most ? 'most' : 'fewest'} ${{ points: 'points', won: 'wins', drawn: 'draws', lost: 'losses', goalsFor: 'goals', goalsAgainst: 'goals conceded' }[r.stat]}${r.perGame ? ' per game' : ''}`;
        let by = '';
        if (r.position && r.better && !['1', 'Champions'].includes(r.position)) {
            by = r.continental
                ? ` by a club that reached the ${phaseWords(r.position)}${r.position === 'Final' ? '' : ' or further'}`
                : ` by a team finishing in the top ${r.position}`;
        } else if (r.position) {
            if (r.continental) {
                by = r.position === 'Champions' ? ' by the winners'
                    : r.position === 'Final' ? ' by a beaten finalist'
                        : ` by a club knocked out in the ${phaseWords(r.position)}`;
            } else {
                const pos = Number(r.position);
                by = pos === 1 ? ' by a champion' : pos === 2 ? ' by a runner-up' : ` by a team finishing ${pos}${ordinalSuffix(pos)}`;
            }
        }
        if (!r.rows.length) return { html: `No ${r.continental ? 'campaigns' : 'seasons'} match ${r.team ? `for ${b(r.team)} ` : ''}these filters.` };

        const top = r.rows.filter(row => row.rank === 1);
        const first = top[0];
        const value = row => {
            const v = row[r.stat];
            if (r.perGame) {
                const perGame = v / row.played;
                if (rate) return `${Math.round(perGame * 100)}% (${v} of ${row.played} games)`;
                const text = perGame.toFixed(2);
                if (r.stat === 'goalDifference') return `${perGame > 0 ? '+' : ''}${text} a game`;
                return `${text} ${{ points: 'points', goalsFor: 'goals', goalsAgainst: 'conceded' }[r.stat]} per game`;
            }
            if (r.stat === 'goalDifference') return `${v > 0 ? '+' : ''}${v}`;
            return `${formatNumber(v)} ${{ points: 'points', won: 'wins', drawn: 'draws', lost: 'losses', goalsFor: 'goals', goalsAgainst: 'goals' }[r.stat]}`;
        };
        if (r.team) {
            const seasons = joinNames(top.map(row => row.season));
            return { crestTeam: r.team, html: `${b(r.team)}${/s$/i.test(r.team) ? "'" : "'s"} ${statPhrase.replace(/^the /, '')} in ${scope}${by}: ${value(first)}, in ${seasons}.` };
        }
        if (top.length === 1) {
            return { crestTeam: first.team, html: `${b(first.team)} hold the record for ${statPhrase} in ${scope}${by}: ${value(first)} in ${first.season}.` };
        }
        if (top.length <= 3) {
            return {
                crestTeam: first.team,
                html: `${joinNames(top.map(row => `${b(row.team)} (${row.season})`))} share the record for ${statPhrase} in ${scope}${by}: ${value(first)}.`
            };
        }
        const latest = [...top].sort((x, y) => y.season.localeCompare(x.season))[0];
        return {
            crestTeam: latest.team,
            html: `${top.length} ${r.continental ? 'campaigns' : 'club-seasons'} share the record for ${statPhrase} in ${scope}${by} (${value(first)}), most recently ${b(latest.team)} in ${latest.season}.`
        };
    }

    // League History: the record season (every rank-1 season).
    // ctx.leagueHistory: { rows (ranked), rank, order, perGame, threePoints }
    function describeLeagueHistory(ctx, params, { b, competition }) {
        const h = ctx.leagueHistory;
        if (!h || !h.rows || h.rank === 'season') return null;
        // "European Cup or Champions League"
        const short = competition.replace(/^the /, '').replace(' and ', ' or ');
        if (!h.rows.length) return { html: `No ${short} seasons match these filters.` };
        const most = h.order !== 'fewest';
        const top = h.rows.filter(row => row.rank === 1);
        const latest = [...top].sort((x, y) => y.season.localeCompare(x.season))[0];
        const seasons = joinNames(top.map(row => row.season));
        const many = top.length > 1;
        const pct = row => `${(row[h.rank] * 100).toFixed(1)}%`;
        const points = v => h.perGame ? `${v.toFixed(2)} points per game` : `${formatNumber(v)} point${v === 1 ? '' : 's'}`;
        const three = h.threePoints ? ' (3 points for a win)' : '';
        switch (h.rank) {
            case 'goals': {
                const v = latest.goals;
                const goals = h.perGame ? `${v.toFixed(2)} goals per game` : `${formatNumber(v)} goals`;
                return { html: `The ${most ? 'highest' : 'lowest'}-scoring ${short} season${many ? 's were' : ' was'} ${seasons}, with ${goals}.` };
            }
            case 'homePct':
                return { html: `Home sides won ${most ? 'most' : 'least'} often in ${seasons}: ${pct(latest)} of ${short} matches.` };
            case 'awayPct':
                return { html: `Away sides won ${most ? 'most' : 'least'} often in ${seasons}: ${pct(latest)} of ${short} matches.` };
            case 'drawPct':
                return { html: `${short} matches were drawn ${most ? 'most' : 'least'} often in ${seasons}: ${pct(latest)}.` };
            case 'gap': {
                if (!most && latest.gap === 0) {
                    return {
                        crestTeam: latest.champion,
                        html: many
                            ? `${top.length} ${short} title races ended level on points, decided by a tie-break - most recently ${latest.season}, ${b(latest.champion)} ahead of ${b(latest.runnerUp)}${three}.`
                            : `The ${latest.season} ${short} title race ended level on points: ${b(latest.champion)} won it on a tie-break ahead of ${b(latest.runnerUp)}${three}.`
                    };
                }
                return {
                    crestTeam: latest.champion,
                    html: `The ${most ? 'biggest' : 'smallest'} ${short} title-winning margin is ${points(latest.gap)}${three}: ${b(latest.champion)} over ${b(latest.runnerUp)} in ${latest.season}${many ? ` (${top.length} seasons share it)` : ''}.`
                };
            }
            case 'topTwo':
                return {
                    crestTeam: latest.champion,
                    html: `The ${short} title race with the ${most ? 'most' : 'fewest'} points was ${latest.season}: ${b(latest.champion)} and ${b(latest.runnerUp)} averaged ${points(latest.topTwo)}${three}${many ? ` (${top.length} seasons share it)` : ''}.`
                };
            case 'teams':
                return { html: `The ${most ? 'most' : 'fewest'} clubs in a ${short} season: ${latest.teams}, in ${seasons}.` };
            case 'games':
                return { html: `The ${most ? 'most' : 'fewest'} matches in a ${short} season: ${formatNumber(latest.games)}, in ${seasons}.` };
            default:
                return null;
        }
    }

    function describeAnswer(ctx, params) {
        // Bold names are teams: in the team's colour
        const b = text => {
            const color = teamColor(ctx, String(text));
            return `<strong${color ? ` style="color: ${color}"` : ''}>${escapeSearchHtml(text)}</strong>`;
        };
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
            params.get('aet') === '1' || params.get('ag') === '1' || lastN > 0);
        const when = ctx.season ? `in ${ctx.season}` : (dates || (narrowed ? '' : 'all‑time')); // non-breaking hyphen
        const span = [where, when, dayText].filter(Boolean).join(' ');
        const onPenalties = penalties ? ', in matches decided on penalties' : '';

        if (ctx.view === 'h2h') {
            if (!ctx.team1 || !ctx.record) return null;
            const { w, d, l, total } = ctx.record;
            const singleTeam = ctx.opponents.length === 1 && ctx.opponents[0] !== 'BIG_6' && !ctx.opponents[0].startsWith('COUNTRY:');
            const against = singleTeam ? b(ctx.opponents[0]) : escapeSearchHtml(opponentLabel(ctx.opponents));
            const at = location === 'home' ? 'at home ' : (location === 'away' ? 'away ' : '');
            if (penalties && ctx.h2hMatches) {
                return describeShootouts(b, ctx.team1, ctx.h2hMatches, {
                    verb: 'have', at: at ? ` ${at.trim()}` : '', against: ` against ${against}`, span, past: false,
                    opponent: singleTeam ? ctx.opponents[0] : '', lastN, competition: shortCompetition
                });
            }
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
        if (ctx.view === 'team-streaks') return describeStreaks(ctx, params, { b, competition });
        if (ctx.view === 'team-records') return describeTeamRecords(ctx, params, { b, competition });
        if (ctx.view === 'league-history') return describeLeagueHistory(ctx, params, { b, competition });
        if (ctx.view === 'team-seasons') {
            // With the pre-Bundesliga / pre-Serie A champions it's the
            // national championship, not the league
            const championship = { 'bundesliga': 'the German championship', 'serie-a': 'the Italian championship' }[ctx.league];
            const historic = params.get('hist') === '1' && championship;
            const answer = describeTeamSeasons(ctx, params, {
                b,
                competition: historic || competition,
                shortCompetition: historic ? historic.replace(/^the /, '') : shortCompetition
            });
            // Titles with the league named ("Schalke Bundesliga titles"):
            // a link to the same search counting the earlier champions
            const titles = params.get('pos') === '1' && params.get('better') !== '1' && !ctx.season;
            if (answer && championship && titles && !historic) {
                const league = competition; // "the Bundesliga", "Serie A"
                const nation = championship.replace(/^the /, '').replace(' championship', ''); // "German"
                const earlier = ctx.team1 ? (ctx.historicTitles || 0) : null;
                if (earlier !== 0) {
                    const query = ctx.team1 ? `${ctx.team1} titles`
                        : (params.get('first') === '1' ? `first time ${nation} champions` : `${nation} champions`);
                    const link = new URL(window.location.href);
                    link.searchParams.set('hist', '1');
                    link.searchParams.set('q', query);
                    const what = ctx.team1
                        ? `their ${earlier === 1 ? 'one' : earlier} ${nation} championship${earlier === 1 ? '' : 's'} from before ${league}`
                        : `the ${nation} champions from before ${league}`;
                    answer.note = `Search <a href="${escapeSearchHtml(link.pathname + link.search)}">“${escapeSearchHtml(query)}”</a> to include ${what}.`;
                }
            }
            // Titles in one era ("Manchester United premier league titles"):
            // the same, pointing to every era's titles
            const eraNote = ERA_TITLE_NOTES[params.get('season')];
            const eraTitles = (params.get('pos') === '1' || params.get('pos') === 'Champions') && params.get('better') !== '1';
            if (answer && eraNote && eraTitles) {
                const query = ctx.team1 ? `${ctx.team1} titles`
                    : (params.get('first') === '1' ? `first time ${eraNote.allQuery}` : eraNote.allQuery);
                const link = new URL(window.location.href);
                link.searchParams.delete('season');
                link.searchParams.set('q', query);
                answer.note = `Search <a href="${escapeSearchHtml(link.pathname + link.search)}">“${escapeSearchHtml(query)}”</a> to include ${eraNote.other} too.`;
            }
            return answer;
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
            const past = ctx.season && ctx.season !== seasonKey(currentSeasonStart());
            if (penalties) {
                return describeShootouts(b, ctx.team1, matches, {
                    verb: past ? 'had' : 'have', at, against: '', span, past, lastN, competition: shortCompetition
                });
            }
            if (matches.length === 0) {
                return { crestTeam: ctx.team1, html: `No matches found for ${b(ctx.team1)}${at} ${span}.` };
            }
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
            // The table on a date: "On January 1, 2023, Arsenal FC were top
            // of the 2022-23 Premier League with 43 points from 16 games, 5
            // ahead of Newcastle United" / "... were 4th, 8 behind ..."
            if (params.get('asof') === '1' && params.get('to')) {
                const onDate = `On ${longDate(localDay(params.get('to')))}`;
                const startYear = Number(params.get('from').slice(0, 4));
                const seasonName = `${seasonKey(startYear)} ${shortCompetition}`;
                const pts = n => `${formatNumber(n)} point${n === 1 ? '' : 's'}`;
                const who = params.get('who');
                const row = who ? ctx.table.find(r => r.team === who) : leader;
                if (!row) return { crestTeam: who, html: `${onDate}, ${b(who)} hadn't played in the ${seasonName} yet.` };
                const place = ctx.table.indexOf(row) + 1;
                const second = ctx.table[1];
                const gap = place === 1
                    ? (second ? `, ${row.points - second.points === 0 ? `level with ${b(second.team)}` : `${pts(row.points - second.points)} ahead of ${b(second.team)}`}` : '')
                    : `, ${pts(leader.points - row.points)} behind ${b(leader.team)}`;
                const standing = place === 1 ? 'top of' : `${place}${ordinalSuffix(place)} in`;
                return {
                    crestTeam: row.team,
                    html: `${onDate}, ${b(row.team)} were ${standing} the ${seasonName} with ${pts(row.points)} from ${row.played} game${row.played === 1 ? '' : 's'}${gap}.`
                };
            }
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

    // --- Suggestions (the empty search bar's guide, the home page's chips) ---

    // Example questions per dropdown choice, grouped by kind of question -
    // every one opens an answer. The home page's "Try" chips are these too.
    const SEARCH_EXAMPLES = {
        'domestic': [
            ['Head to head', ['Barcelona vs Real Madrid at home', 'Arsenal vs Chelsea since 2010']],
            ['Seasons & tables', ['Serie A 2005-06', 'Bundesliga table since 2010']],
            ['Titles & finishes', ['Juventus titles', 'Arsenal top 4', 'First time champions Bundesliga']],
            ['Season records', ['Most points in a season', 'Closest title races']],
            ['Streaks', ['Bayern longest unbeaten run', 'Longest unbeaten run against Bayern']],
            ['Last time', ['Last time Liverpool beat Manchester United away']],
            ['Biggest wins & matches', ['PSG biggest wins', 'Highest scoring game in Bundesliga history']]
        ],
        'premier-league': [
            ['Head to head', ['Arsenal vs Chelsea', 'Arsenal vs the Big 6 at home']],
            ['Seasons & tables', ['Premier League 2003-04', 'Who was top at Christmas 2003']],
            ['Titles & finishes', ['Manchester United Premier League titles', 'Premier League champions']],
            ['Season records', ['Most points in a Premier League season', 'Biggest title winning margin', 'Highest scoring season']],
            ['Streaks', ['Arsenal longest unbeaten run', 'Longest winning streaks', 'Longest unbeaten run against Chelsea']],
            ['Last time', ['Last time Liverpool beat Everton away']],
            ['Biggest wins & matches', ['Tottenham biggest defeats', 'Newcastle highest scoring draws', 'Highest scoring game in Premier League history', 'Matches on Boxing Day 1963']]
        ],
        'la-liga': [
            ['Head to head', ['Barcelona vs Real Madrid']],
            ['Seasons & tables', ['La Liga 2010-11', 'La Liga home table 2010-11']],
            ['Titles & finishes', ['Real Madrid titles', 'Sevilla top 4', 'First time champions La Liga', 'Athletic Club seasons']],
            ['Season records', ['Most goals in a season', 'Closest title race']],
            ['Streaks', ['Barcelona longest unbeaten run', 'Longest unbeaten run against Real Madrid']],
            ['Last time', ['Last time Barcelona beat Real Madrid away']],
            ['Biggest wins & matches', ['Atletico Madrid biggest wins', 'Biggest win in La Liga history']]
        ],
        'serie-a': [
            ['Head to head', ['Juventus vs Inter', 'Inter vs AC Milan since 2010']],
            ['Seasons & tables', ['Serie A 2005-06', 'Serie A table on 1 January 2010']],
            ['Titles & finishes', ['Juventus titles', 'Napoli titles', 'Serie A champions', 'Atalanta top 4']],
            ['Season records', ['Fewest goals conceded in a season', 'Highest scoring season']],
            ['Streaks', ['AC Milan longest unbeaten run', 'Longest unbeaten run against Juventus']],
            ['Last time', ['Last time Roma beat Lazio']],
            ['Biggest wins & matches', ['Juventus biggest wins', 'Highest scoring draws in Serie A']]
        ],
        'bundesliga': [
            ['Head to head', ['Bayern vs Dortmund']],
            ['Seasons & tables', ['Bundesliga 2023-24', 'Bundesliga table since 2010', 'Bayer Leverkusen 2023-24']],
            ['Titles & finishes', ['Bayern titles', 'Werder Bremen titles', 'First time champions Bundesliga']],
            ['Season records', ['Most points by a champion', 'Biggest title winning margin']],
            ['Streaks', ['Dortmund longest winning streak', 'Longest winning streak against Dortmund']],
            ['Last time', ['Last time Schalke beat Dortmund']],
            ['Biggest wins & matches', ['Bayern biggest wins', 'Biggest win in Bundesliga history']]
        ],
        'ligue-1': [
            ['Head to head', ['PSG vs Marseille', 'PSG vs Lyon since 2012']],
            ['Seasons & tables', ['Ligue 1 1992-93', 'Lille 2010-11']],
            ['Titles & finishes', ['Saint-Etienne titles', 'Lyon titles', 'Ligue 1 champions']],
            ['Season records', ['Most wins in a season', 'Closest title race']],
            ['Streaks', ['PSG longest unbeaten run', 'Longest unbeaten run against PSG']],
            ['Last time', ['Last time Marseille beat PSG away']],
            ['Biggest wins & matches', ['Monaco biggest wins', 'Biggest win in Ligue 1 history']]
        ],
        'champions-league': [
            ['Head to head', ['Real Madrid vs Bayern', 'Arsenal vs Spain']],
            ['Seasons & tables', ['Champions League 2004-05']],
            ['Titles & finishes', ['Real Madrid titles', 'Champions League winners', 'Liverpool lost in the final', 'Ajax European Cup titles']],
            ['Season records', ['Most goals in a campaign', 'Highest scoring season']],
            ['Streaks', ['Bayern longest winning streak in the knockouts', 'Longest unbeaten run against English clubs']],
            ['Last time', ['Last time Real Madrid lost to English clubs']],
            ['Biggest wins & matches', ['Real Madrid biggest aggregate wins', 'Barcelona comebacks', 'Biggest comebacks', 'Biggest wins all-time']]
        ]
    };

    // Words that can be added to any question, per dropdown choice
    const DOMESTIC_MODIFIERS = ['at home / away', 'since 2010', 'between 1990 and 2000', 'since 01/01/1991',
        'last 10 meetings', 'on a Sunday', '2 points for a win', 'without deductions'];
    const SEARCH_MODIFIERS = {
        'domestic': DOMESTIC_MODIFIERS,
        'premier-league': ['at home / away', 'vs the Big 6', 'Premier League / First Division', 'since 2010',
            'last 10 meetings', 'on a Sunday', '2 points for a win'],
        'la-liga': DOMESTIC_MODIFIERS,
        'serie-a': [...DOMESTIC_MODIFIERS.slice(0, 6), 'Serie A titles (no pre-1929)'],
        'bundesliga': [...DOMESTIC_MODIFIERS.slice(0, 6), 'Bundesliga titles (no pre-1963)'],
        'ligue-1': DOMESTIC_MODIFIERS,
        'champions-league': ['at home / away', 'semi finals / semi final exits', 'knockouts', 'on aggregate', 'on penalties',
            'after extra time', 'vs English clubs', 'Champions League / European Cup', 'since 2010']
    };

    const GUIDE_ICONS = {
        'Head to head': '⚔️', 'Seasons & tables': '📊', 'Titles & finishes': '🏆',
        'Streaks': '⚡', 'Last time': '🔍', 'Biggest wins & matches': '🎯', 'Season records': '📈'
    };

    // The example questions for a dropdown choice, as one list
    function examples(scope) {
        return (SEARCH_EXAMPLES[scope] || SEARCH_EXAMPLES.domestic).flatMap(([, items]) => items);
    }

    // --- Search bar ---

    // Result kinds whose page has a search mode: the page opens with its
    // controls hidden and just the answer showing (?search=<kind>). The
    // rest still open the full page.
    const SEARCH_MODE_KINDS = ['h2h', 'team', 'table', 'match-finder', 'team-seasons', 'team-streaks', 'team-records', 'league-history'];

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
    // options: { query, scope, autofocus, onScopeChange(scope) }.
    // Returns { setQuery(text), scope() }.
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

        // The empty bar's guide: this dropdown choice's example questions,
        // grouped, each opening its answer, then words to add to any question
        function renderGuide() {
            const scope = scopeSelect.value;
            const groups = SEARCH_EXAMPLES[scope] || SEARCH_EXAMPLES.domestic;
            activeIndex = -1;
            resultsEl.innerHTML = groups.map(([label, items]) => `
                <div class="search-guide-group"><span class="search-guide-icon">${GUIDE_ICONS[label] || ''}</span>${escapeSearchHtml(label)}</div>
                ${items.map(text => {
                    const top = searchFor(text, scope).results[0];
                    if (!top) return '';
                    return `
                        <a class="search-result search-guide-item" role="option" href="${escapeSearchHtml(resultHref(top, text, scope))}">
                            <span class="search-result-title">${escapeSearchHtml(text)}</span>
                            <span class="search-result-comp">${top.comp.badge}</span>
                        </a>`;
                }).join('')}`).join('') + `
                <div class="search-guide-tips">
                    <span class="search-guide-tips-label">Add to any question:</span>
                    ${(SEARCH_MODIFIERS[scope] || DOMESTIC_MODIFIERS).map(tip => `<span class="search-guide-tip">${escapeSearchHtml(tip)}</span>`).join('')}
                </div>`;
            resultsEl.classList.remove('hidden');
        }

        function run() {
            // Nothing typed: the guide while the bar has focus
            if (!input.value.trim()) {
                if (document.activeElement === input) renderGuide();
                else render([], '');
                return;
            }
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
            if (options.onScopeChange) options.onScopeChange(scopeSelect.value);
            run();
            input.focus();
        });
        input.addEventListener('input', run);
        input.addEventListener('focus', () => {
            if (resultsEl.classList.contains('hidden')) run();
        });
        // Already focused (the home page focuses the bar on load): a click
        // opens the guide or the results again
        input.addEventListener('click', () => {
            if (resultsEl.classList.contains('hidden')) run();
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
            // Empty bar: only an example picked with the arrow keys opens
            if (!input.value.trim()) {
                const picked = resultsEl.querySelectorAll('.search-result')[activeIndex];
                if (picked) window.location.href = picked.getAttribute('href');
                return;
            }
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
            scope: () => scopeSelect.value,
            setQuery(text) {
                input.value = text;
                run();
                input.focus();
            }
        };
    }

    window.LeagueSearch = { mount, searchFor, renderAnswer, examples };
})();
