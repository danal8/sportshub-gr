import{normalizeFootball}from'./core.js?v=75';
import{teamKey}from'./badges.js?v=75';
import{aliases}from'./team-aliases.js?v=75';
import{standingsCoverage}from'./standings-health.js?v=75';
import{sectionStatus}from'./source-status.js?v=75';
const leagues={pl:{file:'en.1',espn:'eng.1',teams:20,matches:380},laliga:{file:'es.1',espn:'esp.1',teams:20,matches:380},seriea:{file:'it.1',espn:'ita.1',teams:20,matches:380},ligue1:{file:'fr.1',espn:'fra.1',teams:18,matches:306}};
const local=utc=>({date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(utc)),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(utc))});
async function json(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
export function footballStandings(raw,id){
 const config=leagues[id],table=raw.children?.[0]?.standings;
 if(!config||table?.season!==2026||table.entries?.length!==config.teams)throw Error('Λανθασμένη σεζόν ή βαθμολογία');
 return table.entries.map((e,i)=>{const stat=n=>e.stats.find(s=>s.name===n)?.value;const r={rank:stat('rank')||i+1,team:e.team.displayName,sourceTeamID:String(e.team.id),teamAliases:[e.team.shortDisplayName,e.team.name].filter(Boolean),badge:e.team.logos?.[0]?.href,played:stat('gamesPlayed'),wins:stat('wins'),draws:stat('ties'),losses:stat('losses'),points:stat('points')};if(![r.played,r.wins,r.draws,r.losses,r.points].every(Number.isInteger)||r.played<0||r.wins<0||r.draws<0||r.losses<0||r.wins+r.draws+r.losses!==r.played)throw Error('Μη έγκυρη βαθμολογία');return r;});
}
export function europeanFixtures(raw,id,standings){const config=leagues[id];if(!config||!raw.name?.includes('2026/27'))throw Error('Λανθασμένη σεζόν');const matches=normalizeFootball(raw,id);if(matches.length!==config.matches)throw Error('Ελλιπές πρόγραμμα');
 const same=(name,row)=>{const keys=new Set([name,...aliases[teamKey(name)]||[]].map(teamKey));return[row.team,...row.teamAliases||[]].some(n=>keys.has(teamKey(n)));};
 return matches.map((m,i)=>{const game=raw.matches[i];if(game.time){const dt=local(game.date+'T'+game.time+':00+0'+(game.date<'2026-10-25'||game.date>='2027-03-28'?'2':'1')+':00');Object.assign(m,dt);}for(const side of ['home','away']){const t=standings.find(r=>same(m[side],r));if(t){m[side+'Badge']=t.badge;m[side+'IDs']={...m[side+'IDs'],espn:t.sourceTeamID};m[side+'Aliases']=[t.team,...t.teamAliases];}}return{...m,scoreState:m.score?'final':null};});}
export async function loadEuropeanLeague(id){const c=leagues[id];if(!c)throw Error('Άγνωστη διοργάνωση');const source='https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/'+c.file+'.json',standingsSource='https://site.api.espn.com/apis/v2/sports/soccer/'+c.espn+'/standings?season=2026';const[raw,table]=await Promise.all([json(source),json(standingsSource)]);const standings=footballStandings(table,id);return{season:'2026-27',source,standingsSource,retrievedAt:new Date().toISOString(),matches:europeanFixtures(raw,id,standings),standings,copyright:'openfootball / CC0 · ESPN standings'};}


export async function loadFootballStandings(id,{fetchJSON=json}={}){
 const c=leagues[id];if(!c)throw Error('Άγνωστη διοργάνωση');
 const source='https://site.api.espn.com/apis/v2/sports/soccer/'+c.espn+'/standings?season=2026';
 const standings=footballStandings(await fetchJSON(source),id);
 if(new Set(standings.map(r=>r.sourceTeamID)).size!==c.teams)throw Error('Διπλή ομάδα στη βαθμολογία');
 return{standings,source};
}
// Check against reconciled finals, not just the primary provider's older results.
export async function preferCompleteFootballStandings(payload,id,options){
 if(!['pl','laliga'].includes(id)||payload.standings?.length&&!standingsCoverage(payload.matches,payload.standings).stale)return payload;
 try{
  const alternative=await loadFootballStandings(id,options),coverage=standingsCoverage(payload.matches,alternative.standings);
  if(coverage.stale||coverage.unmatched.length)throw Error('Ελλιπής εναλλακτική βαθμολογία');
  return{...payload,standings:alternative.standings,standingsSource:alternative.source,sections:{...payload.sections,standings:sectionStatus(payload.sections?.standings,{data:alternative.standings,previousData:payload.standings,source:alternative.source,coverage})}};
 }catch{return payload;}
}
