import test from 'node:test';import assert from 'node:assert/strict';
import {parseFlashscore,loadFlashScores,verifiedScoreData} from '../dist/flashscore.js';
import {createLiveHandler} from '../supabase/functions/sportshub-live/index.js';
const date='2026-10-29',checkedAt='2026-10-29T17:25:00Z',now=Date.parse(checkedAt);
const match={id:'cup-volos',competition:'greek-cup',date,home:'Βόλος Elabet',away:'Ατρόμητος Αθηνών'};
const feed='SA÷1¬~ZA÷ΕΛΛΑΔΑ: Superbet Κύπελλο Ελλάδας¬ZL÷/football/greece/greek-cup/¬~AA÷OOHk3J0U¬AD÷1793289600¬AB÷2¬AC÷13¬AO÷1793293419¬PX÷nDZbFBqG¬PY÷GAUEFGvM¬AE÷Βόλος¬AF÷Ατρόμητος¬AG÷1¬AH÷3¬';
test('Observed Greek Cup feed resolves sponsored EPO names, preserves identity and isolates the competition',()=>{
 const entries=parseFlashscore(feed,[match],{sport:1,date,checkedAt}).entries;
 assert.equal(entries.length,1);assert.deepEqual(entries[0].score,[1,3]);assert.equal(entries[0].scoreState,'live');assert.equal(entries[0].id,match.id);assert.match(entries[0].clock,/′/);
 for(const change of [{competition:'sl'},{date:'2026-10-28'},{home:match.away,away:match.home}])assert.equal(parseFlashscore(feed,[{...match,...change}],{sport:1,date,checkedAt}).entries.length,0);
 assert.equal(parseFlashscore(feed,[match,{...match,id:'duplicate'}],{sport:1,date,checkedAt}).entries.length,0);
 assert.equal(parseFlashscore(feed.replace('AB÷2','AB÷1'),[match],{sport:1,date,checkedAt}).entries.length,0);
 assert.equal(parseFlashscore(feed.replace('AB÷2','AB÷3').replace('AC÷13','AC÷3'),[match],{sport:1,date,checkedAt}).entries[0].scoreState,'final');
 const tv={...match,id:'tv-'+match.id};assert.equal(verifiedScoreData({season:'2026-27',provider:'SportsHub live relay',entries},[tv],{date,now})[0].id,tv.id);
});
test('Cup-only views request football live scores and the deployed relay parser returns the same fixture',async(t)=>{
 // Keep the captured fixture within the live feed window on every CI run.
 t.mock.timers.enable({apis:['Date'],now});
 let calls=0;const result=await loadFlashScores([match],date,{competitionIDs:['greek-cup'],fetchImpl:async url=>{calls++;if(String(url).includes('flashscore.ninja'))return new Response(feed);return Response.json({season:'2026-27',provider:'SportsHub live relay',entries:[]});}});
 assert.ok(calls>=2);assert.deepEqual(result.entries[0].score,[1,3]);
 const handler=createLiveHandler({now:()=>now,fetchImpl:async url=>String(url).includes('/daily-')?Response.json({season:'2026-27',matches:[match]}):String(url).includes('flashscore.ninja')?new Response(feed):Response.json({})});
 const r=await handler(new Request('https://example.test/?date='+date+'&sports=1'));assert.equal(r.status,200);const p=await r.json();assert.equal(p.entries[0].id,match.id);assert.deepEqual(p.entries[0].score,[1,3]);
});
