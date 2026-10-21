import{loadNBA}from'./nba.js?v=18';
import{safeResults}from'./results.js?v=18';
import{rememberBadges,loadBadgeCatalog}from'./badges.js?v=18';
import{directIDs,directProvider}from'./direct.js?v=18';
const staticIDs=['sl2','elite','gbl','volley-m','volley-w','conference'];
export function isConnected(id){return id==='nba'||staticIDs.includes(id)||directIDs.includes(id);}
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function save(key,payload){try{localStorage.setItem(key,JSON.stringify(payload));}catch{}}
const inflight=new Map();
export function loadProvider(id,season,options={}){const key=id+season;if(inflight.has(key))return inflight.get(key);const task=fetchProvider(id,season,options).then(async p=>{await loadBadgeCatalog();rememberBadges(p,id);return safeResults(p);}).finally(()=>inflight.delete(key));inflight.set(key,task);return task;}
async function fetchProvider(id,season,{force=false}={}){
 if(season!=='2026-27'||!isConnected(id))throw Error('Μη διαθέσιμη σεζόν ή διοργάνωση');
 const key=(staticIDs.includes(id)?'sh-static-':'sh-provider-v5-')+id+'-'+season,cached=read(key);let failure;
 if(force&&(id==='nba'||directIDs.includes(id)&&!['volley-m','volley-w'].includes(id))){try{const p=id==='nba'?await loadNBA():await directProvider(id,season);save(key,{...p,season});return p;}catch(e){failure=e;}}
 try{const r=await fetch('./snapshots/'+id+'-'+season+'.json',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Δεν ανακτήθηκε το πρόγραμμα');const p=await r.json();if(p.season!==season||!(p.matches?.length||id==='nba'&&p.standings?.length))throw Error('Μη έγκυρο πρόγραμμα');save(key,p);return{...p,snapshot:true,...(failure?{fallback:failure.message}:{})};}
 catch(error){if(cached?.season===season&&(cached.matches?.length||id==='nba'&&cached.standings?.length))return{...cached,fallback:error.message};
  if(!force&&(id==='nba'||directIDs.includes(id)&&!['volley-m','volley-w'].includes(id))){const p=id==='nba'?await loadNBA():await directProvider(id,season);save(key,{...p,season});return p;}throw error;}
}
