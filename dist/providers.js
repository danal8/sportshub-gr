import {parseGreekFootball,normalizeSportsDB,sportsSeason}from'./feeds.js';
const leagues={gbl:'4452',el:'4546',eurocup:'4547',cl:'4480',europa:'4481',conference:'5071'};
let queue=Promise.resolve(),lastRequest=0;
export function isConnected(id){return id==='sl'||id==='elite'||!!leagues[id];}
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function save(key,payload){try{localStorage.setItem(key,JSON.stringify(payload));}catch{}}
function sportsRequest(url){const request=queue.catch(()=>{}).then(async()=>{const remaining=2200-(Date.now()-lastRequest);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));lastRequest=Date.now();const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();});queue=request;return request;}
export async function loadProvider(id,season,{force=false}={}){
 const key=`sh-provider-v2-${id}-${season}`,cached=read(key);if(!['elite','gbl','el','eurocup','cl','europa','conference','sl'].includes(id)&&!force&&cached&&Date.now()-new Date(cached.retrievedAt).getTime()<3600000)return{...cached,cached:true};
 try{
  let payload;
  if(['elite','gbl','el','eurocup','cl','europa','conference','sl'].includes(id)){const r=await fetch('/api/data?id='+id+'&season='+season,{cache:'no-store',signal:AbortSignal.timeout(60000)});const data=await r.json();if(!r.ok)throw Error(data.error||('HTTP '+r.status));payload=data;}
  else if(id==='sl'){const source=`https://raw.githubusercontent.com/openfootball/europe/master/greece/${season}_gr1.txt`;const r=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);payload={source,retrievedAt:new Date().toISOString(),matches:parseGreekFootball(await r.text(),season),notice:'openfootball / CC0 · κοινοτική πηγή. Πρόγραμμα κανονικής περιόδου. Η κατάταξη είναι ενδεικτική και εξαρτάται από τα καταχωρισμένα τελικά αποτελέσματα.'};}
  else{const league=leagues[id];if(!league)throw Error('Unknown provider');const source=`https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=${league}&s=${sportsSeason(season)}`;const data=await sportsRequest(source);const matches=normalizeSportsDB(data,league,season);let next=[],warning='';const nextURL=`https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${league}`;try{next=normalizeSportsDB(await sportsRequest(nextURL),league,season);}catch(err){warning=` Η ανάκτηση επόμενου αγώνα απέτυχε (${err.message}).`;}
   payload={source,sources:[source,nextURL],retrievedAt:new Date().toISOString(),matches:[...new Map([...matches,...next].map(m=>[m.id,m])).values()],partial:true,notice:'Μερική κάλυψη TheSportsDB: έως 15 αγώνες σεζόν και 1 επόμενος. Δεν αποτελεί πλήρες πρόγραμμα ή πλήρη αγωνιστική.'+warning};}
  if(!Array.isArray(payload.matches)||!payload.matches.length)throw Error('Κενή πηγή');save(key,payload);return payload;
 }catch(error){if(cached)return{...cached,fallback:error.message};const file=id==='elite'?`elite-personal-${season}`:`${id}-${season}`;const r=await fetch(`./snapshots/${file}.json`);if(!r.ok)throw error;const payload=await r.json();return{...payload,fallback:error.message};}
}
