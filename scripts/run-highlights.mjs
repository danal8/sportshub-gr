import{readFile,writeFile}from'node:fs/promises';import{execFileSync}from'node:child_process';
import{retainHighlightIndex,highlightsHealth}from'./highlight-health.mjs';
const file='dist/snapshots/highlights-2026-27.json',branch='gbl-live-data',name='highlights-2026-27.json';
console.log('Starting independent highlights collection');
let previous=JSON.parse(await readFile(file));
try{const r=await fetch('https://raw.githubusercontent.com/danal8/sportshub-gr/'+branch+'/'+name+'?t='+Date.now(),{signal:AbortSignal.timeout(12000),cache:'no-store'});if(r.ok){const remote=await r.json();if(remote.season==='2026-27'&&Array.isArray(remote.videos)){previous=retainHighlightIndex(previous,remote);await writeFile(file,JSON.stringify(previous));}}}catch(e){console.warn('Previous remote highlights unavailable; retaining bundled index:',e.message);}
// The collector owns source verification. Each run reuses the last published index.
await import('./refresh-highlights.mjs');
const index=retainHighlightIndex(previous,JSON.parse(await readFile(file))),matches=[];
for(const id of ['sl','sl2','pl','bund','laliga','seriea','ligue1','cl','europa','conference','el','eurocup','gbl','elite','volley-m','volley-w','nba'])try{const p=JSON.parse(await readFile('dist/snapshots/'+id+'-2026-27.json'));matches.push(...p.matches.map(m=>({...m,competition:id})));}catch(e){index.errors.push(id+': '+e.message);}
const health=highlightsHealth(matches,index);await writeFile(file,JSON.stringify(index,null,2)+'\n');await writeFile('dist/snapshots/highlights-health.json',JSON.stringify(health,null,2)+'\n');
console.log('HIGHLIGHTS HEALTH',JSON.stringify({status:health.status,sourceErrors:health.sourceErrors.length,unmatched:health.unmatchedVideos.length,awaiting:health.awaitingVideo.length}));
if(health.unmatchedVideos.length)console.log('::warning::Published highlight videos need match reconciliation; see highlights-health.json');
if(process.argv.includes('--publish'))for(const [path,payload]of [[name,index],['highlights-health.json',health]]){
 const endpoint=`repos/${process.env.GITHUB_REPOSITORY}/contents/${path}`;
 let published=false;for(let attempt=0;attempt<3;attempt++){
  let sha;try{sha=JSON.parse(execFileSync('gh',['api',endpoint+'?ref='+branch],{encoding:'utf8',stdio:['pipe','pipe','pipe']})).sha;}catch{}
  try{execFileSync('gh',['api','--method','PUT',endpoint,'--input','-'],{input:JSON.stringify({branch,message:'Refresh verified highlights and coverage',content:Buffer.from(JSON.stringify(payload)).toString('base64'),...(sha?{sha}:{})}),stdio:['pipe','pipe','pipe']});published=true;break;}catch(e){if(attempt===2)throw Error('Highlights publication failed after retry: '+path);}
 }
 if(!published)throw Error('Highlights publication was not completed: '+path);
}
