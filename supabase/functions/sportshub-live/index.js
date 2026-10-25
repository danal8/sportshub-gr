import{athensDay}from'./core.js';
import{FLASH_DEFAULT,flashURL,parseFlashscore,preferScoreSources}from'./flashscore.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
export function createLiveHandler({fetchImpl=fetch,now=Date.now}={}){
 let fixtures=[],fixturesAt=0,config=FLASH_DEFAULT;const cache=new Map(),pending=new Map();
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
 const upstream=async url=>{const r=await fetchImpl(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Schedule HTTP '+r.status);return r.json();};
 async function collect(date,sports){
  if(!fixtures.length||now()-fixturesAt>300000){const p=await upstream('https://raw.githubusercontent.com/danal8/sportshub-gr/main/docs/snapshots/daily-2026-27.json?t='+now());if(p.season!=='2026-27'||!Array.isArray(p.matches))throw Error('Invalid season fixtures');fixtures=p.matches;fixturesAt=now();try{const old=await upstream('https://raw.githubusercontent.com/danal8/sportshub-gr/gbl-live-data/live-scores.json?t='+now());if(old.flashscore){flashURL(old.flashscore,sports[0],date,athensDay(new Date(now())));config=old.flashscore;}}catch{}}
  const entries=[],errors=[],unmatched=[];await Promise.all(sports.map(async sport=>{try{const r=await fetchImpl(flashURL(config,sport,date,athensDay(new Date(now()))),{cache:'no-store',headers:{'x-fsign':config.sign},signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('Score source HTTP '+r.status);const p=parseFlashscore(await r.text(),fixtures,{sport,date,checkedAt:new Date(now()).toISOString(),cacheAge:r.headers.get('age')||0});entries.push(...p.entries);unmatched.push(...p.unmatched);}catch(e){errors.push({sport,error:e.message});}}));
  if(errors.length===sports.length)throw Error('Score sources unavailable');return{season:'2026-27',provider:'SportsHub live relay',checkedAt:new Date(now()).toISOString(),flashscore:config,entries:preferScoreSources(fixtures,entries),errors,unmatched};
 }
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='GET')return json({error:'Read-only score endpoint'},405);
  const u=new URL(req.url),date=u.searchParams.get('date')||athensDay(new Date(now())),sports=(u.searchParams.get('sports')||'1,3,12').split(',').map(Number);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!sports.length||sports.length>3||new Set(sports).size!==sports.length||sports.some(s=>![1,3,12].includes(s))||date<'2026-07-01'||date>='2027-07-01')return json({error:'Unsupported score selection'},400);
  try{flashURL(config,sports[0],date,athensDay(new Date(now())));}catch{return json({error:'Unsupported score date'},400);}
  const key=date+'|'+sports.sort((a,b)=>a-b).join(','),old=cache.get(key);if(old&&now()-old.at<15000)return json(old.payload);
  if(!pending.has(key))pending.set(key,collect(date,sports).then(payload=>{if(cache.size>32)cache.delete(cache.keys().next().value);cache.set(key,{at:now(),payload});return payload;}).finally(()=>pending.delete(key)));
  try{return json(await pending.get(key));}catch{return old?json({...old.payload,errors:[{error:'Upstream unavailable; retaining the original check time'}]}):json({error:'Verified score source unavailable'},503);}
 };
}
if(typeof Deno!=='undefined')Deno.serve(createLiveHandler());
