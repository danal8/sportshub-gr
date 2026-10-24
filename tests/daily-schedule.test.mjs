import test from'node:test';import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{dailySelection}from'../dist/daily-schedule.js';
import{buildDailySchedule}from'../scripts/build-daily-schedule.mjs';
import{competitions}from'../dist/data.js';
test('daily schedule covers every integrated competition and preserves dated source scores',async()=>{
 const p=await buildDailySchedule(),ids=competitions.map(c=>c.id);
 assert.deepEqual(new Set(p.sources.map(s=>s.id)),new Set(ids));
 const date=p.retrievedAt.slice(0,10),options={season:'2026-27',date,competitionIDs:ids};
 const selected=dailySelection(p,options,Date.parse(p.retrievedAt)+180000);
 assert.ok(selected);assert.ok(selected.matches.length);assert.ok(selected.matches.every(m=>m.date===date&&m.scoreState!=='live'));
 const nba=dailySelection(p,{...options,competitionIDs:['nba']});assert.ok(nba.matches.every(m=>m.competition==='nba'));
 for(const change of[{date:'2027-06-30'},{season:'2025-26'},{competitionIDs:['unavailable']}])assert.equal(dailySelection(p,{...options,...change}),null);
 const weekly=dailySelection(p,{...options,weekly:true});assert.ok(weekly.matches.length>=selected.matches.length);
 let seasonBytes=0;for(const id of ids)seasonBytes+=(await readFile('dist/snapshots/'+id+'-2026-27.json')).length;
 assert.ok(Buffer.byteLength(JSON.stringify(p))<seasonBytes/4,'Daily feed uses less than a quarter of full-season downloads');
 assert.ok(p.matches.every(m=>![m.homeBadge,m.awayBadge].some(b=>b?.startsWith('data:'))));
});
