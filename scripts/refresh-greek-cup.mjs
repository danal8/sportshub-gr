import{readFile,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';
import{sectionStatus}from'../dist/source-status.js';
export const cupNewsURL='https://www.epo.gr/el/news';
export const cupSeedURL='https://www.epo.gr/el/arthra/league-phase-superbet-kypelloy-elladas-i-ora-tis-4is-agonistikis';
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/novibet|elabet|aktor/g,'').replace(/[^\p{L}\p{N}]/gu,'');
const months=['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου','Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];
const inSeason=d=>d>='2026-07-01'&&d<'2027-07-01';
export function cupArticleURLs(html){return[...new Set([...html.matchAll(/href="(\/el\/arthra\/[^"?#]+)"/g)].map(m=>m[1]).filter(s=>/kypell|\d+-\d+$/.test(s)).map(s=>'https://www.epo.gr'+s))];}
export function parseCupSchedule(html,source){
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 if(!/Κυπέλλ|Κύπελλ/i.test(title))return[];
 const round=title.match(/(\d+)(?:ης|η|is)/)?.[1]||'',matches=[];
 const blocks=[...html.matchAll(/<(h[2-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)];let date=null;
 for(const block of blocks){const s=clean(block[2]);if(block[1].toLowerCase()!=='li'){
   const d=s.match(/(\d{1,2})\s+(\S+)\s+(20\d{2})/),month=d&&months.findIndex(m=>key(m)===key(d[2]));
   date=d&&month>=0?d[3]+'-'+String(month+1).padStart(2,'0')+'-'+d[1].padStart(2,'0'):null;continue;
  }
  if(!date||!inSeason(date))continue;
  const m=s.match(/^(\d{2}:\d{2}),\s*(.+?):\s*(.+?)\s+[–—-]\s+(.+?)\s*\(([^()]+)\)\s*$/);
  if(!m||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m[1])||!/ΣΚΑΪ|ΣΠΟΡ\s*FM\s*TV|COSMOTE|ΕΡΤ|Novasports/i.test(m[5]))continue;
  const home=m[3],away=m[4];matches.push({id:'greek-cup-'+(round||date)+'-'+key(home)+'-'+key(away),home,away,date,time:m[1],round:round?'League Phase · '+round:'',venue:m[2],channel:m[5],source,score:null,scoreState:null});
 }
 return matches;
}
export function parseCupResult(html,source){
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||''),m=title.match(/^(.+?)\s+[–—-]\s+(.+?)\s+(\d+)\s*-\s*(\d+)$/),d=html.match(/class="[^"]*epo-cta[^\"]*"[^>]*>\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(20\d{2})/);
 const body=[...html.matchAll(/field--name-(?:field-paragraph-text|field-intro)[^>]*>([\s\S]*?)<\/div>/g)].map(m=>m[1]).join(' ');
 if(!m||!d||!/Κυπέλλ|Κύπελλ/.test(clean(body)))return null;
 const date=d[3]+'-'+d[2].padStart(2,'0')+'-'+d[1].padStart(2,'0');
 return inSeason(date)?{home:m[1],away:m[2],date,score:[+m[3],+m[4]],source}:null;
}
export async function refreshGreekCup({previous={},fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('EPO HTTP '+r.status);return r.text();},now=new Date().toISOString()}={}){
 const errors=[],urls=new Set([cupSeedURL,...previous.articleURLs||[]]);
 try{for(const url of cupArticleURLs(await fetchText(cupNewsURL)))urls.add(url);}catch(e){errors.push(e.message);}
 const matches=new Map((previous.matches||[]).map(m=>[m.id,{...m}])),results=[];let schedules=0;
 const list=[...urls];let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<list.length){const url=list[cursor++];try{const html=await fetchText(url),rows=parseCupSchedule(html,url);if(rows.length){schedules++;for(const m of rows){const old=matches.get(m.id);matches.set(m.id,{...old,...m,score:old?.score||null,scoreState:old?.scoreState||null});}}const result=parseCupResult(html,url);if(result)results.push(result);}catch(e){errors.push(url+': '+e.message);}}}));
 for(const r of results){const hits=[...matches.values()].filter(m=>m.date===r.date&&key(m.home)===key(r.home)&&key(m.away)===key(r.away));if(hits.length===1)Object.assign(hits[0],{score:r.score,scoreState:'final',scoreSource:r.source,scoreProvider:'ΕΠΟ',scoreCheckedAt:now});}
 const data=[...matches.values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),error=errors.length?errors.join('; '):!schedules?'Δεν βρέθηκε επαληθευμένο πρόγραμμα Κυπέλλου 2026–27':null;
 if(!data.length)throw Error(error||'Κενό πρόγραμμα Κυπέλλου');
 return{...previous,season:'2026-27',source:cupNewsURL,retrievedAt:schedules?now:previous.retrievedAt,partial:true,notice:'Δημοσιευμένοι ορισμοί ΕΠΟ · μερική κάλυψη της σεζόν.',copyright:'ΕΠΟ · Δημοσιευμένοι ορισμοί και μεταδόσεις Κυπέλλου Ελλάδας',matches:data,articleURLs:[...urls],sections:{...previous.sections,matches:sectionStatus(previous.sections?.matches,{data,previousData:previous.matches,source:cupNewsURL,now,error})}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const file=new URL('../dist/snapshots/greek-cup-2026-27.json',import.meta.url);let previous;try{previous=JSON.parse(await readFile(file,'utf8'));}catch{}const p=await refreshGreekCup({previous});await writeFile(file,JSON.stringify(p));console.log('Greek Cup:',p.matches.length,'fixtures,',p.matches.filter(m=>m.scoreState==='final').length,'confirmed finals;',p.sections.matches.status);}
