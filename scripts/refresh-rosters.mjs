import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {competitions} from '../dist/data.js';
import {liveLeagues} from '../dist/live-scores.js';
import {parseRoster,parseEuroRoster,sameTeam,applyRosterPhotos} from '../dist/detail-data.js';
import {teamKey} from '../dist/badges.js';
import {greekRosters} from './roster-sources.mjs';
const nativeFetch=globalThis.fetch;
const root=new URL('../dist/',import.meta.url),out=new URL('rosters/',root),checkedAt=new Date().toISOString();
await mkdir(out,{recursive:true});
async function json(url){const r=await nativeFetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function text(url){const r=await nativeFetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();}
async function pool(items,fn,n=4){let cursor=0;await Promise.all(Array.from({length:n},async()=>{while(cursor<items.length){const item=items[cursor++];await fn(item);}}));}
const report={season:'2026-27',checkedAt,competitions:[]},euroCache=new Map();
const footballKey=name=>teamKey(name).replace(/^fc/,'').replace(/(?:fc|cf)$/,'');
const officialPhotos=JSON.parse(await readFile(new URL('snapshots/player-photos-2026-27.json',root)));
for(const c of competitions){
 let payload;try{payload=JSON.parse(await readFile(new URL('snapshots/'+c.id+'-2026-27.json',root)));}catch{payload={matches:[]};}
 const teams=[...new Set([...(payload.matches||[]).flatMap(m=>[m.home,m.away]),...(payload.standings||[]).map(r=>r.team)])].filter(Boolean),records=[],missing=[];
 let sourceTeams=[],euro=[];
 let greek=[];if(['gbl','volley-w','volley-m'].includes(c.id))try{greek=await greekRosters(c.id,json,text);}catch(error){console.log(c.id+' official directory: '+error.message);}
 if(liveLeagues[c.id])try{
  const [sport,league]=liveLeagues[c.id],raw=await json('https://site.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/teams?limit=1000');
  sourceTeams=(raw.sports||[]).flatMap(s=>(s.leagues||[]).flatMap(l=>(l.teams||[]).map(t=>t.team))).filter(Boolean);
 }catch(error){console.log(c.id+' team directory: '+error.message);}
 if(c.sport==='basketball'&&c.id!=='nba')for(const code of ['E','U'])try{
  if(!euroCache.has(code))euroCache.set(code,await json('https://api-live.euroleague.net/v2/competitions/'+code+'/seasons/'+code+'2026/clubs'));
  const raw=euroCache.get(code);euro.push(...raw.data.map(t=>({...t,competitionCode:code})));
 }catch{}
 await pool(teams,async team=>{
  try{let roster;
   const official=greek.filter(r=>sameTeam(team,r.team));
   if(official.length===1)roster=official[0];
   else if(liveLeagues[c.id]){
    const hits=sourceTeams.filter(t=>sameTeam(team,t.displayName,[t.shortDisplayName,t.name,t.abbreviation])||[t.displayName,t.shortDisplayName,t.name].some(n=>n&&footballKey(n)===footballKey(team)));
    if(hits.length!==1)throw Error('No unique seasonal team identity');
    const t=hits[0],[sport,league]=liveLeagues[c.id],raw=await json('https://site.web.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/teams/'+t.id+'/roster?region=us&lang=en&contentorigin=espn&season='+(c.id==='nba'?2027:2026));
    roster=applyRosterPhotos(parseRoster(raw,t.displayName,t.id,c),officialPhotos,t.id);roster.team=team;
    roster.sourceTeamID=String(t.id);roster.sourceNamespace=sport;
   }else if(euro.length){
    const hits=euro.filter(t=>sameTeam(team,t.name,[t.abbreviatedName,t.editorialName,t.clubPermanentName,t.clubPermanentAlias]));
    const unique=[...new Map(hits.map(t=>[t.code,t])).values()];if(unique.length!==1)throw Error('No unique official Euroleague club identity');
    const t=unique[0],code=t.competitionCode,raw=await json('https://api-live.euroleague.net/v2/competitions/'+code+'/seasons/'+code+'2026/clubs/'+t.code+'/people');roster=parseEuroRoster(raw,t.name,t.code,code);
   }else throw Error('No verified seasonal roster provider');
   if(!roster.players.length)throw Error('Empty roster');
   records.push({...roster,team,competition:c.id,sport:c.sport,checkedAt});
  }catch(error){missing.push({team,error:error.message});}
 });
 records.sort((a,b)=>a.team.localeCompare(b.team));
 await writeFile(new URL(c.id+'.json',out),JSON.stringify({season:'2026-27',competition:c.id,sport:c.sport,checkedAt,teams:records})+'\n');
 const row={id:c.id,name:c.name,teams:teams.length,rosters:records.length,players:records.reduce((n,t)=>n+t.players.length,0),photos:records.reduce((n,t)=>n+t.players.filter(p=>p.photo).length,0),missing};report.competitions.push(row);console.log(JSON.stringify(row));
}
await writeFile(new URL('coverage.json',out),JSON.stringify(report,null,2)+'\n');
