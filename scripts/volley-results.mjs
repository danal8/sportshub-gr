import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {athensDay,shiftDay} from '../dist/core.js';
const origin='https://www.volleyleague.gr';
export const resultsURL=origin+'/index.php/season/2026-27/regular-season-results-statistics';
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
const key=s=>clean(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const markers=['κηφισια','πανιωνιο','παναθηναικο','ολυμπιακο','παοκ','οφη','καλαματα','ρεθυμν','φλοισβο','φοινικα','μιλων','αρη'];
const club=s=>markers.find(x=>key(s).includes(x))||null;
const final=s=>Array.isArray(s)&&s.length===2&&s.every(Number.isInteger)&&Math.max(...s)===3&&Math.min(...s)>=0&&Math.min(...s)<=2;
const day=s=>{const m=s?.match(/(\d{2})[/-](\d{2})[/-](202[67])/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;};
export function parseVolleyTable(html,checkedAt=new Date().toISOString()){
 const body=html.split("id='full-program'")[1]?.split('</style>')[1];if(!body?.includes('2026'))throw Error('Missing current Volley League results');
 const entries=[];
 for(const row of body.split(/<div style="padding-bottom:0px;/).slice(1)){
  const date=day(clean(row)),teams=[...row.matchAll(/<a[^>]+href="\/index.php\/season\/2026-27\/teams\/[^"\s]*"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>clean(m[1]));
  const score=row.match(/class="team-class"[^>]*>\s*(\d)\s*[-:]\s*(\d)\s*</)?.slice(1).map(Number);
  if(date&&teams.length===2&&club(teams[0])&&club(teams[1])&&score&&final(score))entries.push({date,home:teams[0],away:teams[1],score,scoreState:'final',scoreCheckedAt:checkedAt,scoreSource:resultsURL,scoreProvider:'ESAP'});
 }return entries;
}
export function reportLinks(html){
 const links=new Map();
 for(const m of html.matchAll(/<a\b[^>]+href=(["'])([^"']*\/item\/(\d+)[^"']*)\1[^>]*>([\s\S]*?)<\/a>/g)){
  const url=new URL(m[2].replaceAll('&amp;','&'),origin);if(url.origin!==origin||/super|cup/i.test(url.pathname))continue;
  const old=links.get(m[3])||{eligible:false,url:url.href};
  const title=clean(m[4]);old.eligible ||= /[0-3]\s*[-–]\s*[0-3]/.test(title)&&/(νίκη|νικη|επικράτ|επικρατ|κέρδ|κερδ|πέρασ|περασ)/i.test(title);
  // The latest-news module exposes the canonical K2 route, while carousel aliases may fail.
  if(new RegExp('/item/'+m[3]+'/').test(url.pathname))old.url=url.href;
  links.set(m[3],old);
 }return [...links.values()].filter(x=>x.eligible).map(x=>x.url).slice(0,30);
}
// Dated official news remains available when the results table and article aliases lag.
export function parseVolleyHeadlines(html,checkedAt=new Date().toISOString()){
 const dates=new Map(),entries=[];
 for(const block of html.matchAll(/<div class=["']latest-news-content["']>([\s\S]*?)<\/div>/g)){
  const id=block[1].match(/\/item\/(\d+)/)?.[1],date=day(clean(block[1]));if(id&&date)dates.set(id,date);
 }
 const links=reportLinks(html),seen=new Set();
 for(const m of html.matchAll(/<a\b[^>]+href=(["'])([^"']*\/item\/(\d+)[^"']*)\1[^>]*>([\s\S]*?)<\/a>/g)){
  const date=dates.get(m[3]),url=links.find(u=>new RegExp('/item/'+m[3]+'(?:/|-)').test(u));
  if(!date||date<'2026-07-01'||date>='2027-07-01'||!url||seen.has(m[3]))continue;
  const title=clean(m[4]),result=title.match(/^(.*?)\s+(?:νίκησε|νικησε|κέρδισε|κερδισε)\s+(3)\s*[-–]\s*([0-2])\s+(?:τον|την|το)\s+(.+)$/i);
  if(!result)continue;
  const winners=markers.filter(x=>key(result[1]).includes(x)),losers=markers.filter(x=>key(result[4]).includes(x));
  if(winners.length!==1||losers.length!==1||winners[0]===losers[0])continue;
  entries.push({date,winner:winners[0],loser:losers[0],winnerScore:[+result[2],+result[3]],scoreSource:url,scoreCheckedAt:checkedAt});seen.add(m[3]);
 }return entries;
}
export function headlineResults(html,matches,checkedAt){
 return parseVolleyHeadlines(html,checkedAt).flatMap(x=>{
  const hits=matches.filter(m=>m.date===x.date&&((club(m.home)===x.winner&&club(m.away)===x.loser)||(club(m.away)===x.winner&&club(m.home)===x.loser)));
  if(hits.length!==1)return[];const m=hits[0];
  return [{...m,score:club(m.home)===x.winner?x.winnerScore:[...x.winnerScore].reverse(),scoreState:'final',scoreClock:null,scoreCheckedAt:x.scoreCheckedAt,scoreSource:x.scoreSource,scoreProvider:'ESAP dated news'}];
 });
}
export function parseVolleyReport(html,url,checkedAt=new Date().toISOString()){
 if(new URL(url).origin!==origin||/super|cup/i.test(new URL(url).pathname))return null;
 const date=day(clean(html.match(/class="itemDateCreated">([\s\S]*?)<\/span>/)?.[1]));
 const body=html.match(/class="itemFullText">([\s\S]*?)<\/div>/)?.[1];if(!date||!body)return null;
 const text=clean(body),m=text.match(/Τα σετ\s*:\s*([0-3])\s*[-–]\s*([0-3])\s*\(([^)]+)\)/i);if(!m)return null;
 const score=[+m[1],+m[2]],sets=[...m[3].matchAll(/(\d+)\s*[-–]\s*(\d+)/g)].map(x=>[+x[1],+x[2]]);
 if(!final(score)||sets.length!==score[0]+score[1])return null;
 const wins=[0,0];for(const [i,s]of sets.entries()){const target=i===4?15:25;if(Math.max(...s)<target||Math.abs(s[0]-s[1])<2||Math.max(...s)>target&&Math.abs(s[0]-s[1])!==2)return null;wins[s[0]>s[1]?0:1]++;if(Math.max(...wins)===3&&i!==sets.length-1)return null;}
 if(wins.some((n,i)=>n!==score[i]))return null;
 // Official reports put home and away lineup headings after the set totals.
 const tail=body.slice(body.indexOf(m[0].slice(0,6)));
 const lineups=[...tail.matchAll(/<strong[^>]*>\s*([^<]+?)\s*\([^<]+\)\s*:\s*<\/strong>/g)].map(x=>clean(x[1]));
 if(lineups.length<2||!club(lineups[0])||!club(lineups[1])||club(lineups[0])===club(lineups[1]))return null;
 const round=text.match(/(\d+)\s*η\s*αγωνιστικ/i)?.[1];if(!round)return null;
 return {date,round,home:lineups[0],away:lineups[1],score,sets,scoreState:'final',scoreCheckedAt:checkedAt,scoreSource:url,scoreProvider:'ESAP report'};
}
export function applyVolleyResults(matches,entries,today=athensDay()){
 return matches.map(m=>{
  if(!m.date||m.date>today||!club(m.home)||!club(m.away))return m;
  const hits=entries.filter(x=>(!x.round||String(x.round)===String(m.round))&&x.date>=m.date&&x.date<=(x.round?shiftDay(m.date,1):m.date)&&club(x.home)===club(m.home)&&club(x.away)===club(m.away)&&final(x.score));
  if(!hits.length||new Set(hits.map(x=>x.score.join('-'))).size!==1)return m;
  if(matches.filter(g=>g.date===m.date&&club(g.home)===club(m.home)&&club(g.away)===club(m.away)).length!==1)return m;
  return {...m,...Object.fromEntries(Object.entries(hits.at(-1)).filter(([k])=>!['date','round','home','away'].includes(k))),scoreClock:null};
 });
}
export async function collectVolleyResults(matches,{fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();},today=athensDay()}={}){
 const entries=[],errors=[],checkedAt=new Date().toISOString();
 try{entries.push(...parseVolleyTable(await fetchText(resultsURL),checkedAt));}catch(e){errors.push('results: '+e.message);}
 const pending=applyVolleyResults(matches,entries,today).filter(m=>m.date&&m.date<=today&&m.date>=shiftDay(today,-14)&&m.scoreState!=='final');
 if(pending.length){let links=[];for(const url of [origin+'/',origin+'/index.php',origin+'/index.php/news/all-news']){try{const html=await fetchText(url);entries.push(...headlineResults(html,matches,checkedAt));links=reportLinks(html);if(links.length)break;}catch(e){errors.push(url+': '+e.message);}}
  const unresolved=applyVolleyResults(pending,entries,today).filter(m=>m.scoreState!=='final');if(!unresolved.length)return {matches:applyVolleyResults(matches,entries,today),entries,errors,checkedAt};
  links=links.filter(url=>!entries.some(x=>x.scoreSource===url));let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<links.length){const url=links[cursor++];try{const x=parseVolleyReport(await fetchText(url),url,checkedAt);if(!x)errors.push(url+': no verified match report');if(x&&pending.some(m=>x.date>=m.date&&x.date<=shiftDay(m.date,1)&&club(x.home)===club(m.home)&&club(x.away)===club(m.away)))entries.push(x);}catch(e){errors.push(url+': '+e.message);}}}));
 }return {matches:applyVolleyResults(matches,entries,today),entries,errors,checkedAt};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=new URL('../dist/snapshots/volley-m-2026-27.json',import.meta.url),p=JSON.parse(await readFile(file)),r=await collectVolleyResults(p.matches);
 p.matches=r.matches;p.resultsCheckedAt=r.checkedAt;p.resultSources=[resultsURL];
 await writeFile(file,JSON.stringify(p));await writeFile(new URL('../dist/snapshots/volley-results-health.json',import.meta.url),JSON.stringify({checkedAt:r.checkedAt,results:r.entries.length,errors:r.errors}));console.log('VOLLEY RESULTS',r.entries.length,r.errors);
}
