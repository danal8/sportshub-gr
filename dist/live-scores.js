import{loadFlashScores,preferScoreSources}from'./flashscore.js?v=66';
import{VOLLEY_RESULTS,verifiedVolleyEntries,loadWomenResults}from'./volley-scores.js?v=66';
import{GBL_LIVE,verifiedGblEntries}from'./gbl-scores.js?v=66';
import{mergeResultUpdates,sameResultMatch}from'./result-reconciliation.js?v=66';
import{teamKey}from'./badges.js?v=66';
import{aliases}from'./team-aliases.js?v=66';
import{athensDay,shiftDay}from'./core.js?v=66';
import{openGames,euroGames}from'./direct.js?v=66';
import{sl2Score}from'./results.js?v=66';
export const LIVE_INTERVAL=30000,LIVE_TTL=90000;
export const liveLeagues={sl:['soccer','gre.1'],pl:['soccer','eng.1'],bund:['soccer','ger.1'],laliga:['soccer','esp.1'],seriea:['soccer','ita.1'],ligue1:['soccer','fra.1'],cl:['soccer','uefa.champions'],europa:['soccer','uefa.europa'],conference:['soccer','uefa.europa.conf'],nba:['basketball','nba']};
const names=(n,extra=[])=>new Set([n,...extra,...aliases[teamKey(n)]||[]].filter(Boolean).flatMap(x=>[x,...aliases[teamKey(x)]||[]]).filter(Boolean).map(teamKey));
const same=(a,b,extra=[])=>{const x=names(a);return[...names(b,extra)].some(n=>x.has(n));};
const score=s=>Array.isArray(s)&&s.length===2&&s.every(v=>Number.isInteger(v)&&v>=0);
const minute=value=>{const s=String(value??'').trim().replace(/[’'′]/g,'').replace(/\s/g,'');return /^\d{1,3}(?:\+\d{1,2})?$/.test(s)?s+'′':null;};
export function sourceClock(status,sport){
 const type=status?.type||{};if(type.completed||type.state!=='in')return null;
 if(/HALFTIME|HALF_TIME/i.test(type.name||''))return 'Ημίχρονο';
 if(/SHOOTOUT|PENALTIES/i.test(type.name||''))return 'Πέναλτι';
 if(/DELAY|SUSPEND|INTERRUPT/i.test(type.name||''))return 'Διακοπή';
 if(sport==='soccer')return minute(status.displayClock)||minute(type.shortDetail)||null;
 const clock=String(status.displayClock??'').trim(),period=Number(status.period);
 if(!/^\d{1,2}:\d{2}(?:\.\d)?$|^\d{1,2}(?:\.\d)?$/.test(clock))return null;
 return(Number.isInteger(period)&&period>0?(period<=4?period+'η περ.':(period-4)+'η παρ.')+' · ':'')+clock;
}
export function parseLiveScoreboard(raw,id,checkedAt=new Date().toISOString()){
 if(!liveLeagues[id]||!Array.isArray(raw?.events))throw Error('Invalid live scoreboard');
 const year=id==='nba'?2027:2026;if(raw.leagues?.[0]?.season?.year!==year)throw Error('Wrong live season');
 return raw.events.flatMap(e=>{
 const g=e.competitions?.[0],h=g?.competitors?.find(x=>x.homeAway==='home'),a=g?.competitors?.find(x=>x.homeAway==='away'),status=g?.status||e.status,d=new Date(e.date);
 if(!h?.team?.displayName||!a?.team?.displayName||!Number.isFinite(+d))return[];
 const s=[h.score,a.score].map(v=>v===null||v===undefined||v===''?NaN:Number(v?.value??v)),type=status?.type||{},valid=score(s)&&(type.completed===true||type.state==='in');
 return[{id:'espn-'+e.id,competition:id,date:athensDay(d),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d),home:h.team.displayName,away:a.team.displayName,homeIDs:h.team.id?{espn:String(h.team.id)}:{},awayIDs:a.team.id?{espn:String(a.team.id)}:{},eventIDs:{espn:String(e.id)},homeAliases:[h.team.shortDisplayName,h.team.name].filter(Boolean),awayAliases:[a.team.shortDisplayName,a.team.name].filter(Boolean),score:valid?s:null,scoreState:valid?(type.completed?'final':'live'):null,clock:valid?sourceClock(status,liveLeagues[id][0]):null,checkedAt,source:liveLeagues[id][0]==='soccer'?'https://www.espn.com/soccer/match/_/gameId/'+e.id:'https://www.espn.com/nba/game/_/gameId/'+e.id,provider:'ESPN'}];
 });
}
export function parseEuroHeader(raw,m,checkedAt=new Date().toISOString(),pbp){
 const code=m.competition==='el'?'E':m.competition==='eurocup'?'U':null;
 if(!code||String(raw.CompetitionReducedName||raw.pcom||'').trim()!==code+'2026')throw Error('Wrong EuroLeague season');
 const [dd,mm,yyyy]=String(raw.Date||'').split('/');if([yyyy,mm,dd].join('-')!==m.date||!same(m.home,raw.TeamA,[raw.CodeTeamA?.trim()])||!same(m.away,raw.TeamB,[raw.CodeTeamB?.trim()]))throw Error('Wrong EuroLeague match');
 const s=[raw.ScoreA,raw.ScoreB].map(v=>v===null||v===undefined||v===''?NaN:Number(v));
 const plays=pbp?[...pbp.FirstQuarter||[],...pbp.SecondQuarter||[],...pbp.ThirdQuarter||[],...pbp.ForthQuarter||[],...pbp.ExtraTime||[]]:[];
 const final=raw.Live===false&&(m.scoreState==='final'||plays.some(p=>p.PLAYTYPE==='EG'));
 if(!score(s)||!(raw.Live===true||final))return null;
 const q=Number(raw.Quarter),remaining=String(raw.RemainingPartialTime||'').trim();
 const clock=raw.Live===true&&/^\d{1,2}:\d{2}$/.test(remaining)?(q>0&&q<10?(q<=4?q+'η περ.':(q-4)+'η παρ.')+' · ':'Υπόλοιπο ')+remaining:null;
 return{...m,score:s,scoreState:final?'final':'live',clock,scoreClock:clock,checkedAt,scoreCheckedAt:checkedAt,source:'https://live.euroleague.net/',provider:'Euroleague Basketball'};
}
export function applyLiveScores(matches,entries,now=Date.now()){return mergeResultUpdates(matches,entries,now);}
const cache=new Map(),inflight=new Map();
export function isFreshLive(match,now=Date.now()){
 const age=now-Date.parse(match.scoreCheckedAt||match.checkedAt);
 return match.scoreState==='live'&&score(match.score)&&Number.isFinite(age)&&age>=-60000&&age<LIVE_TTL;
}
export function mergeLiveMatches(matches,entries,{date,competitionIDs}={}){
 const out=applyLiveScores(matches,entries),allowed=new Set(competitionIDs||matches.map(m=>m.competition));
 for(const x of entries){if(!allowed.has(x.competition)||x.date!==date||!(isFreshLive(x)||x.scoreState==='final'&&score(x.score))||out.some(m=>sameResultMatch(m,x)))continue;out.push({...x,scoreCheckedAt:x.checkedAt,scoreClock:x.clock,scoreSource:x.source});}
 return out;
}
async function requestJSON(url){const r=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function requestFeed(key,run,force){
 if(inflight.has(key))return inflight.get(key);const old=cache.get(key);if(!force&&old&&Date.now()-old.at<25000)return old.value;
 const task=run().then(value=>{cache.set(key,{at:Date.now(),value});return value;}).finally(()=>inflight.delete(key));inflight.set(key,task);return task;
}
export async function loadLiveScores(matches,date,{force=false,competitionIDs,onUpdate}={}){
 const entries=[],errors=[],sources=[],succeeded=[];const ids=[...new Set(competitionIDs||matches.filter(m=>m.date===date).map(m=>m.competition))];
 const primary=await loadFlashScores(matches,date,{competitionIDs:ids,force,onUpdate});entries.push(...primary.entries);errors.push(...primary.errors);sources.push(...primary.sources);succeeded.push(...primary.succeeded);if(primary.entries.length)onUpdate?.({...primary,date,checkedAt:new Date().toISOString()});
 await Promise.all(ids.filter(id=>liveLeagues[id]).map(async id=>{
 try{const value=await requestFeed(id+'-'+date,async()=>{
 const [sport,league]=liveLeagues[id],days=id==='nba'?[date,shiftDay(date,-1)]:[date],out=[];
 for(const day of days){const url='https://site.web.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?region=us&lang=en&contentorigin=espn&limit=1000&dates='+day.replaceAll('-','')+'&t='+Date.now();const raw=await requestJSON(url);out.push(...parseLiveScoreboard(raw,id,new Date().toISOString()).filter(e=>e.date===date));}
 return[...new Map(out.map(e=>[e.id,e])).values()];},force);entries.push(...value);succeeded.push(id);sources.push('ESPN');
 }catch(e){errors.push({id,error:e.message});}
 }));
 if(ids.includes('sl2')&&(!matches.some(m=>m.competition==='sl2'&&m.date===date)||!matches.filter(m=>m.competition==='sl2'&&m.date===date).every(m=>entries.some(x=>sameResultMatch(m,x)))))try{
  const value=await requestFeed('sl2-live-'+date,async()=>{const source='https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/matches',raw=await requestJSON(source+'?t='+Date.now()),checkedAt=new Date().toISOString();if(!Array.isArray(raw)||raw.some(g=>g.competition_slug!=='sl2-2627'))throw Error('Wrong SL2 competition');return raw.filter(g=>g.date===date).map(g=>({id:'sl2-'+g.id,competition:'sl2',date:g.date,time:g.time?.slice(0,5),home:g.home_team.name_el,away:g.away_team.name_el,homeBadge:g.home_team.logo?.small,awayBadge:g.away_team.logo?.small,...sl2Score(g),checkedAt,source,provider:'Super League 2',clock:g.status==='halftime'?'Ημίχρονο':null}));},force);entries.push(...value.filter(m=>score(m.score)));succeeded.push('sl2');sources.push('Super League 2');
 }catch(e){errors.push({id:'sl2',error:e.message});}
 if(ids.includes('gbl'))try{const payload=await requestJSON(GBL_LIVE+'?t='+Date.now());entries.push(...verifiedGblEntries(payload,matches).filter(m=>m.date===date));succeeded.push('gbl');sources.push('ΕΣΑΚΕ / Genius Sports');}catch(e){errors.push({id:'gbl',error:e.message});try{const payload=await requestJSON('./snapshots/gbl-live.json');entries.push(...verifiedGblEntries(payload,matches).filter(m=>m.date===date));}catch{}}
 const volleyIDs=ids.filter(id=>['volley-m','volley-w'].includes(id));
 if(volleyIDs.length)await Promise.all([
  (async()=>{try{const payload=await requestJSON(VOLLEY_RESULTS+'?t='+Date.now());entries.push(...verifiedVolleyEntries(payload,matches).filter(m=>m.date===date));succeeded.push(...volleyIDs);sources.push('ESAP / EOPE');}catch(e){errors.push({id:'volley-results',error:e.message});try{const payload=await requestJSON('./snapshots/volley-results.json?t='+Date.now());entries.push(...verifiedVolleyEntries(payload,matches).filter(m=>m.date===date));}catch{}}})(),
  (async()=>{if(!volleyIDs.includes('volley-w'))return;const r=await loadWomenResults(matches,date,{fetchJSON:requestJSON});for(const x of r.entries){const i=entries.findIndex(m=>m.competition===x.competition&&m.id===x.id);if(i>=0)entries.splice(i,1);entries.push(x);}if(!r.errors.length){succeeded.push('volley-w');sources.push('EOPE');}else errors.push(...r.errors.map(error=>({id:'volley-w',error})));})()
 ]);
 // Coalesce independent result sources before reconciliation (which rejects ambiguous duplicates).
 const volleyball=new Map();for(const x of entries)if(['volley-m','volley-w'].includes(x.competition)){const k=x.competition+'|'+x.id,old=volleyball.get(k);if(!old||Date.parse(x.scoreCheckedAt||x.checkedAt)>Date.parse(old.scoreCheckedAt||old.checkedAt))volleyball.set(k,x);}
 for(let i=entries.length-1;i>=0;i--)if(['volley-m','volley-w'].includes(entries[i].competition))entries.splice(i,1);entries.push(...volleyball.values());
 const openLeagues={pl:'pl',bund:'bl1',laliga:'la1',cl:'ucl',europa:'uel2026'};
 await Promise.all(ids.filter(id=>openLeagues[id]&&matches.some(m=>m.competition===id&&m.date===date&&!entries.some(x=>x.competition===id&&same(m.home,x.home,x.homeAliases)&&same(m.away,x.away,x.awayAliases)))).map(async id=>{
  try{const value=await requestFeed('open-live-'+id+'-'+date,async()=>{const url='https://api.openligadb.de/getmatchdata/'+openLeagues[id]+'/2026',raw=await requestJSON(url),checkedAt=new Date().toISOString();return openGames(raw,id,2026).filter(m=>m.date===date&&['live','final'].includes(m.scoreState)).map(m=>({...m,competition:id,checkedAt,source:url,provider:'OpenLigaDB'}));},force);
   for(const x of value)if(!entries.some(m=>m.competition===id&&same(m.home,x.home,x.homeAliases)&&same(m.away,x.away,x.awayAliases)))entries.push(x);if(value.length)sources.push('OpenLigaDB');
  }catch(e){errors.push({id:'open-'+id,error:e.message});}
 }));
 const euroMatches=matches.filter(m=>m.date===date&&['el','eurocup'].includes(m.competition));
 const euroRefs=[];
 await Promise.all([...new Set(euroMatches.map(m=>m.competition))].map(async id=>{
 const refs=euroMatches.filter(m=>m.competition===id),known=refs.filter(m=>/^[EU]-\d+$/.test(m.id));euroRefs.push(...known);
 if(known.length===refs.length)return;
 try{const p=await requestFeed('schedule-'+id,()=>requestJSON('./snapshots/'+id+'-2026-27.json'),false);for(const m of p.matches||[])if(m.date===date&&refs.some(r=>same(r.home,m.home,m.homeAliases)&&same(r.away,m.away,m.awayAliases)))if(!euroRefs.some(r=>r.id===m.id&&r.competition===id))euroRefs.push({...m,competition:id});}catch(e){errors.push({id,error:e.message});}
 }));
 await Promise.all(euroRefs.map(async m=>{
 const key=m.competition+'-'+m.id;try{const value=await requestFeed(key,async()=>{const season=(m.competition==='el'?'E':'U')+'2026',base='https://live.euroleague.net/api/',query='?gamecode='+m.id.split('-')[1]+'&seasoncode='+season,raw=await requestJSON(base+'Header'+query);let pbp;
 if(raw.Live===false&&m.scoreState!=='final'&&Number(String(raw.GameTime||'').split(':')[0])>=40)pbp=await requestJSON(base+'PlaybyPlay'+query);
 return parseEuroHeader(raw,m,new Date().toISOString(),pbp);},force);
 if(value)entries.push(value);succeeded.push(key);sources.push('Euroleague Basketball');
 }catch(e){errors.push({id:key,error:e.message});}
 }));
 await Promise.all(ids.filter(id=>['el','eurocup'].includes(id)).map(async id=>{try{
  const code=id==='el'?'E':'U',value=await requestFeed('euro-games-live-'+id+'-'+date,async()=>{const source='https://api-live.euroleague.net/v2/competitions/'+code+'/seasons/'+code+'2026/games',raw=await requestJSON(source),checkedAt=new Date().toISOString();return euroGames(raw,code,'2026').filter(m=>m.date===date&&['live','final'].includes(m.scoreState)).map(m=>({...m,competition:id,checkedAt,source,provider:'Euroleague Basketball'}));},force);
  for(const x of value)if(!entries.some(m=>m.competition===id&&same(m.home,x.home,x.homeAliases)&&same(m.away,x.away,x.awayAliases)))entries.push(x);succeeded.push('official-'+id);if(value.length)sources.push('Euroleague Basketball');
 }catch(e){errors.push({id:'official-'+id,error:e.message});}}));
 return{date,entries:preferScoreSources(matches,entries),succeeded,errors,sources:[...new Set(sources)],checkedAt:new Date().toISOString()};
}

