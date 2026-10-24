import{readFile,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';
import{execFileSync}from'node:child_process';
import{collectVolleyResults}from'./volley-results.mjs';
import{loadWomenResults}from'../dist/volley-scores.js';
import{mergeResultUpdates}from'../dist/result-reconciliation.js';
import{athensDay,shiftDay}from'../dist/core.js';
const root=new URL('../dist/snapshots/',import.meta.url);
export async function refreshVolley({fetchText,fetchJSON:fetchOverride}={}){
 const today=athensDay(),checkedAt=new Date().toISOString(),errors=[],entries=[];
 const fetchJSON=fetchOverride|| (async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('EOPE HTTP '+r.status);return r.json();});
 await Promise.all(['volley-m','volley-w'].map(async id=>{
  const file=new URL(id+'-2026-27.json',root),p=JSON.parse(await readFile(file)),matches=p.matches.map(m=>({...m,competition:id}));
  if(id==='volley-m'){
   const r=await collectVolleyResults(matches,{...(fetchText?{fetchText}:{})});p.matches=r.matches;errors.push(...r.errors.map(error=>({competition:id,error})));
  }else{
   const dates=[...new Set(matches.filter(m=>m.date&&m.date<=today&&m.date>=shiftDay(today,-14)&&m.scoreState!=='final').map(m=>m.date))];let updates=[];
   for(const date of dates){const r=await loadWomenResults(matches,date,{fetchJSON,checkedAt});updates.push(...r.entries);errors.push(...r.errors.map(error=>({competition:id,error})));}
   p.matches=mergeResultUpdates(matches,updates);
  }
  p.resultsCheckedAt=checkedAt;await writeFile(file,JSON.stringify(p));entries.push(...p.matches.filter(m=>m.scoreState==='final'&&m.score).map(m=>({...m,competition:id,scoreCheckedAt:m.scoreCheckedAt||p.retrievedAt||checkedAt})));
 }));
 const payload={season:'2026-27',provider:'ESAP / EOPE',checkedAt,entries};await writeFile(new URL('volley-results.json',root),JSON.stringify(payload));await writeFile(new URL('volley-results-health.json',root),JSON.stringify({checkedAt,results:entries.length,errors}));
 console.log('Volleyball finals',entries.length,'errors',errors.length);return payload;
}
async function publish(payload){
 const endpoint=`repos/${process.env.GITHUB_REPOSITORY}/contents/volley-results.json`,branch='gbl-live-data';
 let sha;try{sha=JSON.parse(execFileSync('gh',['api',endpoint+'?ref='+branch],{encoding:'utf8',stdio:['pipe','pipe','pipe']})).sha;}catch{}
 execFileSync('gh',['api','--method','PUT',endpoint,'--input','-'],{input:JSON.stringify({branch,message:'Update verified volleyball results',content:Buffer.from(JSON.stringify(payload)).toString('base64'),...(sha?{sha}:{})}),stdio:['pipe','pipe','pipe']});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const p=await refreshVolley();if(process.argv.includes('--publish'))await publish(p);}
