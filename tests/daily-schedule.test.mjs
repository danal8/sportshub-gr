import test from'node:test';import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{dailySelection,loadDailySchedule}from'../dist/daily-schedule.js';
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
test('Offline daily schedules retain fixtures without claiming LIVE',async()=>{
 const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage,values=new Map(),now=new Date().toISOString();
 const p={season:'2026-27',retrievedAt:now,start:'2026-10-17',end:'2026-11-07',sources:[{id:'nba'}],matches:[{competition:'nba',date:'2026-10-24',home:'A',away:'B',score:[10,8],scoreState:'live',scoreCheckedAt:now}]};
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};globalThis.fetch=async()=>({ok:true,json:async()=>p});
 try{const options={season:'2026-27',date:'2026-10-24',competitionIDs:['nba']};await loadDailySchedule(options,{force:true});assert.ok(values.has('sh-data-daily-2026-27'));globalThis.fetch=async()=>{throw Error('Offline')};const result=await loadDailySchedule(options,{force:true});assert.equal(result.matches.length,1);assert.equal(result.matches[0].scoreState,'current');assert.equal(result.sources[0].fallback,'Offline');}finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;}
});
