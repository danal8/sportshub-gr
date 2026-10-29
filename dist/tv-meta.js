export const tvOnlyCompetitions=[{id:'el-w',name:'EuroLeague Γυναικών',sport:'basketball',tvOnly:true,url:'https://www.fiba.basketball/euroleaguewomen'},{id:'eurocup-w',name:'EuroCup Γυναικών',sport:'basketball',tvOnly:true,url:'https://www.fiba.basketball/eurocupwomen'}];
export function isExplicitLive(title,hasLiveBadge=false){return hasLiveBadge||/\([ΖZ]\)/.test(title);}
export function broadcastDetails(label){
 if(/Κ[ύυ]πελλ[οόυ]\s+Ελλ[άα]δ|Greek\s+Cup|Greece\s+Cup/i.test(label||''))return{sportLabel:'Ποδόσφαιρο',competition:'greek-cup',competitionLabel:label};
 const s=label||'',n=s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),women=/women|γυναικ|feminin/.test(n),men=/\bmen(?:s)?\b|ανδρ/.test(n);
 if(/euroleague|eurocup/.test(n)&&women){const ambiguous=men;return{sportLabel:'Μπάσκετ',competition:ambiguous?'other':/euroleague/.test(n)?'el-w':'eurocup-w',competitionLabel:s||null};}
 const sport=/EuroLeague|EuroCup|NBA|Basket|Μπάσκετ|FIBA Champions League/i.test(s)?'Μπάσκετ':/ATP|WTA|Τένις|Tennis/i.test(s)?'Τένις':/UEFA|Super\s*League|Premier League|Bundesliga|La\s*Liga|Ποδόσφαιρο|Ligue|Serie A/i.test(s)?'Ποδόσφαιρο':/Volley|Βόλεϊ|CEV/i.test(s)?'Βόλεϊ':/Snooker|Σνούκερ/i.test(s)?'Σνούκερ':null;
 const competition=/UEFA Youth League/i.test(s)?'youth':/FIBA Champions League|Basketball Champions League/i.test(s)?'bcl':/CEV Champions League/i.test(s)?'cev':/Champions League/i.test(s)?'cl':/Europa League/i.test(s)?'europa':/Conference League/i.test(s)?'conference':/EuroLeague/i.test(s)?'el':/EuroCup/i.test(s)?'eurocup':/Super\s*League\s*2/i.test(s)?'sl2':/Super\s*League/i.test(s)?'sl':/Premier League/i.test(s)?'pl':/2\.?\s*Bundesliga/i.test(s)?'bund2':/Bundesliga/i.test(s)?'bund':/La\s*Liga/i.test(s)?'laliga':/Serie A/i.test(s)?'seriea':/Ligue\s*1/i.test(s)?'ligue1':/NBA/i.test(s)?'nba':'other';
 return{sportLabel:sport,competition,competitionLabel:s||null};
}
