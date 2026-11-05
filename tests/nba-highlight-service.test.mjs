import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{createNbaHighlightsHandler}from'../supabase/functions/sportshub-nba-highlights/index.js';
const f=JSON.parse(await readFile(new URL('./fixtures/nba-native-recap.json',import.meta.url))),html=p=>'<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:p}})+'</script>';
test('NBA recap service verifies source and caches dated results without trusting client fixture or URL inputs',async()=>{
 let calls=0;const handler=createNbaHighlightsHandler({now:()=>Date.parse('2026-10-24T07:00:00Z'),fetchImpl:async u=>{calls++;return{ok:true,text:async()=>html(u.includes('/games?')?u.endsWith('2026-10-23')?f.games:{selectedDate:'2026-10-24',gameCardFeed:{modules:[]}}:f.watch)};}});
 for(const date of['2025-10-24','2026-10-25','https://evil.test'])assert.equal((await handler(new Request('https://app/?date='+date))).status,400);assert.equal(calls,0);
 const r=await handler(new Request('https://app/?date=2026-10-24')),p=await r.json();assert.equal(r.status,200);assert.equal(p.videos.length,1);assert.equal(p.videos[0].publisher,'nba-com');assert.ok(p.videos[0].url.startsWith('https://www.nba.com/watch/video/'));const first=calls;await handler(new Request('https://app/?date=2026-10-24'));assert.equal(calls,first);
 assert.equal((await handler(new Request('https://app/',{method:'POST'}))).status,405);assert.equal((await handler(new Request('https://app/',{method:'OPTIONS'}))).status,204);
});
