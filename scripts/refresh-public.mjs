import{updatePayloadSections,sectionStatus}from'../dist/source-status.js';
import{standingsCoverage}from'../dist/standings-health.js';
import{preserveConfirmedResults}from'../dist/result-reconciliation.js';
import{loadEuropeanLeague}from'../dist/football-leagues.js';
// Runs in Actions, never in a private backend. Publish normalized match facts only.
import{readFile,writeFile}from'node:fs/promises';
import{directProvider}from'../dist/direct.js';
import{loadNBA}from'../dist/nba.js';
import{parseNova,novaURL}from'../dist/tv.js';
import{parseMen}from'./refresh-pages.mjs';
const root=new URL('../dist/snapshots/',import.meta.url);
export async function refreshPublic(){
 const reports=[];
 try{const source='https://www.volleyleague.gr/index.php/season/2026-27/volley-league-2026-27',r=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('ESAP '+r.status);const matches=parseMen(await r.text()),old=JSON.parse(await readFile(new URL('volley-m-2026-27.json',root)));for(const m of matches){const previous=old.matches.find(g=>g.home===m.home&&g.away===m.away&&g.round===m.round);m.homeBadge=previous?.homeBadge;m.awayBadge=previous?.awayBadge;}await writeFile(new URL('volley-m-2026-27.json',root),JSON.stringify(updatePayloadSections(preserveConfirmedResults({...old,matches,retrievedAt:new Date().toISOString()},old,'volley-m'),old)));reports.push({id:'volley-m',ok:true,matches:matches.length});}catch(e){reports.push({id:'volley-m',ok:false,error:e.message});}
 await Promise.all(['sl','pl','bund','laliga','cl','europa','el','eurocup','volley-w','nba','seriea','ligue1'].map(async id=>{try{
  let old;try{old=JSON.parse(await readFile(new URL(id+'-2026-27.json',root)));}catch{}const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const p=['seriea','ligue1'].includes(id)?await loadEuropeanLeague(id):id==='nba'?await loadNBA({matches:old?.matches,full:old?.scheduleCheckedAt!==today}):await directProvider(id,'2026-27');if(id==='nba'&&!p.scheduleCheckedAt)p.scheduleCheckedAt=old?.scheduleCheckedAt;
  if(id==='volley-w'&&(p.matches.length!==132||new Set(p.matches.map(m=>m.round)).size!==22))throw Error('Ελλιπές πρόγραμμα γυναικών');
  let merged=updatePayloadSections(preserveConfirmedResults({...p,season:'2026-27'},old,id),old);if(merged.standingsSource&&merged.standings?.length){const coverage=standingsCoverage(merged.matches,merged.standings,{today});merged.sections.standings={...merged.sections.standings,coverage,status:merged.sections.standings.error?'failed':coverage.stale?'stale':'ok'};}await writeFile(new URL(id+'-2026-27.json',root),JSON.stringify(merged));reports.push({id,ok:true,matches:p.matches.length});
 }catch(e){try{const file=new URL(id+'-2026-27.json',root),saved=JSON.parse(await readFile(file));saved.sections={...saved.sections,matches:sectionStatus(saved.sections?.matches,{data:saved.matches,source:saved.source,error:e.message}),...(saved.standingsSource?{standings:sectionStatus(saved.sections?.standings,{data:saved.standings,source:saved.standingsSource,error:e.message})}:{})};await writeFile(file,JSON.stringify(saved));}catch{}reports.push({id,ok:false,error:e.message});}}));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await Promise.all(Array.from({length:9},(_,i)=>i-1).map(async offset=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);const date=d.toISOString().slice(0,10);let previous;try{previous=JSON.parse(await readFile(new URL('tv-'+date+'.json',root)));}catch{}try{
  const r=await fetch(novaURL(date),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Nova '+r.status);
  const p=parseNova(await r.text(),date);p.sections={broadcasts:sectionStatus(previous?.sections?.broadcasts,{data:p.matches,previousData:previous?.matches,source:p.source})};await writeFile(new URL('tv-'+date+'.json',root),JSON.stringify(p));reports.push({id:'tv-'+date,ok:true,matches:p.matches.length});
 }catch(e){if(previous){previous.sections={...previous.sections,broadcasts:sectionStatus(previous.sections?.broadcasts,{data:previous.matches,source:previous.source,error:e.message})};await writeFile(new URL('tv-'+date+'.json',root),JSON.stringify(previous));}reports.push({id:'tv-'+date,ok:false,error:e.message,retained:!!previous,lastSuccessAt:previous?.sections?.broadcasts?.lastSuccessAt||null});}}));
 await writeFile(new URL('source-health.json',root),JSON.stringify({checkedAt:new Date().toISOString(),reports}));
 console.log(reports);
}
await refreshPublic();
