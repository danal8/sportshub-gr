import{safeResults}from'./results.js?v=49';
import{weekRange}from'./my-teams.js?v=49';
let cached,pending,loadedAt=0;
export function dailySelection(payload,{season,date,competitionIDs,weekly=false},now=Date.now()){
 const range=weekly?weekRange(date):{start:date,end:date};
 if(payload?.season!==season||!Array.isArray(payload.matches)||!/^\d{4}-\d{2}-\d{2}$/.test(payload.start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(payload.end||'')||range.start<payload.start||range.end>payload.end||!competitionIDs.every(id=>payload.sources?.some(s=>s.id===id)))return null;
 const ids=new Set(competitionIDs),matches=payload.matches.filter(m=>ids.has(m.competition)&&m.date>=range.start&&m.date<=range.end);
 return{matches:safeResults({matches,retrievedAt:payload.retrievedAt},now).matches,sources:payload.sources.filter(s=>ids.has(s.id)),start:payload.start,end:payload.end};
}
export async function loadDailySchedule(options,{force=false}={}){
 if(force||!cached||Date.now()-loadedAt>120000){
  pending||=fetch('./snapshots/daily-2026-27.json',{cache:'no-store',signal:AbortSignal.timeout(2500)}).then(async r=>{if(!r.ok)throw Error('Daily schedule unavailable');cached=await r.json();loadedAt=Date.now();}).finally(()=>pending=null);
  await pending;
 }
 return dailySelection(cached,options);
}
