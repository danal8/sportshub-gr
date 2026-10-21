import{teamKey}from'./badges.js?v=20';
import{aliases}from'./team-aliases.js?v=20';
const names=n=>new Set([n,...aliases[teamKey(n)]||[]].map(teamKey));
const same=(a,b)=>[...names(a)].some(n=>names(b).has(n));
// Only explicit in-progress/completed states can introduce scores.
export function mergeScoreboard(matches,raw){
 if(raw.leagues?.[0]?.season?.year!==2026)throw Error('Λανθασμένη σεζόν LiveScore');
 const next=matches.map(m=>({...m}));
 for(const e of raw.events||[]){const game=e.competitions?.[0],home=game?.competitors?.find(c=>c.homeAway==='home'),away=game?.competitors?.find(c=>c.homeAway==='away');if(!home||!away)continue;
  const m=next.find(m=>same(m.home,home.team.displayName)&&same(m.away,away.team.displayName)&&Math.abs(Date.parse(m.date)-Date.parse(e.date?.slice(0,10)))<172800000);if(!m)continue;
  const status=game.status?.type||e.status?.type,score=[home.score,away.score].map(s=>s===null||s===''||s===undefined?NaN:Number(s));
  const d=new Date(e.date);if(Number.isFinite(+d)){m.date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);m.time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
  if((status?.completed||status?.state==='in')&&score.every(n=>Number.isInteger(n)&&n>=0)){m.score=score;m.scoreState=status.completed?'final':'live';}
 }
 return next;
}
export async function refreshGreekScores(matches){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-',''),source='https://site.api.espn.com/apis/site/v2/sports/soccer/gre.1/scoreboard?dates='+today;const r=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('LiveScore '+r.status);return{matches:mergeScoreboard(matches,await r.json()),source};}
