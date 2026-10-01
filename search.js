// Shared football search - the search bar on index.html and, in search
// mode (?search=...), on DomesticEurope.html / ContinentalEurope.html and
// their Mobile versions. Reads a plain-English query for teams, a season and
// what the visitor is after, and links each result to the sport page's view
// through that page's own Copy Link parameters (?view=&lg=&t1=...).
// Exposes window.LeagueSearch = { mount(container, options), searchFor }.
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
    const CONTINENTAL_STAGE_PATTERNS = [
        ['Semi-Finals', /\b(semi ?finals?|semis)\b/],
        ['Quarter-Finals', /\b(quarter ?finals?|quarters)\b/],
        ['Round Of 16', /\b(round of 16|last 16)\b/],
        ['Group Stage', /\b(group stage|groups)\b/],
        ['Final', /\bfinals?\b/]
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
        'quarter quarters round group stage home away active current'
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

    function teamInCompetition(teamName, comp) {
        const team = SEARCH_TEAMS.get(teamName);
        if (!team) return false;
        return comp.continental ? team.continental : team.league === comp.key;
    }

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

    // "2003-04", "2003/04", "2003-2004", "03-04", or a single year,
    // which means the season that ended in it (2004 -> 2003-04).
    // Returns { startYear, text } or null.
    function extractSeason(text) {
        let m = text.match(/\b(1[89]\d{2}|20\d{2})\s*[-\/–]\s*(\d{4}|\d{2})\b/);
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

    // A scoreline like "5-0" or "3:3" -> { home, away }
    function extractScoreline(text) {
        const m = text.match(/(?:^|\s)(\d{1,2})\s*[-:]\s*(\d{1,2})(?=\s|$)/);
        return m ? { home: m[1], away: m[2], text: m[0] } : null;
    }

    function detectStreakType(text) {
        const match = STREAK_TYPE_PATTERNS.find(([, pattern]) => pattern.test(text));
        return match ? match[0] : '';
    }

    // Which finishing position a Team Seasons search is after:
    // { rank } for a domestic league, { stage } for the Champions
    // League, and better = "or better" (top 4, reached the semis)
    function detectFinish(text) {
        const finish = { rank: '', stage: '', better: /\b(top|reach|reached|at least|or better)\b/.test(text) };
        const top = text.match(/\btop (\d{1,2})\b/);
        const ordinal = text.match(/\b(\d{1,2})(st|nd|rd|th)\b/);
        if (/\b(titles?|champions|winners|won (the )?(league|title|cup|it))\b/.test(text)) {
            finish.rank = '1';
            finish.stage = 'Champions';
        } else if (top) {
            finish.rank = top[1];
            finish.better = true;
        } else if (ordinal) {
            finish.rank = ordinal[1];
        }
        if (!finish.stage) {
            const stage = CONTINENTAL_STAGE_PATTERNS.find(([, pattern]) => pattern.test(text));
            if (stage) finish.stage = stage[0];
        }
        if (Number(finish.rank) > 24) finish.rank = '';
        return finish;
    }

    // What the visitor is after, from the words left once teams,
    // competitions and the season are taken out
    function detectIntent(text, scoreline) {
        const has = pattern => pattern.test(text);
        const location = has(/\bhome\b/) ? 'home' : (has(/\baway\b/) ? 'away' : '');

        if (has(/\b(streaks?|runs?|in a row|consecutive|unbeaten|undefeated|winless)\b/)) {
            return {
                view: 'team-streaks',
                streakType: detectStreakType(text),
                historic: has(/\b(longest|historic|historical|history|records?|all time|ever|best|worst|biggest)\b/),
                location
            };
        }
        if (has(/\b(last time|when did|when was|last (win|won|beat|loss|lost|defeat|draw|drew|victory))\b/)) {
            return { view: 'last-time-when', location };
        }
        let category = null;
        if (scoreline) category = 'scoreline';
        else if (has(/\b(biggest|heaviest|largest) (wins?|victory|victories)\b/)) category = 'victories';
        else if (has(/\b(biggest|heaviest|worst|largest) (defeats?|loss|losses|thrashings?)\b/)) category = 'defeats';
        else if (has(/\b(highest scoring draws?|score draws?)\b/)) category = 'draws';
        else if (has(/\b(most goals|highest scoring|goal ?fests?)\b/)) category = 'totalGoals';
        else if (has(/\b((least|fewest) goals|lowest scoring)\b/)) category = 'leastGoals';
        else if (has(/\b(match finder|biggest)\b/)) category = 'victories';
        if (category) return { view: 'match-finder', category, location };

        if (has(/\b(seasons|finish|finished|finishes|finishing|positions?|placed|titles?|champions|winners|won (the )?(league|title|cup|it)|top \d{1,2}|finals?|semi ?finals?|semis|quarter ?finals?|quarters|round of 16|last 16|group stage|\d{1,2}(st|nd|rd|th))\b/)) {
            return { view: 'team-seasons', finish: detectFinish(text) };
        }
        if (has(/\b(tables?|standings?|classification|rankings?)\b/)) return { view: 'table' };
        if (has(/\b(vs|v|versus|against|h2h|head to head|head 2 head|meetings?)\b/)) return { view: 'h2h' };
        if (has(/\b(match|matches|games?|results?|fixtures|scores|history)\b/)) return { view: 'matches' };
        return { view: null, location };
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
            if (fragment.length < 2) continue;
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
        const season = extractSeason(text);
        if (season) text = text.replace(season.text, ' ');
        const scoreline = extractScoreline(text);
        if (scoreline) text = text.replace(scoreline.text, ' ');

        const words = normalizeSearchText(text).split(' ').filter(Boolean);
        const used = words.map(() => false);
        let mentions = findTeamMentions(words, used);

        // Competitions named in the query, on the words no team took
        const competitions = [];
        SEARCH_COMPETITIONS
            .flatMap(comp => comp.aliases.map(alias => [alias.split(' '), comp.key]))
            .sort((a, b) => b[0].length - a[0].length)
            .forEach(([aliasWords, key]) => {
                for (let i = 0; i + aliasWords.length <= words.length; i++) {
                    const span = words.slice(i, i + aliasWords.length);
                    if (span.join(' ') === aliasWords.join(' ') && !used.slice(i, i + aliasWords.length).some(Boolean)) {
                        for (let k = i; k < i + aliasWords.length; k++) used[k] = true;
                        if (!competitions.includes(key)) competitions.push(key);
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
        return {
            season: season ? season.startYear : null,
            scoreline,
            competitions,
            mentions: mentions.slice(0, 2),
            intent: detectIntent(rest, scoreline),
            isEmpty: words.length === 0 && !season && !scoreline
        };
    }

    // --- Building results ---

    function competitionUrl(comp, view, params) {
        const qs = new URLSearchParams({ view, lg: comp.key });
        Object.entries(params).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) qs.set(key, value);
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

    // Each result: { kind, icon, crestTeam?, title, detail, comp, href }
    function tableResult(comp, season, team) {
        const seasonText = season !== null ? seasonKey(season) : 'All seasons';
        return {
            kind: 'table', icon: '📊', comp,
            title: team ? `${team} · ${seasonText}` : `${comp.name} table · ${seasonText}`,
            detail: team ? 'League table with their match history' : 'Standings, head to head and match history',
            href: competitionUrl(comp, 'league-filters', { season: season !== null ? seasonKey(season) : '', t1: team })
        };
    }

    function headToHeadResult(comp, t1, t2, season) {
        return {
            kind: 'h2h', icon: '⚔️', comp,
            title: `${t1} vs ${t2}`,
            detail: joinDetail(['Head to head and match history', season !== null ? seasonKey(season) : 'All seasons']),
            href: competitionUrl(comp, 'league-filters', { season: season !== null ? seasonKey(season) : '', t1, t2 })
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

    function lastTimeResult(comp, t1, t2, intent) {
        return {
            kind: 'last-time', icon: '🔍', comp,
            title: t1 ? `Last time when... ${t2 ? `${t1} vs ${t2}` : t1}` : 'Last time when...',
            detail: joinDetail(['When each result last happened', locationLabel(intent.location)]),
            href: competitionUrl(comp, 'last-time-when', { t1, t2, loc: intent.location })
        };
    }

    function seasonsResult(comp, team, season, finish) {
        const pos = comp.continental ? finish.stage : finish.rank;
        let finishText = '';
        if (pos) {
            if (comp.continental) finishText = pos === 'Champions' ? 'Won the competition' : `Reached the ${pos}${finish.better ? ' or better' : ''}`;
            else finishText = finish.better && pos !== '1' ? `Finished top ${pos}` : (pos === '1' ? 'League titles' : `Finished ${pos}${ordinalSuffix(pos)}`);
        }
        return {
            kind: 'seasons', icon: '📈', comp,
            title: `${team || 'All teams'} · Season-by-season finishes`,
            detail: joinDetail([finishText, season !== null ? seasonKey(season) : '']),
            href: competitionUrl(comp, 'team-seasons', {
                league: comp.continental ? comp.key : '',
                t1: team,
                season: season !== null ? seasonKey(season) : '',
                pos,
                better: pos && finish.better && pos !== '1' && pos !== 'Champions' ? '1' : ''
            })
        };
    }

    function ordinalSuffix(n) {
        const num = Number(n);
        if (num % 100 >= 11 && num % 100 <= 13) return 'th';
        return { 1: 'st', 2: 'nd', 3: 'rd' }[num % 10] || 'th';
    }

    function matchFinderResult(comp, t1, t2, season, category, scoreline, location) {
        const params = {
            t1, t2,
            season: season !== null ? seasonKey(season) : '',
            cat: category === 'victories' ? '' : category,
            home: location === 'away' ? '0' : '',
            away: location === 'home' ? '0' : ''
        };
        if (category === 'scoreline') {
            Object.assign(params, { hsOp: 'exactly', hsVal: scoreline.home, asOp: 'exactly', asVal: scoreline.away });
        }
        const label = category === 'scoreline' ? `${scoreline.home}-${scoreline.away} matches` : MATCH_FINDER_LABELS[category];
        const who = t1 ? (t2 ? `${t1} vs ${t2}` : t1) : '';
        return {
            kind: 'match-finder', icon: '🎯', comp,
            title: who ? `${who} · ${label}` : label,
            detail: joinDetail([
                category === 'scoreline' ? 'Home score - away score' : 'Match Finder',
                season !== null ? seasonKey(season) : '',
                locationLabel(location)
            ]),
            href: competitionUrl(comp, 'match-finder', params)
        };
    }

    function dashboardResult(comp, team) {
        return {
            kind: 'dashboard', icon: '', crestTeam: team, comp,
            title: team,
            detail: 'Team Dashboard',
            href: dashboardUrl(comp, team)
        };
    }

    // Results for one competition and one set of teams (0-2):
    // { primary: [...], related: [...] }
    function competitionResults(comp, teams, parsed) {
        const [t1, t2] = teams;
        const { season, intent, scoreline } = parsed;
        const location = intent.location || '';
        const primary = [];
        const related = [];

        switch (intent.view) {
            case 'team-streaks':
                primary.push(streaksResult(comp, t1, t2, intent));
                break;
            case 'last-time-when':
                primary.push(lastTimeResult(comp, t1, t2, intent));
                break;
            case 'match-finder':
                primary.push(matchFinderResult(comp, t1, t2, season, intent.category, scoreline, location));
                break;
            case 'team-seasons': {
                // A league position ("top 4") means nothing in the
                // Champions League, and a stage ("semi finals") nothing
                // in a league - skip the competition that can't show it
                const { rank, stage } = intent.finish;
                if (comp.continental ? (rank && !stage) : (stage && !rank)) break;
                primary.push(seasonsResult(comp, t1, season, intent.finish));
                break;
            }
            case 'table':
                primary.push(tableResult(comp, season, t1 && !t2 ? t1 : ''));
                if (t1 && t2) primary.push(headToHeadResult(comp, t1, t2, season));
                break;
            case 'h2h':
            case 'matches':
                if (t1 && t2) primary.push(headToHeadResult(comp, t1, t2, season));
                else primary.push(tableResult(comp, season, t1));
                break;
            default:
                if (t1 && t2) {
                    primary.push(headToHeadResult(comp, t1, t2, season));
                    related.push(lastTimeResult(comp, t1, t2, { location }));
                    related.push(matchFinderResult(comp, t1, t2, season, 'victories', null, location));
                    related.push(streaksResult(comp, t1, t2, { streakType: 'winning', historic: true, location }));
                } else if (t1 && season !== null) {
                    primary.push(tableResult(comp, season, t1));
                    related.push(seasonsResult(comp, t1, season, { rank: '', stage: '', better: false }));
                } else if (t1) {
                    primary.push(dashboardResult(comp, t1));
                    related.push(seasonsResult(comp, t1, null, { rank: '', stage: '', better: false }));
                    related.push(streaksResult(comp, t1, null, { streakType: 'winning', historic: false, location }));
                    related.push(lastTimeResult(comp, t1, null, { location }));
                    related.push(matchFinderResult(comp, t1, null, null, 'victories', null, location));
                } else if (season !== null || parsed.competitions.includes(comp.key)) {
                    primary.push(tableResult(comp, season, ''));
                }
        }
        return { primary, related };
    }

    // Every pairing of the (up to two) mentioned teams, when a mention
    // can mean more than one team ("Manchester")
    function teamCombinations(mentions) {
        if (mentions.length === 0) return [[]];
        const [first, second] = mentions;
        const combos = [];
        first.teams.forEach(a => {
            if (!second) combos.push([a]);
            else second.teams.forEach(b => { if (a !== b) combos.push([a, b]); });
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
        teamCombinations(parsed.mentions).forEach(teams => {
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
            if (parsed.mentions.length > 0) {
                const names = parsed.mentions.map(m => m.teams[0]).join(' and ');
                const where = comps.map(comp => comp.name).join(' / ');
                return { results: [], message: `No results for ${names} in ${where}${parsed.mentions.length > 1 ? ' together' : ''}.` };
            }
            return { results: [], message: 'No results. Try a team, a season like 2003-04, or words like table, vs, streak, last time.' };
        }
        return { results, message: '' };
    }

    // --- Search bar ---

    // Result kinds whose page has a search mode: the page opens with its
    // controls hidden and just the answer showing (?search=<kind>). The
    // rest still open the full page.
    const SEARCH_MODE_KINDS = ['h2h'];

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

    window.LeagueSearch = { mount, searchFor };
})();
