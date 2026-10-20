import{safeResults}from'./results.js?v=14';
import{rememberBadges,loadBadgeCatalog}from'./badges.js?v=14';
import{directIDs,directProvider}from'./direct.js?v=14';
import {parseGreekFootball,normalizeSportsDB,sportsSeason}from'./feeds.js?v=14';
const leagues={gbl:'4452',el:'4546',eurocup:'4547',cl:'4480',europa:'4481',conference:'5071'};
let queue=Promise.resolve(),lastRequest=0;
export function isConnected(id){return directIDs.includes(id)||id==='sl2'||id==='sl'||id==='elite'||!!leagues[id];}
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function save(key,payload){try{localStorage.setItem(key,JSON.stringify(payload));}catch{}}
function sportsRequest(url){const request=queue.catch(()=>{}).then(async()=>{const remaining=2200-(Date.now()-lastRequest);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));lastRequest=Date.now();const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();});queue=request;return request;}
const inflight=new Map();
export function loadProvider(id,season,options={}){const key=id+season;if(inflight.has(key))return inflight.get(key);const task=fetchProvider(id,season,options).then(async p=>{await loadBadgeCatalog();rememberBadges(p,id);return safeResults(p);}).finally(()=>inflight.delete(key));inflight.set(key,task);return task;}
async function fetchProvider(id,season,{force=false}={}){
 if(season!=='2026-27')throw Error('Μη διαθέσιμη σεζόν');
 if(id==='sl2'){try{return await directProvider(id,season);}catch{}}
 if(['sl2','elite','gbl','volley-m'].includes(id)){const key='sh-static-'+id+'-'+season;try{const r=await fetch('./snapshots/'+id+'-'+season+'.json',{cache:'no-store'});if(!r.ok)throw Error('Δεν ανακτήθηκε το πρόγραμμα');const p=await r.json();if(p.season!==season||!p.matches?.length)throw Error('Μη έγκυρο πρόγραμμα');save(key,p);return {...p,snapshot:true,matches:p.matches.map(m=>({...m,scoreState:m.scoreState==='live'?'current':m.scoreState}))};}catch(error){const cached=read(key);if(cached?.season===season&&cached.matches?.length)return {...cached,fallback:error.message};throw error;}}
 const key=`sh-provider-v4-${id}-${season}`,cached=read(key);if(!['elite','gbl','el','eurocup','cl','europa','conference','sl','sl2'].includes(id)&&!force&&cached&&Date.now()-new Date(cached.retrievedAt).getTime()<(directIDs.includes(id)?60000:3600000))return{...cached,cached:true};
 try{
  let payload;if(directIDs.includes(id)){payload=await directProvider(id,season);save(key,payload);return payload;}
  if(location.hostname==='danal8.github.io')throw Error('Η αυτόματη πηγή δεν είναι διαθέσιμη στο GitHub Pages');
  if(['elite','gbl','el','eurocup','cl','europa','conference','sl','sl2'].includes(id)){const r=await fetch('/api/data?id='+id+'&season='+season,{cache:'no-store',signal:AbortSignal.timeout(60000)});const data=await r.json();if(!r.ok)throw Error(data.error||('HTTP '+r.status));payload=data;}
  else if(id==='sl'){const source=`https://raw.githubusercontent.com/openfootball/europe/master/greece/${season}_gr1.txt`;const r=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);payload={source,retrievedAt:new Date().toISOString(),matches:parseGreekFootball(await r.text(),season),notice:'openfootball / CC0 · κοινοτική πηγή. Πρόγραμμα κανονικής περιόδου. Η κατάταξη είναι ενδεικτική και εξαρτάται από τα καταχωρισμένα τελικά αποτελέσματα.'};}
  else{const league=leagues[id];if(!league)throw Error('Unknown provider');const source=`https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=${league}&s=${sportsSeason(season)}`;const data=await sportsRequest(source);const matches=normalizeSportsDB(data,league,season);let next=[],warning='';const nextURL=`https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${league}`;try{next=normalizeSportsDB(await sportsRequest(nextURL),league,season);}catch(err){warning=` Η ανάκτηση επόμενου αγώνα απέτυχε (${err.message}).`;}
   payload={source,sources:[source,nextURL],retrievedAt:new Date().toISOString(),matches:[...new Map([...matches,...next].map(m=>[m.id,m])).values()],partial:true,notice:'Μερική κάλυψη TheSportsDB: έως 15 αγώνες σεζόν και 1 επόμενος. Δεν αποτελεί πλήρες πρόγραμμα ή πλήρη αγωνιστική.'+warning};}
  if(!Array.isArray(payload.matches)||!payload.matches.length)throw Error('Κενή πηγή');save(key,payload);return payload;
 }catch(error){if(cached)return{...cached,matches:cached.matches.map(m=>m.scoreState==='live'?{...m,scoreState:'current'}:m),fallback:error.message};const file=`${id}-${season}`;const r=await fetch(`./snapshots/${file}.json`);if(!r.ok)throw error;const payload=await r.json();return{...payload,fallback:error.message};}
}
