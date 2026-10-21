import{teamKey}from'./badges.js?v=20';
import{aliases}from'./team-aliases.js?v=20';
import{loadProvider}from'./providers.js?v=20';
const leagues={sl:['soccer','gre.1'],pl:['soccer','eng.1'],bund:['soccer','ger.1'],laliga:['soccer','esp.1'],seriea:['soccer','ita.1'],ligue1:['soccer','fra.1'],cl:['soccer','uefa.champions'],europa:['soccer','uefa.europa'],conference:['soccer','uefa.europa.conf'],nba:['basketball','nba']};
const athens=d=>({date:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),time:new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)});
export function decimalOdds(value){if(value===null||value===undefined||value==='')return null;const n=String(value).toUpperCase()==='EVEN'?100:Number(value);return Number.isFinite(n)&&Math.abs(n)>=100?Number((n>0?1+n/100:1+100/Math.abs(n)).toFixed(2)):null;}
function bookURL(odds){try{const u=new URL(odds.link?.href),inner=new URL(u.searchParams.get('preurl')||u.href);if(inner.protocol==='https:'&&inner.hostname==='sportsbook.draftkings.com'&&/^\/event\/\d+\/?$/.test(inner.pathname))return inner.origin+inner.pathname;}catch{}return null;}
export function parseTVDetails(raw,id,checkedAt=new Date().toISOString()){
 if(!leagues[id])throw Error('Άγνωστη πηγή σκορ');
 const expected=id==='nba'?2027:2026;if(raw.leagues?.[0]?.season?.year!==expected)throw Error('Λανθασμένη σεζόν σκορ');
 return(raw.events||[]).flatMap(e=>{const g=e.competitions?.[0],h=g?.competitors?.find(c=>c.homeAway==='home'),a=g?.competitors?.find(c=>c.homeAway==='away'),d=new Date(e.date);if(!h?.team?.displayName||!a?.team?.displayName||!Number.isFinite(+d))return[];
  const state=g.status?.type||e.status?.type,score=[h.score,a.score].map(v=>v===null||v===undefined||v===''?NaN:Number(v?.value??v)),valid=score.every(v=>Number.isInteger(v)&&v>=0)&&(state?.completed||state?.state==='in');
  const result={id:'espn-'+e.id,competition:id,home:h.team.displayName,away:a.team.displayName,homeAliases:[h.team.shortDisplayName,h.team.name].filter(Boolean),awayAliases:[a.team.shortDisplayName,a.team.name].filter(Boolean),...athens(d),startsAt:e.date,checkedAt,score:valid?score:null,scoreState:valid?(state.completed?'final':'live'):null,source:'https://www.espn.com/'};
  const o=g.odds?.find(o=>o.provider?.name==='DraftKings');
  if(o&&state?.state==='pre'){const home=decimalOdds(o.moneyline?.home?.close?.odds??o.homeTeamOdds?.moneyLine),away=decimalOdds(o.moneyline?.away?.close?.odds??o.awayTeamOdds?.moneyLine),draw=decimalOdds(o.moneyline?.draw?.close?.odds??o.drawOdds?.moneyLine),url=bookURL(o);if(home&&away&&url&&(id==='nba'||draw))result.odds={bookmaker:'DraftKings',via:'ESPN',market:id==='nba'?'Νικητής αγώνα':'1Χ2',home,away,...(id==='nba'?{}:{draw}),url,checkedAt,startsAt:e.date};}
  return[result];
 });
}
const candidates=(name,extra=[])=>new Set([name,...extra,...aliases[teamKey(name)]||[]].flatMap(n=>[n,...aliases[teamKey(n)]||[]]).map(teamKey));
function same(name,other,extra){const a=candidates(name);return[...candidates(other,extra)].some(n=>a.has(n));}
export function applyTVDetails(matches,entries,now=Date.now()){
 return matches.map(m=>{const hits=entries.filter(x=>x.competition===m.competition&&x.date===m.date&&same(m.home,x.home,x.homeAliases)&&same(m.away,x.away,x.awayAliases)&&Math.abs(Number(m.time?.slice(0,2))*60+Number(m.time?.slice(3))-Number(x.time?.slice(0,2))*60-Number(x.time?.slice(3)))<=15);if(hits.length!==1)return m;const x=hits[0],age=now-Date.parse(x.checkedAt),fresh=Number.isFinite(age)&&age>=-60000&&age<120000;const score=x.score?{score:x.score,scoreState:x.scoreState==='live'&&!fresh?'current':x.scoreState,scoreCheckedAt:x.checkedAt,scoreSource:x.source}:{};const o=x.odds,odds=o&&now<Date.parse(o.startsAt)&&age>=-60000&&age<600000?o:null;return{...m,...score,odds};});
}
const cache=new Map(),inflight=new Map();
export async function loadTVDetails(date,{competition='all-tv',force=false,fallback=true}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Μη έγκυρη ημερομηνία');const key=date+'-'+competition;
 if(!force&&cache.has(key)&&Date.now()-Date.parse(cache.get(key).retrievedAt)<60000)return cache.get(key);if(inflight.has(key))return inflight.get(key);
 const task=(async()=>{const ids=competition==='all-tv'?Object.keys(leagues):leagues[competition]?[competition]:[],entries=[],errors=[],retrievedAt=new Date().toISOString();
  await Promise.all(ids.map(async id=>{const[sport,league]=leagues[id],days=[date];if(id==='nba'){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);days.push(d.toISOString().slice(0,10));}await Promise.all(days.map(async day=>{try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?dates='+day.replaceAll('-',''),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);entries.push(...parseTVDetails(await r.json(),id,retrievedAt).filter(e=>e.date===date));}catch{errors.push(id);}}));}));
  await Promise.all(['el','eurocup'].filter(id=>competition==='all-tv'||id===competition).map(async id=>{try{const p=await loadProvider(id,'2026-27',{force});for(const m of p.matches.filter(m=>m.date===date&&m.time))entries.push({...m,competition:id,checkedAt:p.retrievedAt,source:p.source});}catch{errors.push(id);}}));
  const unique=[...new Map(entries.map(e=>[e.competition+'-'+e.id,e])).values()];if(errors.length&&fallback){try{const r=await fetch('./snapshots/tv-details-'+date+'.json',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(r.ok){const p=await r.json();if(p.date===date)for(const e of p.entries||[])if(!unique.some(x=>x.competition===e.competition&&x.id===e.id))unique.push(e);}}catch{}}
  const p={date,entries:unique,retrievedAt,errors};cache.set(key,p);return p;
 })().finally(()=>inflight.delete(key));inflight.set(key,task);return task;
}
