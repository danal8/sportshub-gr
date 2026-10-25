import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{fetchHighlightsIndex,HIGHLIGHTS_FEED}from'../dist/highlights.js';import{retainHighlightIndex,highlightsHealth}from'../scripts/highlight-health.mjs';import{loadNovaHighlights}from'../scripts/nova-highlights.mjs';
const at='2026-10-25T06:00:00Z',now=Date.parse(at),old={season:'2026-27',retrievedAt:'2026-10-24T20:00:00Z',videos:[{publisher:'nova',videoId:'abcdefghijk',competition:'pl',gameDate:'2026-10-24',publishedAt:'2026-10-24T20:00:00Z',kind:'game',title:'unresolved names'}]},latest={...old,retrievedAt:at,videos:[...old.videos,{publisher:'nba',videoId:'lmnopqrstuv',publishedAt:at}]};
test('Highlights use the newest valid data independently of Pages and survive either source outage',async()=>{
 assert.deepEqual(await fetchHighlightsIndex({fetchJSON:async u=>u.startsWith(HIGHLIGHTS_FEED)?latest:old}),latest);
 assert.deepEqual(await fetchHighlightsIndex({fetchJSON:async u=>{if(u.startsWith(HIGHLIGHTS_FEED))throw Error('outage');return old;}}),old);
 assert.deepEqual(await fetchHighlightsIndex({fetchJSON:async u=>u.startsWith(HIGHLIGHTS_FEED)?{...latest,season:'2025-26'}:old}),old);
 await assert.rejects(fetchHighlightsIndex({fetchJSON:async()=>{throw Error('outage');}}));
});
test('A partial or failed collector cannot remove previously confirmed videos',()=>{
 const next=retainHighlightIndex(latest,{...latest,videos:[]},{now});assert.equal(next.videos.length,2);assert.throws(()=>retainHighlightIndex(latest,{season:'2025-26',videos:[]},{now}));
 assert.equal(retainHighlightIndex({...old,videos:[{...old.videos[0],publishedAt:'2025-01-01'}]},{...latest,videos:[]},{now}).videos.length,0);
});
test('Health separates a published unmatched video from a fixture still awaiting a video',()=>{
 const matches=[{competition:'pl',home:'Chelsea FC',away:'Tottenham Hotspur FC',date:'2026-10-24',score:[0,2],scoreState:'final'},{competition:'gbl',home:'ΑΕΚ',away:'ΠΑΟΚ',date:'2026-10-24',score:[80,70],scoreState:'final'}],h=highlightsHealth(matches,old,{now});assert.equal(h.status,'degraded');assert.equal(h.unmatchedVideos.length,1);assert.equal(h.awaitingVideo.length,2);assert.ok(h.competitions.gbl);
});
test('Previously unmatched official pages are retried after the match becomes final, even when they leave the listing',async()=>{
 const {url,metadata}=JSON.parse(await readFile(new URL('./fixtures/nova-web-highlights.json',import.meta.url))),html=metadata.map(p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>').join(''),match={competition:'pl',home:'Chelsea FC',away:'Tottenham Hotspur FC',date:'2026-10-24',score:[0,2],scoreState:'live'},fetchText=async u=>u===url?html:'<html>No uploads today</html>',pendingURLs=[{url,firstSeen:'2026-10-24T22:00:00Z'}];
 const pending=await loadNovaHighlights([match],{now,fetchText,pendingURLs});assert.equal(pending.videos.length,0);assert.equal(pending.pendingURLs[0].firstSeen,pendingURLs[0].firstSeen);
 const ready=await loadNovaHighlights([{...match,scoreState:'final'}],{now,fetchText,pendingURLs:pending.pendingURLs});assert.equal(ready.videos.length,1);assert.equal(ready.pendingURLs.length,0);
});
test('Temporary YouTube failure is bounded and backs off instead of retrying every video every run',async()=>{
 const {verifyNBAVideoRegions}=await import('../scripts/nba-video-regions.mjs'),saved=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return{ok:false,status:429};};
 try{const videos=Array.from({length:20},(_,i)=>({publisher:'nba',videoId:String(i),gameDate:'2026-10-24',availableCountries:['GR'],regionCheckedAt:'2026-10-20T00:00:00Z'})),first=await verifyNBAVideoRegions(videos,{now});assert.equal(calls,16);assert.equal(first.videos.length,20);assert.deepEqual(first.videos[0].availableCountries,['GR']);await verifyNBAVideoRegions(first.videos,{now:now+600000});assert.equal(calls,20);}
 finally{globalThis.fetch=saved;}
});
