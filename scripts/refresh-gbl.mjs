import{readFile,writeFile}from'node:fs/promises';import{pathToFileURL}from'node:url';import{execFileSync}from'node:child_process';
import{GBL_WIDGET,parseGblWidget}from'../dist/gbl-scores.js';import{mergeResultUpdates}from'../dist/result-reconciliation.js';import{athensDay}from'../dist/core.js';
export async function refreshGbl({fetchText=async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('ESAKE live '+r.status);return r.text();}}={}){
 const file=new URL('../dist/snapshots/gbl-2026-27.json',import.meta.url),p=JSON.parse(await readFile(file)),matches=p.matches.map(m=>({...m,competition:'gbl'})),today=athensDay();
 const {entries,unmatched}=parseGblWidget(await fetchText(GBL_WIDGET),matches,{today});
 if(unmatched.length)throw Error('Unmatched ESAKE games: '+JSON.stringify(unmatched));
 if(!entries.length)throw Error('No confirmed ESAKE live results');
 p.matches=mergeResultUpdates(matches,entries);p.resultsCheckedAt=new Date().toISOString();await writeFile(file,JSON.stringify(p));
 const payload={season:'2026-27',provider:'ΕΣΑΚΕ / Genius Sports',checkedAt:p.resultsCheckedAt,entries:entries.map(({homeBadge,awayBadge,...m})=>m)};await writeFile(new URL('../dist/snapshots/gbl-live.json',import.meta.url),JSON.stringify(payload));console.log('GBL',entries.map(m=>({id:m.id,home:m.home,away:m.away,score:m.score,state:m.scoreState,clock:m.clock})));
 return payload;
}
async function publish(payload){
 const repo=process.env.GITHUB_REPOSITORY,branch='gbl-live-data',endpoint=`repos/${repo}/contents/gbl-live.json`;
 let sha;try{sha=JSON.parse(execFileSync('gh',['api',endpoint+'?ref='+branch],{encoding:'utf8'})).sha;}catch{}
 const body={branch,message:'Update verified ESAKE live scores',content:Buffer.from(JSON.stringify(payload)).toString('base64'),...(sha?{sha}:{})};
 execFileSync('gh',['api','--method','PUT',endpoint,'--input','-'],{input:JSON.stringify(body),stdio:['pipe','pipe','pipe']});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const poll=process.argv.includes('--poll'),until=Date.now()+6*60000;let successes=0;
 do{const started=Date.now();try{const p=await refreshGbl();if(poll)await publish(p);successes++;}catch(e){console.error(e.message);if(!poll)process.exitCode=1;}
 if(!poll)break;
 const p=JSON.parse(await readFile(new URL('../dist/snapshots/gbl-2026-27.json',import.meta.url))),today=athensDay();
 const [hour,minute]=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number),localMinutes=hour*60+minute;
 const active=p.matches.some(m=>m.date===today&&m.scoreState!=='final'&&m.time&&localMinutes>=Number(m.time.slice(0,2))*60+Number(m.time.slice(3))-15&&localMinutes<Number(m.time.slice(0,2))*60+Number(m.time.slice(3))+240);
 if(!active)break;await new Promise(r=>setTimeout(r,Math.max(1000,30000-(Date.now()-started))));
 }while(Date.now()<until);
 if(poll&&!successes)throw Error('GBL live publication failed: no verified update was published');
}
