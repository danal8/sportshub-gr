import{aliases}from'./team-aliases.js?v=40';
import{validScore}from'./results.js?v=40';
const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const names=(name,extra=[])=>new Set([name,...extra,...aliases[key(name)]||[]].filter(Boolean).flatMap(n=>[n,...aliases[key(n)]||[]]).map(key));
function sameSide(a,b,side){
 const left=a[side+'IDs']||{},right=b[side+'IDs']||{},shared=Object.keys(left).filter(k=>left[k]&&right[k]);
 if(shared.length)return shared.every(k=>String(left[k])===String(right[k]));
 const n=names(a[side],a[side+'Aliases']);return [...names(b[side],b[side+'Aliases'])].some(s=>n.has(s));
}
export function sameResultMatch(a,b){
 if(!a.competition||a.competition!==b.competition||!a.date||a.date!==b.date)return false;
 const x=a.eventIDs||{},y=b.eventIDs||{};if(Object.keys(x).some(k=>x[k]&&y[k]&&String(x[k])!==String(y[k])))return false;
 return sameSide(a,b,'home')&&sameSide(a,b,'away');
}
export function mergeResultUpdates(matches,entries,now=Date.now()){
 return matches.map(m=>{
  const hits=entries.filter(x=>sameResultMatch(m,x));if(hits.length!==1)return m;const x=hits[0];
  // Ambiguous double headers must not receive the same result twice.
  if(matches.filter(r=>sameResultMatch(r,x)).length!==1)return m;
  const identity={homeIDs:{...m.homeIDs,...x.homeIDs},awayIDs:{...m.awayIDs,...x.awayIDs},eventIDs:{...m.eventIDs,...x.eventIDs}};
  if(!validScore(x.score)||!['live','current','final'].includes(x.scoreState))return {...m,...identity};
  if(m.scoreState==='final'&&validScore(m.score)&&x.scoreState!=='final')return {...m,...identity};
  const checked=x.scoreCheckedAt||x.checkedAt,existing=Date.parse(m.scoreCheckedAt),incoming=Date.parse(checked);
  if(!Number.isFinite(incoming)||x.scoreState==='final'&&incoming>now+60000)return m;
  if(validScore(m.score)&&Number.isFinite(existing)&&existing<=now+60000&&existing>incoming)return {...m,...identity};
  const fresh=now-incoming>=-60000&&now-incoming<90000;
  return {...m,...identity,time:m.time||x.time,score:x.score,scoreState:x.scoreState==='live'&&!fresh?'current':x.scoreState,scoreClock:x.scoreState==='live'&&fresh?(x.clock||x.scoreClock):null,scoreCheckedAt:checked,scoreSource:x.source||x.scoreSource,scoreProvider:x.provider||x.scoreProvider};
 });
}
export function preserveConfirmedResults(next,previous,id){
 if(!previous||next.season&&previous.season&&next.season!==previous.season)return next;
 const old=(previous.matches||[]).map(m=>({...m,competition:id,checkedAt:m.scoreCheckedAt||previous.retrievedAt}));
 const matches=(next.matches||[]).map(m=>({...m,competition:id}));
 const merged=matches.map(m=>{
  const hits=old.filter(x=>sameResultMatch(m,x));if(hits.length!==1||matches.filter(x=>sameResultMatch(x,hits[0])).length!==1)return m;
  const previousMatch=hits[0],identity={homeIDs:{...previousMatch.homeIDs,...m.homeIDs},awayIDs:{...previousMatch.awayIDs,...m.awayIDs},eventIDs:{...previousMatch.eventIDs,...m.eventIDs}};
  if(m.scoreState==='final'&&validScore(m.score)||previousMatch.scoreState!=='final'||!validScore(previousMatch.score))return {...m,...identity};
  return {...m,...identity,score:previousMatch.score,scoreState:'final',scoreClock:null,scoreCheckedAt:previousMatch.checkedAt,scoreSource:previousMatch.scoreSource||previous.source,scoreProvider:previousMatch.scoreProvider};
 });
 for(const m of old)if(m.scoreState==='final'&&validScore(m.score)&&!merged.some(x=>sameResultMatch(x,m))&&!merged.some(x=>x.id===m.id))merged.push({...m,scoreCheckedAt:m.checkedAt});
 return {...next,matches:merged};
}
export function resultCoverage(matches,entries,today){
 const fact=m=>({id:m.id,competition:m.competition,date:m.date,home:m.home,away:m.away});
 return {unmatchedResults:entries.filter(x=>validScore(x.score)&&['final','live'].includes(x.scoreState)&&matches.filter(m=>sameResultMatch(m,x)).length!==1).map(fact),awaitingResults:matches.filter(m=>m.date&&m.date<=today&&!(m.scoreState==='final'&&validScore(m.score))).map(fact)};
}
// The scoreboard owns the header; summary statistics keep their own check time.
export function synchronizeDetailScore(data,match,now=Date.now()){
 if(!data||!validScore(match.score))return data;
 const checked=match.scoreCheckedAt||match.checkedAt,age=now-Date.parse(checked);
 if(!Number.isFinite(age)||age< -60000||match.scoreState!=='final'&&!(match.scoreState==='live'&&age<90000))return data;
 if(data.scoreState==='final'&&match.scoreState!=='final')return data;
 if(data.scoreState==='final'&&match.scoreState==='final'&&Date.parse(data.checkedAt)>Date.parse(checked))return data;
 return {...data,score:match.score,scoreState:match.scoreState,clock:match.scoreClock||match.clock||null,scoreCheckedAt:checked};
}
