export const nbaStandingsURL='https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2027';
export function nbaStandings(raw){
 if(raw.children?.length!==2||raw.children.some(c=>c.standings?.season!==2027||c.standings?.entries?.length!==15))throw Error('Λανθασμένη σεζόν ή ελλιπής κατάταξη NBA');
 return raw.children.flatMap(c=>c.standings.entries.map(e=>{
  const stat=n=>e.stats.find(s=>s.name===n)?.value;
  const wins=stat('wins'),losses=stat('losses'),rank=stat('playoffSeed');
  if(!e.team?.displayName||![wins,losses,rank].every(Number.isInteger))throw Error('Μη έγκυρη βαθμολογία NBA');
  return{rank,team:e.team.displayName,badge:e.team.logos?.[0]?.href,played:wins+losses,wins,losses,points:null,winRate:(100*stat('winPercent')).toFixed(1)+'%',group:c.name==='Eastern Conference'?'Ανατολική Περιφέρεια':'Δυτική Περιφέρεια'};
 }).sort((a,b)=>a.rank-b.rank));
}
export async function loadNBA(){const r=await fetch(nbaStandingsURL,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('NBA HTTP '+r.status);return{season:'2026-27',matches:[],standings:nbaStandings(await r.json()),source:nbaStandingsURL,standingsSource:nbaStandingsURL,retrievedAt:new Date().toISOString(),copyright:'ESPN · NBA standings'};}
