import{sectionStatus}from'./source-status.js?v=75';
import{standingsCoverage}from'./standings-health.js?v=75';
export const nbaStandingsURL='https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2027';
export async function refreshNBAStandings(payload,{fetchJSON=json,now=Date.now()}={}){
 const previous=payload.sections?.standings,age=now-Date.parse(previous?.lastSuccessAt);
 if(Number.isFinite(age)&&age>=0&&age<300000&&!standingsCoverage(payload.matches||[],payload.standings||[]).stale)return payload;
 const checkedAt=new Date(now).toISOString();
 try{
  const standings=nbaStandings(await fetchJSON(nbaStandingsURL)),coverage=standingsCoverage(payload.matches||[],standings);
  return{...payload,standings,standingsSource:nbaStandingsURL,sections:{...payload.sections,standings:sectionStatus(previous,{data:standings,previousData:payload.standings,source:nbaStandingsURL,now:checkedAt,coverage})}};
 }catch(error){return{...payload,sections:{...payload.sections,standings:sectionStatus(previous,{data:payload.standings,source:nbaStandingsURL,now:checkedAt,error:error.message})}};}
}
export function nbaStandings(raw){
 if(raw.children?.length!==2||raw.children.some(c=>c.standings?.season!==2027||c.standings?.entries?.length!==15))throw Error('Λανθασμένη σεζόν ή ελλιπής κατάταξη NBA');
 return raw.children.flatMap(c=>c.standings.entries.map(e=>{
  const stat=n=>e.stats.find(s=>s.name===n)?.value;
  const wins=stat('wins'),losses=stat('losses'),rank=stat('playoffSeed');
  if(!e.team?.displayName||![wins,losses,rank].every(Number.isInteger))throw Error('Μη έγκυρη βαθμολογία NBA');
  return{rank,team:e.team.displayName,badge:e.team.logos?.[0]?.href,played:wins+losses,wins,losses,points:null,winRate:(100*stat('winPercent')).toFixed(1)+'%',group:c.name==='Eastern Conference'?'Ανατολική Περιφέρεια':'Δυτική Περιφέρεια'};
 }).sort((a,b)=>a.rank-b.rank));
}
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('NBA HTTP '+r.status);return r.json();}
export function nbaGames(raw){
 if(raw.season?.year!==2027&&raw.leagues?.[0]?.season?.year!==2027)throw Error('Λανθασμένη σεζόν NBA');
 return(raw.events||[]).filter(e=>e.season?.year===2027&&(!e.seasonType||e.seasonType.type===2)).map(e=>{
  const g=e.competitions?.[0],home=g?.competitors?.find(c=>c.homeAway==='home'),away=g?.competitors?.find(c=>c.homeAway==='away');if(!home?.team?.displayName||!away?.team?.displayName)throw Error('Λείπουν ομάδες NBA');
  const d=new Date(e.date);if(!Number.isFinite(+d))throw Error('Λανθασμένη ημερομηνία NBA');
  const status=g.status?.type||e.status?.type,score=[home.score,away.score].map(n=>Number(n?.value??n));const valid=score.every(n=>Number.isInteger(n)&&n>=0)&&!!(status?.completed||status?.state==='in');
  return{id:'nba-'+e.id,home:home.team.displayName,away:away.team.displayName,homeBadge:home.team.logo||home.team.logos?.[0]?.href,awayBadge:away.team.logo||away.team.logos?.[0]?.href,round:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),time:e.timeValid===false?null:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d),channel:null,score:valid?score:null,scoreState:valid?(status.completed?'final':'live'):null};
 });
}
export async function loadNBA({matches=[],full=false}={}){
 const raw=await json(nbaStandingsURL),standings=nbaStandings(raw),base='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';
 if(full){const ids=raw.children.flatMap(c=>c.standings.entries.map(e=>e.team.id)),all=[];let cursor=0;
  async function reader(){while(cursor<ids.length){const id=ids[cursor++];const p=await json(base+'teams/'+id+'/schedule?season=2027&seasontype=2');const games=nbaGames(p);if(games.length<70)throw Error('Ελλιπές πρόγραμμα ομάδας NBA');all.push(...games);}}
  await Promise.all(Array.from({length:6},reader));matches=[...new Map(all.map(m=>[m.id,m])).values()];if(matches.length<1100||new Set(matches.flatMap(m=>[m.home,m.away])).size!==30)throw Error('Ελλιπές πρόγραμμα NBA');
 }
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 // ESPN dates are US calendar dates; include yesterday for games after midnight in Athens.
 const previous=new Date(today+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);
 const games=new Map(matches.map(m=>[m.id,{...m,scoreState:m.scoreState==='live'?'current':m.scoreState}]));await Promise.all([today,previous.toISOString().slice(0,10)].map(async date=>{try{for(const m of nbaGames(await json(base+'scoreboard?dates='+date.replaceAll('-',''))))games.set(m.id,m);}catch{}}));matches=[...games.values()].sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
 if(!matches.length)throw Error('Δεν ανακτήθηκε πρόγραμμα NBA');
 return{season:'2026-27',matches,standings,source:base+'teams',standingsSource:nbaStandingsURL,scheduleCheckedAt:full?today:undefined,retrievedAt:new Date().toISOString(),copyright:'ESPN · NBA πρόγραμμα και βαθμολογία'};
}
