import{preserveConfirmedResults,mergeResultUpdates,sameResultMatch}from'./result-reconciliation.js?v=50';
import{loadEuropeanLeague}from'./football-leagues.js?v=50';
import{loadNBA}from'./nba.js?v=50';
import{safeResults}from'./results.js?v=50';
import{rememberBadges,loadBadgeCatalog}from'./badges.js?v=50';
import{directIDs,directProvider}from'./direct.js?v=50';
const staticIDs=['sl2','elite','gbl','volley-m','volley-w','conference'];
export function isConnected(id){return ['seriea','ligue1'].includes(id)||id==='nba'||staticIDs.includes(id)||directIDs.includes(id);}
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function save(key,payload){try{localStorage.setItem(key,JSON.stringify(payload));}catch{}}
const inflight=new Map();
export function loadProvider(id,season,options={}){const key=id+season;if(inflight.has(key))return inflight.get(key);const task=fetchProvider(id,season,options).then(async p=>{void loadBadgeCatalog();rememberBadges(p,id);const finals=read('sh-confirmed-results-2026-27')||[];return safeResults({...p,matches:mergeResultUpdates(p.matches.map(m=>({...m,competition:id})),Array.isArray(finals)?finals:[])});}).finally(()=>inflight.delete(key));inflight.set(key,task);return task;}
async function fetchProvider(id,season,{force=false}={}){
 if(season!=='2026-27'||!isConnected(id))throw Error('Μη διαθέσιμη σεζόν ή διοργάνωση');
 const key=(staticIDs.includes(id)?'sh-static-':'sh-provider-v5-')+id+'-'+season,cached=read(key);let failure;
 if(force&&(['seriea','ligue1'].includes(id)||id==='nba'||directIDs.includes(id)&&id!=='volley-m')){try{let p=['seriea','ligue1'].includes(id)?await loadEuropeanLeague(id):id==='nba'?await loadNBA({matches:cached?.matches}):await directProvider(id,season);p=preserveConfirmedResults({...p,season},cached,id);save(key,p);return p;}catch(e){failure=e;}}
 try{const r=await fetch('./snapshots/'+id+'-'+season+'.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Δεν ανακτήθηκε το πρόγραμμα');const p=await r.json();if(p.season!==season||!(p.matches?.length||id==='nba'&&p.standings?.length))throw Error('Μη έγκυρο πρόγραμμα');const merged=preserveConfirmedResults(p,cached,id);save(key,merged);return{...merged,snapshot:true,...(failure?{fallback:failure.message}:{})};}
 catch(error){if(cached?.season===season&&(cached.matches?.length||id==='nba'&&cached.standings?.length))return{...cached,fallback:error.message};
  if(!force&&(['seriea','ligue1'].includes(id)||id==='nba'||directIDs.includes(id)&&id!=='volley-m')){let p=['seriea','ligue1'].includes(id)?await loadEuropeanLeague(id):id==='nba'?await loadNBA({matches:cached?.matches}):await directProvider(id,season);p=preserveConfirmedResults({...p,season},cached,id);save(key,p);return p;}throw error;}
}

export function rememberConfirmedResults(entries){
 const key='sh-confirmed-results-2026-27',saved=read(key),old=Array.isArray(saved)?saved:[],incoming=entries.filter(m=>m.scoreState==='final'&&Array.isArray(m.score)&&m.score.length===2&&m.score.every(n=>Number.isInteger(n)&&n>=0)&&isConnected(m.competition)&&m.date>='2026-07-01'&&m.date<'2027-07-01');
 const updated=mergeResultUpdates(old,incoming);for(const x of incoming)if(!updated.some(m=>sameResultMatch(m,x)))updated.push(x);save(key,updated.slice(-10000));
}
