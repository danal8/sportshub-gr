import{aliases}from'./team-aliases.js';
import{shiftDay}from'./core.js';
// Clubs are linked only through explicit verified names, never substring/fuzzy matching.
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const clubs=[
 ['panionios','Πανιώνιος',['ΠΑΝΙΩΝΙΟΣ','Πανιώνιος Betsson','ΠΑΝΙΩΝΙΟΣ COSMORAMA TRAVEL']],
 ['olympiacos','Ολυμπιακός',['Ολυμπιακός','Olympiacos','Olympiacos Piraeus','Olympiakos Piraeus','Ολυμπιακός Σ.Φ.Π.','Ολυμπιακός Σ.Φ.Π. ΟΝΕΧ']],
 ['panathinaikos','Παναθηναϊκός',['Παναθηναϊκός','Panathinaikos','Panathinaikos AKTOR Athens','ΠΑΝΑΘΗΝΑΪΚΟΣ AKTOR','Παναθηναϊκός Α.Ο.']],
 ['paok','ΠΑΟΚ',['ΠΑΟΚ','Π.Α.Ο.Κ.','Π.Α.Ο.Κ. F&U','PAOK','PAOK Thessaloniki']],
 ['aek','ΑΕΚ',['ΑΕΚ','Α.Ε.Κ.','A.E.K.','AEK','AEK Athens','AEK Athen']],
 ['aris','Άρης',['Άρης','Α.Σ.Άρης','Α.Σ. Άρης','Aris','Aris Thessaloniki']],
 ['iraklis','Ηρακλής',['Ηρακλής','Iraklis','Iraklis 1908','Π.Ο.Τ. Ηρακλής']],
 ['ofi','ΟΦΗ',['ΟΦΗ','Ο.Φ.Η.','OFI','OFI Crete']],
 ['kifisia','Κηφισιά',['Κηφισιά','Kifisia','Α.Ο.Π. Κηφισιάς']],
 ['barcelona','Barcelona',['FC Barcelona','Barcelona','Μπαρτσελόνα']],
 ['real-madrid','Real Madrid',['Real Madrid','Ρεάλ Μαδρίτης']],
 ['bayern','Bayern München',['FC Bayern München','FC Bayern Munich','Bayern Munich','Bayern München','Μπάγερν Μονάχου']],
 ['fenerbahce','Fenerbahçe',['Fenerbahce','Fenerbahce Tarfin Istanbul','Fenerbahçe SK','Φενέρμπαχτσε']]
];
const byName=new Map(clubs.flatMap(([id,label,names])=>names.map(n=>[normalize(n),{id,label}])));
const aliasKey=new Map();
for(const names of Object.values(aliases)){const keys=[...new Set(names.map(normalize))].sort();for(const key of keys)if(!aliasKey.has(key))aliasKey.set(key,keys[0]);}
export function teamIdentity(team,competition,sport){
 const club=byName.get(normalize(team)),gender=competition==='volley-w'?'women':'men';
 return {club:club?.id||null,clubLabel:club?.label||team,unit:sport+':'+gender+':'+(club?.id||aliasKey.get(normalize(team))||normalize(team)),gender};
}
export function makeSelection(team,competition,sport,scope='unit'){
 if(typeof team!=='string'||!team.trim()||!['football','basketball','volleyball'].includes(sport)||typeof competition!=='string'||!competition)return null;
 const identity=teamIdentity(team,competition,sport);if(scope!=='unit'&&scope!=='club'||scope==='club'&&!identity.club)return null;
 return {key:scope+':'+(scope==='club'?identity.club:identity.unit),scope,team,competition,sport,...identity};
}
export function sanitizeSelections(value){
 if(!Array.isArray(value))return [];let out=[];
 for(const row of value.slice(0,100)){if(!row||typeof row!=='object')continue;const selection=makeSelection(row.team,row.competition,row.sport,row.scope);if(selection)out=addSelection(out,selection);}
 return out;
}
export function selectionForTeam(selections,team,competition,sport){
 const identity=teamIdentity(team,competition,sport);
 return selections.find(s=>s.scope==='club'&&s.club===identity.club&&identity.club)||selections.find(s=>s.scope==='unit'&&s.unit===identity.unit);
}
export function addSelection(selections,selection){
 if(!selection)return selections;
 return [...selections.filter(s=>s.key!==selection.key&&!(selection.scope==='club'&&selection.club&&s.club===selection.club)&&!(selection.scope==='unit'&&selection.club&&s.scope==='club'&&s.club===selection.club)),selection];
}
export function weekRange(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid day');
 const d=new Date(day+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)throw Error('Invalid day');
 const start=shiftDay(day,-((d.getUTCDay()+6)%7));return {start,end:shiftDay(start,6)};
}
export function weeklyMatches(matches,selections,day,sports){
 const {start,end}=weekRange(day),seen=new Set();
 return matches.filter(m=>{
  if(!m.date||m.date<start||m.date>end)return false;
  const sport=sports[m.competition];if(!sport)return false;
  if(!selectionForTeam(selections,m.home,m.competition,sport)&&!selectionForTeam(selections,m.away,m.competition,sport))return false;
  const key=[m.competition,m.date,m.time||'',normalize(m.home),normalize(m.away)].join('|');if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')||(a.competitionLabel||'').localeCompare(b.competitionLabel||'','el'));
}
export function selectedCompetitions(selections,competitions){
 if(!selections.length)return [];
 return competitions.filter(c=>selections.some(s=>s.scope==='club'||s.sport===c.sport&&(s.gender==='women'?c.id==='volley-w':c.id!=='volley-w')));
}
