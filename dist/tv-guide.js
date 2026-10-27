import{broadcastDetails}from'./tv-meta.js?v=72';
const key='sh-tv-guide-2026-27';
let cached,pending,loadedAt=0;
try{cached=JSON.parse(localStorage.getItem(key));}catch{}
export function selectTVGuide(payload,date,competition='all-tv'){
 const day=payload?.season==='2026-27'&&payload.days?.[date];
 if(!day||!Array.isArray(day.matches)||!Array.isArray(day.sources))return null;
 return{date,matches:day.matches.map(m=>/EuroLeague|EuroCup/i.test(m.competitionLabel||'')?{...m,...broadcastDetails(m.competitionLabel)}:m).filter(m=>m.date===date&&m.live&&m.time&&m.channel&&(competition==='all-tv'||m.competition===competition)),sources:day.sources.map(s=>({...s,...(payload.fallback?{fallback:payload.fallback}:{})}))};
}
export async function loadTVGuide(date,{competition='all-tv',force=false}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid TV date');
 if(force||!cached||Date.now()-loadedAt>60000){pending||=fetch('./snapshots/tv-guide-2026-27.json',{cache:'no-store',signal:AbortSignal.timeout(6000)}).then(async r=>{if(!r.ok)throw Error('TV guide unavailable');const p=await r.json();if(p.season!=='2026-27'||!p.days)throw Error('Invalid TV guide');cached=p;loadedAt=Date.now();try{localStorage.setItem(key,JSON.stringify(p));}catch{}}).catch(error=>{if(!cached)throw error;cached={...cached,fallback:error.message};}).finally(()=>pending=null);await pending;}
 return selectTVGuide(cached,date,competition);
}

