import{preserveConfirmedResults}from'../dist/result-reconciliation.js';
import {readFile,writeFile} from 'node:fs/promises';
import {normalizeSportsDB}from'../dist/feeds.js';
import {loadSL2} from '../worker/sl2.mjs';
import {parseEliteSchedule} from '../dist/feeds.js';
import {parseGBLRound} from '../worker/runtime.mjs';
const root=new URL('../dist/snapshots/',import.meta.url),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const text=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();};
let updated=0;
for(const id of ['sl2','elite','gbl','conference']){try{
 const file=new URL(id+'-2026-27.json',root),old=JSON.parse(await readFile(file));let next;
 if(id==='conference'){const url='https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=5071&s=2026-2027',raw=JSON.parse(await text(url));const incoming=normalizeSportsDB(raw,'5071','2026-27'),games=new Map(old.matches.map(m=>[m.id,m]));for(const m of incoming)games.set(m.id,m);next={...old,matches:[...games.values()]};}
 if(id==='sl2')next={...await loadSL2()};
 if(id==='elite')next={...old,matches:parseEliteSchedule(await text('https://www.eliteleague.gr/schedule/'))};
 if(id==='gbl'){
  const rounds=[...new Set(old.matches.filter(m=>m.date&&m.date<=today&&m.scoreState!=='final').map(m=>m.round))];
  const games=new Map(old.matches.map(m=>[m.id,m]));
  for(const round of rounds)for(const m of parseGBLRound(await text(`https://www.esake.gr/el/action/EsakeResults?idchampionship=184645B9&idteam=&idseason=00000001&series=${String(round).padStart(2,'0')}`),Number(round)))games.set(m.id,m);
  next={...old,matches:[...games.values()]};
 }
 await writeFile(file,JSON.stringify(preserveConfirmedResults({...next,retrievedAt:new Date().toISOString()},old,id)));updated++;console.log(id,next.matches.filter(m=>m.score).length,'results');
 }catch(e){console.warn(id,e.message);}}
if(!updated)throw Error('No result source was available');
