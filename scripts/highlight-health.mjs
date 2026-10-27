import{highlightCoverage}from'../dist/highlight-coverage.js';
const key=v=>(v.channelId||v.publisher)+'|'+v.videoId;
export function retainHighlightIndex(previous,next,{now=Date.now()}={}){
 if(next?.season!=='2026-27'||!Array.isArray(next.videos))throw Error('Invalid highlights index');
 const videos=new Map((previous?.season==='2026-27'?previous.videos||[]:[]).filter(v=>Date.parse(v.publishedAt||v.verifiedAt)>now-90*86400000).map(v=>[key(v),v]));
 for(const v of next.videos)videos.set(key(v),v);return{...next,videos:[...videos.values()]};
}
export function highlightsHealth(matches,index,{now=Date.now()}={}){
 const videoById=new Map(index.videos.map(v=>[v.videoId,v]));
 const coverage=highlightCoverage(matches,index.videos,{now}),unmatched=Object.entries(coverage.competitions).flatMap(([competition,c])=>c.unmatchedVideos.map(v=>({competition,...v}))),missing=Object.entries(coverage.competitions).flatMap(([competition,c])=>c.uncoveredMatches.map(m=>({competition,...m}))),errors=index.errors||[];
 const unavailable=unmatched.filter(v=>{const source=videoById.get(v.videoId);return source?.publisher==='nba'&&!source.availableCountries?.includes('GR');}),unresolved=unmatched.filter(v=>!unavailable.includes(v));
 return{checkedAt:new Date(now).toISOString(),indexCheckedAt:index.retrievedAt,status:errors.length||unresolved.length?'degraded':'ok',sources:index.sourceReports||[],sourceErrors:errors,unmatchedVideos:unresolved,unavailableOrUnverifiedInGR:unavailable,awaitingVideo:missing,...coverage};
}

export function sourceAttempt(previous,{id,publisher,label,url,videos=[],error=null,now=new Date().toISOString(),retainedVideos=0}={}){
 const old=previous?.sourceReports?.find(s=>s.id===id);return{id,publisher,label,url,lastAttemptAt:now,lastSuccessAt:error?old?.lastSuccessAt||null:now,status:error?'failed':'ok',error,httpStatus:error?.match(/HTTP\s+(\d{3})/)?.[1]?Number(error.match(/HTTP\s+(\d{3})/)[1]):null,retainedVideos:error?retainedVideos:0,verifiedThisRun:videos.length};
}
