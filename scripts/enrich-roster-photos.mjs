import {readFile,writeFile,readdir} from 'node:fs/promises';
import {sameTeam} from '../dist/detail-data.js';
const root=new URL('../dist/rosters/',import.meta.url),base='https://www.thesportsdb.com/api/v1/json/123/';
let next=0,requests=0;
async function request(path){const wait=Math.max(0,next-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));next=Date.now()+2300;requests++;const r=await fetch(base+path,{signal:AbortSignal.timeout(12000)});if(r.status===429)throw Error('Rate limit: stopping enrichment');if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
const leagueNames={seriea:['Italian Serie A'],ligue1:['French Ligue 1'],nba:['NBA'],sl:['Greek Super League 1'],pl:['English Premier League'],laliga:['Spanish La Liga'],bund:['German Bundesliga'],cl:['UEFA Champions League'],europa:['UEFA Europa League'],conference:['UEFA Conference League','UEFA Europa Conference League']};
const all=await request('all_leagues.php'),directories=new Map(),seen=new Map();
for(const [id,names]of Object.entries(leagueNames)){const leagues=(all.leagues||[]).filter(l=>names.includes(l.strLeague));const teams=[];for(const l of leagues)try{teams.push(...(await request('lookup_all_teams.php?id='+encodeURIComponent(l.idLeague))).teams||[]);}catch(error){if(error.message.startsWith('Rate limit'))throw error;console.log(id+': '+error.message);}directories.set(id,teams);}
for(const file of (await readdir(root)).filter(f=>f.endsWith('.json')&&f!=='coverage.json')){
 const payload=JSON.parse(await readFile(new URL(file,root)));
 for(const roster of payload.teams){
  if(!['soccer','basketball'].includes(roster.sourceNamespace)||!roster.sourceTeamID)continue;
  const key=roster.sourceNamespace+':'+roster.sourceTeamID;
  if(!seen.has(key)){
   const sport=roster.sourceNamespace==='soccer'?'Soccer':'Basketball',teams=directories.get(payload.competition)||[];
   const hits=teams.filter(t=>t.strSport===sport&&(String(t.idESPN)===roster.sourceTeamID||sameTeam(roster.team,t.strTeam,(t.strTeamAlternate||'').split(','))));
   if(hits.length!==1){seen.set(key,[]);continue;}
   try{const raw=await request('lookup_all_players.php?id='+encodeURIComponent(hits[0].idTeam));seen.set(key,(raw.player||[]).filter(p=>p.strSport===sport&&String(p.idTeam)===String(hits[0].idTeam)));}catch(error){if(error.message.startsWith('Rate limit'))throw error;console.log(roster.team+': '+error.message);seen.set(key,[]);}
  }
  const images=seen.get(key);for(const player of roster.players){
   const hits=images.filter(p=>String(p.idESPN)===player.id);if(hits.length!==1)continue;
   const row=hits[0],urls=[row.strCutout,row.strThumb].filter(Boolean).filter(url=>{try{const u=new URL(url);return u.protocol==='https:'&&['r2.thesportsdb.com','www.thesportsdb.com'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}});
   player.photos=[...new Set([player.photo,...player.photos||[],...urls].filter(Boolean))];player.photo=player.photos[0]||null;
   if(urls.length)player.photoCredit='TheSportsDB';
  }
 }
 await writeFile(new URL(file,root),JSON.stringify(payload)+'\n');console.log(file+': '+payload.teams.reduce((n,t)=>n+t.players.filter(p=>p.photo).length,0)+' portraits');
}
const report=JSON.parse(await readFile(new URL('coverage.json',root)));
for(const row of report.competitions){const payload=JSON.parse(await readFile(new URL(row.id+'.json',root)));row.photos=payload.teams.reduce((n,t)=>n+t.players.filter(p=>p.photo).length,0);}
report.photoCheckedAt=new Date().toISOString();await writeFile(new URL('coverage.json',root),JSON.stringify(report,null,2)+'\n');console.log('Photo API requests: '+requests);
