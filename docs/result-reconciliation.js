import{aliases}from'./team-aliases.js?v=70';
import{validScore}from'./results.js?v=70';
const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const nameCache=new Map();
function names(name,extra=[]){const id=JSON.stringify([name,extra]);if(nameCache.has(id))return nameCache.get(id);const result=new Set([name,...extra,...aliases[key(name)]||[]].filter(Boolean).flatMap(n=>[n,...aliases[key(n)]||[]]).map(key));if(nameCache.size>=1024)nameCache.clear();nameCache.set(id,result);return result;}
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
// A round-robin home/away pairing occurs once per season. A dated final from
// another provider can correct a postponed fixture, but never a cup tie/doubleheader.
const roundRobin=new Set(['sl','pl','bund','laliga','seriea','ligue1']);
export function reconcileFixtureDates(matches,entries){
 let out=matches.map(m=>({...m}));
 for(const x of entries){
  if(!roundRobin.has(x.competition)||x.scoreState!=='final'||!validScore(x.score))continue;
  const candidates=out.filter(m=>m.competition===x.competition&&sameResultMatch({...m,date:x.date},x));
  if(candidates.length!==1)continue;const m=candidates[0];
  if(m.date===x.date||m.scoreState==='final')continue;
  const sharedEvent=Object.keys(m.eventIDs||{}).some(k=>m.eventIDs[k]&&String(m.eventIDs[k])===String(x.eventIDs?.[k]));
  const e=x.fixtureEvidence,verified=e?.provider==='ESPN'&&e.season==='2026-27'&&e.competition===x.competition&&e.eventID===x.eventIDs?.espn&&e.date===x.date&&e.homeID===x.homeIDs?.espn&&e.awayID===x.awayIDs?.espn&&String(m.homeIDs?.espn)===e.homeID&&String(m.awayIDs?.espn)===e.awayID;
  if(!sharedEvent&&!verified)continue;
  m.date=x.date;m.time=x.time||m.time;
 }
 return out;
}
// Only fixtures in the same competition and day can match. Avoid scanning entire
// seasons for every result, while retaining the existing ambiguity/identity checks.
function fixtureBuckets(matches){const out=new Map();for(const m of matches){const k=m.competition+'|'+m.date;if(!out.has(k))out.set(k,[]);out.get(k).push(m);}return out;}
const bucket=(index,m)=>index.get(m.competition+'|'+m.date)||[];
export function mergeResultUpdates(matches,entries,now=Date.now()){
 const results=fixtureBuckets(entries),fixtures=fixtureBuckets(matches);
 return matches.map(m=>{
  const hits=bucket(results,m).filter(x=>sameResultMatch(m,x));if(hits.length!==1)return m;const x=hits[0];
  // Ambiguous double headers must not receive the same result twice.
  if(bucket(fixtures,x).filter(r=>sameResultMatch(r,x)).length!==1)return m;
  const identity={homeIDs:{...m.homeIDs,...x.homeIDs},awayIDs:{...m.awayIDs,...x.awayIDs},eventIDs:{...m.eventIDs,...x.eventIDs}};
  if(!validScore(x.score)||!['live','current','final'].includes(x.scoreState))return {...m,...identity};
  if(m.scoreState==='final'&&validScore(m.score)&&(x.scoreState!=='final'||m.scoreProvider==='Flashscore'&&x.provider!=='Flashscore'&&x.scoreProvider!=='Flashscore'))return {...m,...identity};
  const checked=x.scoreCheckedAt||x.checkedAt,existing=Date.parse(m.scoreCheckedAt),incoming=Date.parse(checked);
  if(!Number.isFinite(incoming)||x.scoreState==='final'&&incoming>now+60000)return m;
  const authoritative=x.provider==='Flashscore'&&m.scoreProvider!=='Flashscore'&&now-incoming>=-60000&&now-incoming<90000;
  if(validScore(m.score)&&Number.isFinite(existing)&&existing<=now+60000&&existing>incoming&&!(x.scoreState==='final'&&m.scoreState!=='final')&&!authoritative)return {...m,...identity};
  const fresh=now-incoming>=-60000&&now-incoming<90000;
  return {...m,...identity,time:m.time||x.time,score:x.score,scoreState:x.scoreState==='live'&&!fresh?'current':x.scoreState,scoreClock:x.scoreState==='live'&&fresh?(x.clock||x.scoreClock):null,scoreCheckedAt:checked,scoreSource:x.source||x.scoreSource,scoreProvider:x.provider||x.scoreProvider,fixtureEvidence:x.fixtureEvidence||m.fixtureEvidence};
 });
}
export function preserveConfirmedResults(next,previous,id){
 if(!previous||next.season&&previous.season&&next.season!==previous.season)return next;
 const old=(previous.matches||[]).map(m=>({...m,competition:id,checkedAt:m.scoreCheckedAt||previous.retrievedAt}));
 const matches=reconcileFixtureDates((next.matches||[]).map(m=>({...m,competition:id})),old);
 const prior=fixtureBuckets(old),fixtures=fixtureBuckets(matches),ids=new Set(matches.map(m=>m.id));
 const merged=matches.map(m=>{
  const hits=bucket(prior,m).filter(x=>sameResultMatch(m,x));if(hits.length!==1||bucket(fixtures,m).filter(x=>sameResultMatch(x,hits[0])).length!==1)return m;
  const previousMatch=hits[0],identity={homeIDs:{...previousMatch.homeIDs,...m.homeIDs},awayIDs:{...previousMatch.awayIDs,...m.awayIDs},eventIDs:{...previousMatch.eventIDs,...m.eventIDs}};
  if(m.scoreState==='final'&&validScore(m.score)||previousMatch.scoreState!=='final'||!validScore(previousMatch.score))return {...m,...identity};
  return {...m,...identity,score:previousMatch.score,scoreState:'final',scoreClock:null,scoreCheckedAt:previousMatch.checkedAt,scoreSource:previousMatch.scoreSource||previous.source,scoreProvider:previousMatch.scoreProvider};
 });
 for(const m of old)if(m.scoreState==='final'&&validScore(m.score)&&!bucket(fixtures,m).some(x=>sameResultMatch(x,m))&&!ids.has(m.id)){const restored={...m,scoreCheckedAt:m.checkedAt};merged.push(restored);ids.add(m.id);const k=m.competition+'|'+m.date;if(!fixtures.has(k))fixtures.set(k,[]);fixtures.get(k).push(restored);}
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
