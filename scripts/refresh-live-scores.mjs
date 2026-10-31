import{readFile,writeFile}from'node:fs/promises';import{pathToFileURL}from'node:url';import{execFileSync}from'node:child_process';
import{FLASH_DEFAULT,flashURL,parseFlashscore,LIVE_DATA}from'../dist/flashscore.js';
import{mergeResultUpdates}from'../dist/result-reconciliation.js';import{athensDay,shiftDay}from'../dist/core.js';
const root=new URL('../dist/snapshots/',import.meta.url);let config={...FLASH_DEFAULT};
export async function publicFlashConfig({fetchImpl=fetch}={}){
 const html=await(await fetchImpl('https://www.flashscore.gr/',{signal:AbortSignal.timeout(12000)})).text(),src=html.match(/src="(\/x\/js\/core_(\d{1,2})_\d+\.js)"/)?.slice(1);if(!src)throw Error('Flashscore public configuration unavailable');
 const js=await(await fetchImpl('https://www.flashscore.gr'+src[0],{signal:AbortSignal.timeout(12000)})).text(),sign=js.match(/var feed_sign\s*=\s*'([\w]+)'/)?.[1],origin=html.match(/href="(https:\/\/\d{1,2}\.flashscore\.ninja)"/)?.[1];const p={origin,project:src[1],sign};flashURL(p,1,athensDay());return p;
}
export function hasExpectedLiveGame(fixtures,now=new Date()){
 const today=athensDay(now),[hour,minute]=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);
 const localNow=Date.parse(today+'T00:00:00Z')+(hour*60+minute)*60000;
 return fixtures.some(m=>{
  if(m.scoreState==='final'||!m.date||!/^\d{2}:\d{2}$/.test(m.time||''))return false;
  const kickoff=Date.parse(m.date+'T'+m.time+':00Z'),elapsed=localNow-kickoff;
  return elapsed>=0&&elapsed<6*60*60000;
 });
}
export async function refreshLiveData({fetchImpl=fetch,now=new Date(),date=athensDay(now),snapshotRoot=root}={}){
 const root=snapshotRoot;
 const fixtures=[],snapshots=[];for(const id of ['sl','greek-cup','sl2','pl','bund','laliga','seriea','ligue1','cl','europa','conference','gbl','elite','el','eurocup','nba','volley-m','volley-w']){try{const file=new URL(id+'-2026-27.json',root),p=JSON.parse(await readFile(file));snapshots.push({id,file,p});fixtures.push(...p.matches.map(m=>({...m,competition:id})));}catch{}}
 let previous;try{previous=JSON.parse(await readFile(new URL('live-scores.json',root)));for(const m of fixtures){const old=previous.entries?.find(x=>x.id===m.id&&x.competition===m.competition&&x.date===m.date);if(old){m.eventIDs={...m.eventIDs,...old.eventIDs};m.homeIDs={...m.homeIDs,...old.homeIDs};m.awayIDs={...m.awayIDs,...old.awayIDs};}}}catch{}
 if(!snapshots.length)throw Error('No fixture snapshots available');
 const entries=[],unmatched=[],errors=[];
 const dates=[shiftDay(date,-1),date];
 // Keep checking yesterday too: an Athens-midnight rollover must not drop an ongoing match.
 await Promise.all(dates.flatMap(day=>[1,3,12].map(async sport=>{try{
  const r=await fetchImpl(flashURL(config,sport,day,athensDay(now)),{cache:'no-store',headers:{'x-fsign':config.sign},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('Flashscore HTTP '+r.status);
  const p=parseFlashscore(await r.text(),fixtures,{sport,date:day,checkedAt:now.toISOString(),cacheAge:r.headers?.get('age')||0});
  entries.push(...p.entries);unmatched.push(...p.unmatched);
 }catch(e){errors.push({sport,date:day,error:e.message});}})));
 if(errors.length)console.warn('Live source errors:',JSON.stringify(errors));
 if(unmatched.length)console.warn('Unmatched live games:',JSON.stringify(unmatched));
 if(!entries.length){
  if(errors.length||unmatched.length||hasExpectedLiveGame(fixtures,now))throw Error('No verified live source; retaining previous publication'+(errors.length?': '+errors.map(e=>e.date+'/'+e.sport+' '+e.error).join('; '):unmatched.length?': unmatched games':': active game window'));
  console.log('Live feeds checked successfully; no active games or new scores to publish');
  return null;
 }
 const merged=mergeResultUpdates(fixtures,entries,+now);for(const old of previous?.entries||[])if(old.scoreState==='final'&&!merged.some(m=>m.id===old.id&&m.competition===old.competition&&m.scoreState==='final'))merged.push(old);
 const payload={season:'2026-27',provider:'SportsHub live relay',checkedAt:now.toISOString(),flashscore:config,errors,unmatched,entries:merged.filter(m=>(m.date===date||m.date===shiftDay(date,-1))&&m.score&&['live','final'].includes(m.scoreState)&&m.scoreCheckedAt).map(({homeBadge,awayBadge,...m})=>m)};
 await writeFile(new URL('live-scores.json',root),JSON.stringify(payload));
 for(const {id,file,p}of snapshots){const results=entries.filter(m=>m.competition===id);if(results.length){p.matches=mergeResultUpdates(p.matches.map(m=>({...m,competition:id})),results);p.resultsCheckedAt=payload.checkedAt;await writeFile(file,JSON.stringify(p));}}
 console.log('Live relay',entries.length,'verified entries,',unmatched.length,'unmatched,',errors.length,'source errors');return payload;
}
async function publish(payload){const branch='gbl-live-data',endpoint=`repos/${process.env.GITHUB_REPOSITORY}/contents/live-scores.json`;for(let attempt=0;attempt<3;attempt++){
 let sha;try{sha=JSON.parse(execFileSync('gh',['api',endpoint+'?ref='+branch],{encoding:'utf8',stdio:['pipe','pipe','pipe']})).sha;}catch{}
 try{execFileSync('gh',['api','--method','PUT',endpoint,'--input','-'],{input:JSON.stringify({branch,message:'Update verified multi-sport live scores',content:Buffer.from(JSON.stringify(payload)).toString('base64'),...(sha?{sha}:{})}),stdio:['pipe','pipe','pipe']});return;}catch(e){if(attempt===2)throw Error('Live publication failed after retry');}
}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{config=await publicFlashConfig();}catch(e){console.warn(e.message);}
 try{const r=await fetch(LIVE_DATA+'?t='+Date.now(),{signal:AbortSignal.timeout(10000)});if(r.ok)await writeFile(new URL('live-scores.json',root),JSON.stringify(await r.json()));}catch{}
 const poll=process.argv.includes('--poll'),until=Date.now()+240000;let successes=0;
 do{const start=Date.now();try{const p=await refreshLiveData();if(poll&&p)await publish(p);successes++;if(!p)break;}catch(e){console.warn(e.message);if(!poll)process.exitCode=1;}if(!poll)break;await new Promise(r=>setTimeout(r,Math.max(1000,30000-(Date.now()-start))));}while(Date.now()<until);
 if(poll&&!successes)throw Error('No successful live refresh or idle check');
}
