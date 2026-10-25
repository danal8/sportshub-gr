import{safeResults}from'./results.js?v=64';
import{weekRange}from'./my-teams.js?v=64';
const storageKey='sh-data-daily-2026-27';
function saved(){try{return JSON.parse(localStorage.getItem(storageKey));}catch{return null;}}
let cached=saved(),pending,loadedAt=0;
export function dailySelection(payload,{season,date,competitionIDs,weekly=false},now=Date.now()){
 const range=weekly?weekRange(date):{start:date,end:date};
 if(payload?.season!==season||!Array.isArray(payload.matches)||!/^\d{4}-\d{2}-\d{2}$/.test(payload.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(payload.end||'')||range.start<payload.start||range.end>payload.end||!competitionIDs.every(id=>payload.sources?.some(s=>s.id===id)))return null;
 const ids=new Set(competitionIDs),matches=payload.matches.filter(m=>ids.has(m.competition)&&m.date>=range.start&&m.date<=range.end);
 return{matches:safeResults({matches,retrievedAt:payload.retrievedAt,fallback:payload.fallback},now).matches,sources:payload.sources.filter(s=>ids.has(s.id)).map(s=>({...s,...(payload.fallback?{fallback:payload.fallback}:{})})),start:payload.start,end:payload.end};
}
export async function loadDailySchedule(options,{force=false}={}){
 if(force||!cached||Date.now()-loadedAt>120000){
  pending||=fetch('./snapshots/daily-2026-27.json',{cache:'no-store',signal:AbortSignal.timeout(6000)}).then(async r=>{if(!r.ok)throw Error('Daily schedule unavailable');const p=await r.json();if(p.season!=='2026-27'||!Array.isArray(p.matches)||!Array.isArray(p.sources))throw Error('Invalid daily schedule');cached=p;loadedAt=Date.now();try{localStorage.setItem(storageKey,JSON.stringify(p));}catch{}}).catch(error=>{if(!cached)throw error;cached={...cached,fallback:error.message};}).finally(()=>pending=null);
  await pending;
 }
 return dailySelection(cached,options);
}
