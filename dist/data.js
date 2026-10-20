// Small, dated factual extracts. No automated scraping of closed feeds.
export const checkedAt='2026-10-20T13:28:31+03:00';
export const eliteSchedule='https://www.eliteleague.gr/elite-league-to-analytiko-programma-tis-sezon-2026-2027/';
export const eliteTV='https://www.eliteleague.gr/elite-league-to-tileoptiko-programma-ton-proton-trion-agonistikon/';
export const competitions=[
 {id:'sl',name:'Super League',sport:'football',url:'https://www.slgr.gr/',ranking:'https://www.slgr.gr/el/scoreboard/',note:'Πρόγραμμα κανονικής περιόδου openfootball / CC0. Δημοσιευμένη κατάταξη από Wikipedia / CC BY-SA, με ξεχωριστή αναφορά πηγής.'},
 {id:'elite',name:'Elite League · Α2 Ανδρών',sport:'basketball',url:'https://www.eliteleague.gr/',ranking:'https://www.eliteleague.gr/standings/',note:'Αυτόματη ανάκτηση επίσημου προγράμματος και κατάταξης ΕΟΚ. 30 αγωνιστικές, με πηγή και χρόνο ελέγχου. Χωρίς live scores.'},
 {id:'gbl',name:'Greek Basket League',sport:'basketball',url:'https://www.esake.gr/',ranking:'https://www.esake.gr/el/action/EsakeRanking',note:'Αυτόματη ανάκτηση επίσημου προγράμματος και κατάταξης ΕΣΑΚΕ. 26 αγωνιστικές. Δεν επινοούνται μη ορισμένες ημερομηνίες, ώρες ή κανάλια.'},
 {id:'el',name:'EuroLeague',sport:'basketball',url:'https://www.euroleaguebasketball.net/euroleague/games/',ranking:'https://www.euroleaguebasketball.net/euroleague/standings/',note:'Αυτόματη ανάκτηση επίσημου προγράμματος και κατάταξης Euroleague Basketball. 380 αγώνες κανονικής περιόδου. Χωρίς live scores ή play-by-play.'},
 {id:'eurocup',name:'EuroCup',sport:'basketball',url:'https://www.euroleaguebasketball.net/eurocup/',note:'Αυτόματη ανάκτηση επίσημου προγράμματος και κατάταξης Euroleague Basketball. Οι κατατάξεις διατηρούν τους ομίλους της πηγής.'},
 {id:'pl',name:'Premier League',sport:'football',file:'en.1',url:'https://www.premierleague.com/',zone:'Europe/London'},
 {id:'laliga',name:'La Liga',sport:'football',file:'es.1',url:'https://www.laliga.com/',zone:'Europe/Madrid'},
 {id:'bund',name:'Bundesliga',sport:'football',file:'de.1',url:'https://www.bundesliga.com/',zone:'Europe/Berlin'},
 {id:'cl',name:'UEFA Champions League',sport:'football',url:'https://www.uefa.com/uefachampionsleague/',note:'Αυτόματη ανάκτηση προγράμματος και δημοσιευμένης κατάταξης της φάσης πρωταθλήματος από Wikipedia / CC BY-SA. Κοινοτική πηγή, όχι επίσημη UEFA.'},
 {id:'europa',name:'UEFA Europa League',sport:'football',url:'https://www.uefa.com/uefaeuropaleague/',note:'Αυτόματη ανάκτηση προγράμματος και δημοσιευμένης κατάταξης της φάσης πρωταθλήματος από Wikipedia / CC BY-SA. Κοινοτική πηγή, όχι επίσημη UEFA.'},
 {id:'conference',name:'UEFA Conference League',sport:'football',url:'https://www.uefa.com/uefaconferenceleague/',note:'Αυτόματη ανάκτηση προγράμματος και δημοσιευμένης κατάταξης της φάσης πρωταθλήματος από Wikipedia / CC BY-SA. Κοινοτική πηγή, όχι επίσημη UEFA.'}
];
// Personal-use data files are deliberately excluded from the public repository.
export const eliteMatches=[],broadcasts=[],currentTV=[],gblStandings=[];
