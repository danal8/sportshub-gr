import{parseLiveScoreboard}from'./live-scores.js?v=77';
import{sectionStatus}from'./source-status.js?v=77';
export const nationalLeagues={nations:'uefa.nations',friendly:'fifa.friendly'};
export async function loadNationalTeams(id,season,{fetchJSON=async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('ESPN HTTP '+r.status);return r.json();}}={}){
 if(!nationalLeagues[id]||season!=='2026-27')throw Error('Μη διαθέσιμη διοργάνωση ή σεζόν εθνικών');
 const base='https://site.api.espn.com/apis/site/v2/sports/soccer/'+nationalLeagues[id]+'/scoreboard',retrievedAt=new Date().toISOString();
 // Split calendar years: international friendlies use annual ESPN seasons.
 const ranges=Array.from({length:12},(_,i)=>String(i<6?2026:2027)+String((i+6)%12+1).padStart(2,'0'));
 const sources=ranges.map(d=>base+'?dates='+d+'&limit=1000');
 const groups=await Promise.all(sources.map(async url=>{const raw=await fetchJSON(url);if(raw.leagues?.[0]?.slug!==nationalLeagues[id]||!Array.isArray(raw.events)||raw.events.length>=1000)throw Error('Μη έγκυρο ή ελλιπές πρόγραμμα εθνικών');return (raw.events.length?parseLiveScoreboard(raw,id,retrievedAt):[]).map(m=>({...m,round:m.date,channel:null}));}));
 const matches=[...new Map(groups.flat().filter(m=>m.date>='2026-07-01'&&m.date<'2027-07-01').map(m=>[m.id,m])).values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 if(!matches.length)throw Error('Δεν δημοσιεύτηκαν αγώνες εθνικών για τη σεζόν');
 return{season,matches,standings:[],source:sources[0],sources,retrievedAt,partial:true,copyright:'ESPN · Δημοσιευμένο πρόγραμμα εθνικών ομάδων',sections:{matches:sectionStatus(null,{data:matches,source:sources[0],now:retrievedAt})}};
}
