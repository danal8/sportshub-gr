import{competitions}from'./data.js?v=26';
import{aliases}from'./team-aliases.js?v=26';
import{teamKey}from'./badges.js?v=26';
import{athensDay,normalizeFootball,shiftDay}from'./core.js?v=26';
import{liveLeagues,sourceClock,parseEuroHeader}from'./live-scores.js?v=26';
const web='https://site.web.api.espn.com/apis/site/v2/sports/',query='region=us&lang=en&contentorigin=espn';
const validScore=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0);
const names=(name,extra=[])=>new Set([name,...extra].filter(Boolean).flatMap(n=>[n,...aliases[teamKey(n)]||[]]).map(teamKey));
export function sameTeam(a,b,extra=[]){const first=names(a);return[...names(b,extra)].some(x=>first.has(x));}
const cache=new Map(),inflight=new Map();
export async function detailJSON(url,{ttl=120000,force=false}={}){
 if(inflight.has(url))return inflight.get(url);const old=cache.get(url);if(!force&&old&&Date.now()-old.at<ttl)return old.data;
 const task=fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();cache.set(url,{at:Date.now(),data});return data;}).finally(()=>inflight.delete(url));inflight.set(url,task);return task;
}
export function snapshotMatches(p,c){
 if(p.season&&p.season!=='2026-27')throw Error('Άλλη σεζόν προγράμματος');
 const matches=Array.isArray(p.matches)?p.matches:p.data?normalizeFootball(p.data,c.id).map(m=>({...m,scoreState:validScore(m.score)?'final':null})):null;
 if(!matches)throw Error('Μη διαθέσιμο πρόγραμμα');
 return matches.filter(m=>typeof m.home==='string'&&typeof m.away==='string'&&(!m.date||m.date>='2026-07-01'&&m.date<'2027-07-01')).map(m=>({...m,competition:c.id,competitionLabel:c.name,sportLabel:c.sport==='football'?'Ποδόσφαιρο':c.sport==='basketball'?'Μπάσκετ':'Βόλεϊ'}));
}
export function buildTeamOverview(team,c,records,today=athensDay()){
 const all=[],standings=[],sources=[],seen=new Set();let undated=0;
 for(const r of records){if(r.competition.sport!==c.sport||(r.competition.id==='volley-w')!==(c.id==='volley-w'))continue;
 const p=r.payload;let matches;try{matches=snapshotMatches(p,r.competition);}catch{continue;}
 const row=p.standings?.find(row=>sameTeam(team,row.team));if(row)standings.push({...row,competition:r.competition.id,competitionLabel:r.competition.name});
 let used=false;for(const m of matches){if(!sameTeam(team,m.home,m.homeAliases)&&!sameTeam(team,m.away,m.awayAliases))continue;used=true;const key=[m.competition,m.date,m.home,m.away].join('|');if(seen.has(key))continue;seen.add(key);if(!m.date){undated++;continue;}all.push(m);}
 if(used||row)sources.push({url:p.source,checkedAt:p.retrievedAt,competition:r.competition.name});
 }
 all.sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99'));
 const recent=all.filter(m=>m.date<=today&&m.scoreState==='final'&&validScore(m.score)).reverse();
 const upcoming=all.filter(m=>m.date>=today&&m.scoreState!=='final');
 const form=recent.slice(0,5).map(m=>{const home=sameTeam(team,m.home,m.homeAliases),a=m.score[home?0:1],b=m.score[home?1:0];return{...m,outcome:a===b?'D':a>b?'W':'L'};});
 return{team,competition:c.id,sport:c.sport,matches:all,recent,upcoming,form,standings,sources,undated,today};
}
export async function loadTeamOverview(team,c,{seed=[],force=false}={}){
 const allowed=competitions.filter(x=>x.sport===c.sport&&(x.id==='volley-w')===(c.id==='volley-w')),records=[],errors=[];
 await Promise.all(allowed.map(async competition=>{
 try{const ready=!force&&seed.find(r=>r.competition.id===competition.id);let payload=ready?.payload;
 if(!payload){try{payload=await detailJSON('./snapshots/'+competition.id+'-2026-27.json',{force});}catch(e){if(!competition.file)throw e;payload=await detailJSON('./snapshots/2026-27-'+competition.file+'.json',{force});}}
 snapshotMatches(payload,competition);records.push({competition,payload});
 }catch{errors.push(competition.name);}
 }));
 return{...buildTeamOverview(team,c,records),errors,records};
}
function scoreURL(id,day){const [sport,league]=liveLeagues[id];return web+sport+'/'+league+'/scoreboard?'+query+'&dates='+day.replaceAll('-','');}
async function scoreboard(id,day,options){const p=await detailJSON(scoreURL(id,day),{ttl:30000,...options});if(p.leagues?.[0]?.season?.year!==(id==='nba'?2027:2026)||!Array.isArray(p.events))throw Error('Άλλη σεζόν πηγής');return p.events;}
export function resolveEvent(rawEvents,m){
 const hits=rawEvents.filter(e=>{const g=e.competitions?.[0],h=g?.competitors?.find(x=>x.homeAway==='home'),a=g?.competitors?.find(x=>x.homeAway==='away');return h&&a&&Number.isFinite(Date.parse(e.date))&&athensDay(new Date(e.date))===m.date&&sameTeam(m.home,h.team?.displayName,[h.team?.shortDisplayName])&&sameTeam(m.away,a.team?.displayName,[a.team?.shortDisplayName]);});
 if(hits.length!==1||!/^\d+$/.test(String(hits[0].id)))throw Error('Δεν επιβεβαιώθηκε μοναδικά ο αγώνας στην πηγή');return String(hits[0].id);
}
async function eventID(m,{force=false}={}){
 if(m.competition==='nba'&&/^nba-\d+$/.test(m.id))return m.id.slice(4);
 const days=m.competition==='nba'?[m.date,shiftDay(m.date,-1)]:[m.date],events=[];
 for(const day of days)events.push(...await scoreboard(m.competition,day,{force}));
 return resolveEvent([...new Map(events.map(e=>[e.id,e])).values()],m);
}
export async function resolveTeam(team,c,overview,options){
 // Resolve identity from the league directory, independently of fixture dates.
 if(liveLeagues[c.id]){
  const [sport,league]=liveLeagues[c.id];
  try{const p=await detailJSON(web+sport+'/'+league+'/teams?'+query+'&limit=1000',{ttl:3600000,...options});
   const teams=(p.sports||[]).flatMap(s=>(s.leagues||[]).filter(l=>l.slug===league||l.abbreviation===league||!l.slug).flatMap(l=>(l.teams||[]).map(t=>t.team||t)));
   const hits=[...new Map(teams.filter(t=>sameTeam(team,t.displayName,[t.shortDisplayName,t.name,t.abbreviation])).map(t=>[String(t.id),t])).values()];
   if(hits.length===1&&/^\d+$/.test(String(hits[0].id)))return{team:hits[0],competition:c.id};
  }catch{}
 }
 const candidates=(overview?.matches||[]).filter(m=>liveLeagues[m.competition]).sort((a,b)=>Number(b.competition===c.id)-Number(a.competition===c.id)||Math.abs(Date.parse(a.date)-Date.parse(athensDay()))-Math.abs(Date.parse(b.date)-Date.parse(athensDay())));
 const dates=[...new Map(candidates.map(m=>[m.competition+'-'+m.date,m])).values()].slice(0,3);
 for(const m of dates){try{const days=m.competition==='nba'?[m.date,shiftDay(m.date,-1)]:[m.date],teams=[];
 for(const day of days)for(const event of await scoreboard(m.competition,day,options))for(const person of event.competitions?.[0]?.competitors||[])if(person.team)teams.push(person.team);
 const hits=[...new Map(teams.filter(t=>sameTeam(team,t.displayName,[t.shortDisplayName,t.name])).map(t=>[t.id,t])).values()];
 if(hits.length===1&&/^\d+$/.test(String(hits[0].id)))return{team:hits[0],competition:m.competition};
 }catch{}}
 throw Error('Δεν βρέθηκε επαληθευμένο αναγνωριστικό ομάδας');
}
export function playerPhoto(url){
 try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&['a.espncdn.com','media-cdn.cortextech.io','media-cdn.incrowdsports.com','images.euroleague.net','ftpserver.euroleague.net'].includes(u.hostname)?u.href:null;}catch{return null;}
}
export function parseRoster(raw,team,id,c){
 if(raw.season?.year!==(c.id==='nba'?2027:2026)||String(raw.team?.id)!==String(id)||!sameTeam(team,raw.team?.displayName))throw Error('Το ρόστερ δεν αντιστοιχεί στην ομάδα και στη σεζόν');
 const items=(raw.athletes||[]).flatMap(a=>a.items||[a]),players=items.filter(a=>a?.displayName).map(a=>({id:String(a.id),name:a.displayName,jersey:a.jersey||'',position:a.position?.displayName||a.position?.name||'',age:Number.isFinite(a.age)?a.age:null,country:a.citizenship||a.birthPlace?.country||'',photo:playerPhoto(a.headshot?.href)}));
 const staff=(raw.coach||[]).map(a=>({name:a.displayName||[a.firstName,a.lastName].filter(Boolean).join(' '),role:'Προπονητής'})).filter(a=>a.name);
 return{players,staff,season:raw.season.displayName||'2026–27',team:raw.team.displayName,provider:'ESPN',source:c.id==='nba'?'https://www.espn.com/nba/team/roster/_/id/'+id:'https://www.espn.com/soccer/team/squad/_/id/'+id,checkedAt:new Date().toISOString()};
}
export function parseEuroRoster(raw,team,club,code,today=athensDay()){
 if(!Array.isArray(raw)||!raw.length||raw.some(r=>r.season?.code!==code+'2026'||r.club?.code!==club))throw Error('Άλλο τμήμα ή σεζόν ρόστερ');
 const active=raw.filter(r=>r.active===true&&(!r.startDate||r.startDate.slice(0,10)<=today)&&(!r.endDate||r.endDate.slice(0,10)>=today));if(!active.some(r=>sameTeam(team,r.club.name)))throw Error('Άλλη ομάδα ρόστερ');
 const players=active.filter(r=>r.type==='J'||r.typeName==='Player').map(r=>({id:r.person.code,name:r.person.name,jersey:r.dorsal||'',position:r.positionName||'',age:null,country:r.person.country?.name||'',photo:playerPhoto(r.images?.headshot||r.person.images?.headshot)}));
 const staff=active.filter(r=>/coach/i.test(r.typeName||'')).map(r=>({name:r.person.name,role:r.typeName}));
 return{players,staff,season:'2026–27',team,provider:'Euroleague Basketball',source:'https://www.euroleaguebasketball.net/'+(code==='E'?'euroleague':'eurocup')+'/',checkedAt:new Date().toISOString()};
}
export async function loadTeamRoster(team,c,overview,{force=false}={}){
 if(c.sport==='basketball'&&c.id!=='nba'){
 for(const id of ['el','eurocup']){const p=overview.records?.find(r=>r.competition.id===id)?.payload;if(!p)continue;for(const m of p.matches||[]){const side=sameTeam(team,m.home,m.homeAliases)?'home':sameTeam(team,m.away,m.awayAliases)?'away':null;if(!side)continue;const club=(m[side+'Aliases']||[]).find(s=>/^[A-Z]{3}$/.test(s));if(!club)continue;const code=id==='el'?'E':'U';return parseEuroRoster(await detailJSON('https://api-live.euroleague.net/v2/competitions/'+code+'/seasons/'+code+'2026/clubs/'+club+'/people',{ttl:3600000,force}),team,club,code);}
 }
 throw Error('Δεν υπάρχει συνδεδεμένη πηγή ρόστερ για αυτή την ομάδα');
 }
 if(!liveLeagues[c.id])throw Error('Δεν υπάρχει συνδεδεμένη πηγή ρόστερ για αυτή τη διοργάνωση');
 const resolved=await resolveTeam(team,c,overview,{force}),[sport,league]=liveLeagues[resolved.competition],actual=competitions.find(x=>x.id===resolved.competition);
 const p=await detailJSON(web+sport+'/'+league+'/teams/'+resolved.team.id+'/roster?'+query+'&season='+(c.id==='nba'?2027:2026),{ttl:3600000,force});return parseRoster(p,team,resolved.team.id,actual);
}
const labels={foulsCommitted:'Φάουλ',yellowCards:'Κίτρινες κάρτες',redCards:'Κόκκινες κάρτες',offsides:'Οφσάιντ',wonCorners:'Κόρνερ',possessionPct:'Κατοχή %',shotsOnTarget:'Εντός εστίας',totalShots:'Τελικές',saves:'Αποκρούσεις',goalAssists:'Ασίστ',totalGoals:'Γκολ',appearances:'Συμμετοχές',points:'Πόντοι',rebounds:'Ριμπάουντ',totalRebounds:'Ριμπάουντ',assists:'Ασίστ',turnovers:'Λάθη',steals:'Κλεψίματα',blocks:'Τάπες',fieldGoalPct:'Εντός πεδιάς %',threePointFieldGoalPct:'Τρίποντα %',freeThrowPct:'Βολές %',offensiveRebounds:'Επιθετικά ριμπ.',defensiveRebounds:'Αμυντικά ριμπ.',fouls:'Φάουλ','fieldGoalsMade-fieldGoalsAttempted':'Εντός πεδιάς','threePointFieldGoalsMade-threePointFieldGoalsAttempted':'Τρίποντα','freeThrowsMade-freeThrowsAttempted':'Βολές'};
const val=v=>v===null||v===undefined||v===''?null:String(v);
export function parseMatchSummary(raw,m){
 const header=raw.header,g=header?.competitions?.[0],home=g?.competitors?.find(t=>t.homeAway==='home'),away=g?.competitors?.find(t=>t.homeAway==='away'),[sport,league]=liveLeagues[m.competition]||[];
 if(!sport||!home||!away||header.season?.year!==(m.competition==='nba'?2027:2026)||header.league?.slug!==league||!Number.isFinite(Date.parse(g.date))||athensDay(new Date(g.date))!==m.date||!sameTeam(m.home,home.team.displayName,[home.team.shortDisplayName])||!sameTeam(m.away,away.team.displayName,[away.team.shortDisplayName]))throw Error('Τα στατιστικά δεν αντιστοιχούν στον αγώνα');
 const byID=id=>String(id)===String(home.team.id)?'home':String(id)===String(away.team.id)?'away':null;
 const status=g.status||{},s=[home.score,away.score].map(v=>v===null||v===undefined||v===''?NaN:Number(v)),valid=validScore(s)&&(status.type?.completed||status.type?.state==='in');
 const stats=new Map();for(const t of raw.boxscore?.teams||[]){const side=byID(t.team?.id);if(!side)continue;for(const r of t.statistics||[]){if(!r.name||val(r.displayValue)===null)continue;const item=stats.get(r.name)||{name:r.name,label:labels[r.name]||r.label||r.name,home:null,away:null};item[side]=val(r.displayValue);stats.set(r.name,item);}}
 const players=[];for(const t of raw.boxscore?.players||[]){const side=byID(t.team?.id);if(!side)continue;for(const block of t.statistics||[])if(Array.isArray(block.labels))players.push({side,team:t.team.displayName,labels:block.labels,rows:(block.athletes||[]).filter(a=>a.athlete?.displayName).map(a=>({name:a.athlete.displayName,jersey:a.athlete.jersey||'',starter:!!a.starter,dnp:!!a.didNotPlay,values:block.labels.map((_,i)=>val(a.stats?.[i]))}))});}
 const lineups=[];for(const t of raw.rosters||[]){const side=byID(t.team?.id);if(!side)continue;lineups.push({side,team:t.team.displayName,formation:t.formation||'',rows:(t.roster||[]).filter(a=>a.athlete?.displayName).map(a=>({name:a.athlete.displayName,jersey:a.jersey||'',position:a.position?.displayName||'',starter:!!a.starter,subbedIn:!!a.subbedIn,subbedOut:!!a.subbedOut,stats:(a.stats||[]).filter(s=>['totalGoals','goalAssists','shotsOnTarget','totalShots','saves'].includes(s.name)).map(s=>({label:labels[s.name]||s.displayName,value:val(s.displayValue)}))}))});}
 const events=(raw.keyEvents?.length?raw.keyEvents:raw.plays?.length?raw.plays:g.details||[]).map(p=>({clock:p.clock?.displayValue||'',period:p.period?.number||null,text:p.text||p.shortText||[p.type?.text|| (p.scoringPlay?'Γκολ':p.redCard?'Κόκκινη κάρτα':''),...(p.participants||[]).map(p=>p.athlete?.displayName).filter(Boolean)].filter(Boolean).join(' · ')})).filter(p=>p.text).reverse();
 const periods=sport==='basketball'?Array.from({length:Math.max(home.linescores?.length||0,away.linescores?.length||0)},(_,i)=>({label:i<4?(i+1)+'η περ.':(i-3)+'η παρ.',home:val(home.linescores?.[i]?.displayValue),away:val(away.linescores?.[i]?.displayValue)})):[];
 return{match:m,score:valid?s:null,scoreState:valid?(status.type.completed?'final':'live'):null,clock:sourceClock(status,sport),stats:[...stats.values()],players,lineups,events,periods,venue:raw.gameInfo?.venue?.fullName||'',provider:'ESPN',source:sport==='basketball'?'https://www.espn.com/nba/game/_/gameId/'+header.id:'https://www.espn.com/soccer/match/_/gameId/'+header.id,checkedAt:new Date().toISOString()};
}
export function parseEuroDetails(header,box,pbp,m){
 const confirmed=parseEuroHeader(header,m,new Date().toISOString(),pbp),sides={home:header.TeamA,away:header.TeamB},stats=new Map(),players=[],periods=[];
 const keys=['Minutes','Points','FieldGoalsMade2','FieldGoalsAttempted2','FieldGoalsMade3','FieldGoalsAttempted3','FreeThrowsMade','FreeThrowsAttempted','TotalRebounds','Assistances','Steals','Turnovers','BlocksFavour','FoulsCommited','Valuation','Plusminus'];
 const titles=['MIN','PTS','2PM','2PA','3PM','3PA','FTM','FTA','REB','AST','STL','TO','BLK','PF','PIR','+/-'];
 const elLabels={Points:'Πόντοι',TotalRebounds:'Ριμπάουντ',Assistances:'Ασίστ',Steals:'Κλεψίματα',Turnovers:'Λάθη',BlocksFavour:'Τάπες',FoulsCommited:'Φάουλ',OffensiveRebounds:'Επιθετικά ριμπ.',DefensiveRebounds:'Αμυντικά ριμπ.',Valuation:'Αξιολόγηση'};
 for(const [side,name]of Object.entries(sides)){
 const b=box?.Stats?.find(t=>sameTeam(name,t.Team));if(!b)continue;
 players.push({side,team:name,labels:titles,rows:(b.PlayersStats||[]).filter(p=>p.Player?.trim()).map(p=>({name:p.Player.trim(),jersey:String(p.Dorsal??''),starter:p.IsStarter===1,dnp:!p.Minutes,values:keys.map(k=>val(p[k]))}))});
 for(const [key,label]of Object.entries(elLabels))if(val(b.totr?.[key])!==null){const item=stats.get(key)||{name:key,label,home:null,away:null};item[side]=val(b.totr[key]);stats.set(key,item);}
 const q=box?.ByQuarter?.find(t=>sameTeam(name,t.Team));if(q)for(const key of Object.keys(q).filter(k=>/^(Quarter\d+|ExtraTime\d*)$/.test(k))){let item=periods.find(p=>p.key===key);if(!item){item={key,label:key.startsWith('Quarter')?key.slice(7)+'η περ.':'Παράταση',home:null,away:null};periods.push(item);}item[side]=val(q[key]);}
 }
 const groups=['FirstQuarter','SecondQuarter','ThirdQuarter','ForthQuarter','ExtraTime'];
 const events=groups.flatMap((key,i)=>(pbp?.[key]||[]).map(p=>({order:Number(p.NUMBEROFPLAY)||0,clock:p.MARKERTIME||'',period:i+1,text:[p.PLAYER?.trim(),p.PLAYINFO||p.COMMENT].filter(Boolean).join(' · ')}))).filter(p=>p.text).sort((a,b)=>b.order-a.order);
 return{match:m,score:confirmed?.score||null,scoreState:confirmed?.scoreState||null,clock:confirmed?.clock||null,stats:[...stats.values()],players,lineups:[],events,periods,venue:header.Stadium||'',provider:'Euroleague Basketball',source:'https://live.euroleague.net/',checkedAt:new Date().toISOString()};
}
export async function loadMatchDetails(m,{force=false}={}){
 if(!m.date)throw Error('Δεν έχει οριστεί ημερομηνία για τον αγώνα');
 if(liveLeagues[m.competition]){const id=await eventID(m,{force}),[sport,league]=liveLeagues[m.competition],p=await detailJSON(web+sport+'/'+league+'/summary?'+query+'&event='+id,{ttl:30000,force});if(String(p.header?.id)!==id)throw Error('Τα στατιστικά δεν αντιστοιχούν στον αγώνα');return parseMatchSummary(p,m);}
 if(['el','eurocup'].includes(m.competition)){
 let ref=m;if(!/^[EU]-\d+$/.test(m.id)){const c=competitions.find(c=>c.id===m.competition),p=await detailJSON('./snapshots/'+c.id+'-2026-27.json');const hits=snapshotMatches(p,c).filter(x=>x.date===m.date&&sameTeam(m.home,x.home)&&sameTeam(m.away,x.away));if(hits.length!==1)throw Error('Δεν επιβεβαιώθηκε ο αγώνας');ref={...m,id:hits[0].id};}
 const code=m.competition==='el'?'E':'U',suffix='?gamecode='+ref.id.split('-')[1]+'&seasoncode='+code+'2026',base='https://live.euroleague.net/api/';
 const header=await detailJSON(base+'Header'+suffix,{ttl:30000,force});parseEuroHeader(header,ref);
 const [box,pbp]=await Promise.all([detailJSON(base+'Boxscore'+suffix,{ttl:30000,force}).catch(()=>null),detailJSON(base+'PlaybyPlay'+suffix,{ttl:30000,force}).catch(()=>null)]);return parseEuroDetails(header,box,pbp,ref);
 }
 throw Error('Δεν υπάρχει συνδεδεμένη πηγή αναλυτικών στατιστικών για αυτή τη διοργάνωση');
}
