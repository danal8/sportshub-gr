import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{buildTVGuide}from'../scripts/build-tv-guide.mjs';import{selectTVGuide}from'../dist/tv-guide.js';
test('Compact TV guide preserves all configured sources, dates and channels without exposing scores',async()=>{
 const p=await buildTVGuide(),dates=Object.keys(p.days);assert.ok(dates.length>=7);
 for(const date of dates){const day=selectTVGuide(p,date);assert.ok(day);assert.ok(day.sources.some(s=>s.id==='greek-cup'));assert.ok(day.sources.length>=6);assert.ok(day.matches.every(m=>m.date===date&&m.time&&m.channel&&m.live&&!('score'in m)&&!('scoreState'in m)));let nova={matches:[]};try{nova=JSON.parse(await readFile('dist/snapshots/tv-'+date+'.json','utf8'));}catch{}for(const m of nova.matches.filter(m=>m.date===date&&m.time&&m.channel&&m.live))assert.ok(day.matches.some(x=>x.id===m.id));
 for(const id of ['elite','gbl','sl2','volley-w','volley-m','greek-cup']){const source=JSON.parse(await readFile('dist/snapshots/'+id+'-2026-27.json','utf8'));assert.equal(day.matches.filter(m=>m.competition===id&&m.id.startsWith('tv-')).length,source.matches.filter(m=>m.date===date&&m.time&&m.channel).length);}
 const pl=selectTVGuide(p,date,'pl');assert.ok(pl.matches.every(m=>m.competition==='pl'));}
 assert.equal(selectTVGuide(p,'2099-01-01'),null);assert.equal(selectTVGuide({...p,season:'2025-26'},dates[0]),null);
 // Live schedules grow with the number of days and broadcasts. Bound each
 // record instead of rejecting a valid guide when its total passes 150 KB.
 for(const [date,day] of Object.entries(p.days)){
  for(const source of day.sources)assert.ok(Buffer.byteLength(JSON.stringify(source))<4096,`Oversized TV source ${date}/${source.id}`);
  for(const match of day.matches)assert.ok(Buffer.byteLength(JSON.stringify(match))<4096,`Oversized TV match ${date}/${match.id}`);
  const budget=1024+4096*(day.sources.length+day.matches.length);
  assert.ok(Buffer.byteLength(JSON.stringify(day))<budget,`Oversized TV day ${date}`);
 }
});
