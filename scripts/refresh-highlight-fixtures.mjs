// Highlights must not depend on when Pages last published a result snapshot.
import{readFile,writeFile}from'node:fs/promises';
import{liveLeagues,parseLiveScoreboard,applyLiveScores}from'../dist/live-scores.js';
import{reconcileFixtureDates}from'../dist/result-reconciliation.js';
import{athensDay,shiftDay}from'../dist/core.js';
const today=athensDay();
await Promise.all(Object.entries(liveLeagues).map(async([id,[sport,league]])=>{
 try{const file=new URL('../dist/snapshots/'+id+'-2026-27.json',import.meta.url),p=JSON.parse(await readFile(file));const results=await Promise.allSettled([today,shiftDay(today,-1)].map(async date=>{const r=await fetch('https://site.web.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?limit=1000&dates='+date.replaceAll('-',''),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return parseLiveScoreboard(await r.json(),id);}));
 const entries=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value),matches=p.matches.map(m=>({...m,competition:id}));p.matches=applyLiveScores(reconcileFixtureDates(matches,entries),entries);await writeFile(file,JSON.stringify(p));for(const r of results)if(r.status==='rejected')console.warn(id,r.reason.message);
 }catch(e){console.warn('Highlight fixture refresh',id,e.message);}
}));
