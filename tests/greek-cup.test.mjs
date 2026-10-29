import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{parseCupSchedule,parseCupResult,refreshGreekCup,cupSeedURL,cupNewsURL}from'../scripts/refresh-greek-cup.mjs';
import{broadcastDetails}from'../dist/tv-meta.js';import{competitions}from'../dist/data.js';import{orderedCompetitions}from'../dist/competition-order.js';import{dailySelection}from'../dist/daily-schedule.js';import{selectTVGuide}from'../dist/tv-guide.js';
const html='<h1>Κύπελλο Ελλάδας: η ώρα της 4ης αγωνιστικής</h1><h5>Τετάρτη 28 Οκτωβρίου 2026</h5><ul><li>17:30, ΟΑΚΑ: Παναθηναϊκός – Άρης (ΣΚΑΪ / ΣΠΟΡ FM TV 1)</li></ul>';
test('Greek Cup is separate from Super League 2 and has schedule/TV filters without an invented table',()=>{
 for(const label of['Superbet Κύπελλο Ελλάδας','Superbet Κυπέλλου Ελλάδος','ΚΥΠΕΛΛΟ ΕΛΛΑΔΑΣ','Greek Cup'])assert.equal(broadcastDetails(label).competition,'greek-cup');assert.equal(broadcastDetails('Superbet').competition,'other');assert.equal(broadcastDetails('Super League 2').competition,'sl2');
 for(const tab of['football','tv','matches'])assert.ok(orderedCompetitions(competitions,tab).some(c=>c.id==='greek-cup'));assert.ok(!orderedCompetitions(competitions,'standings').some(c=>c.id==='greek-cup'));
});
test('EPO schedule requires explicit date, time, oriented teams, channel and the current season',()=>{
 const [m]=parseCupSchedule(html,cupSeedURL);assert.equal(m.date,'2026-10-28');assert.equal(m.home,'Παναθηναϊκός');assert.equal(m.away,'Άρης');assert.equal(m.channel,'ΣΚΑΪ / ΣΠΟΡ FM TV 1');assert.equal(m.score,null);
 for(const bad of[html.replace('2026','2025'),html.replace('ΣΚΑΪ / ΣΠΟΡ FM TV 1',''),html.replace('17:30','27:99'),html.replace('Κύπελλο Ελλάδας','Super League')])assert.equal(parseCupSchedule(bad,cupSeedURL).length,0);
});
test('Cup results require the article date and Cup context, and cannot infer a score from the programme',()=>{
 const result='<h1>Παναθηναϊκός - Άρης 2-1</h1><p class="epo-cta">28 / 10 / 2026</p><div class="field--name-field-intro">Στο Κύπελλο Ελλάδας</div>';
 assert.deepEqual(parseCupResult(result,'url').score,[2,1]);assert.equal(parseCupResult(result.replace('Κύπελλο Ελλάδας','Πρωτάθλημα'),'url'),null);assert.equal(parseCupResult(html,'url'),null);
});
test('Cup refresh discovers newly published schedules and keeps verified fixtures during an outage',async()=>{
 const url='https://www.epo.gr/el/arthra/kypello-programma-5is',news='<a href="/el/arthra/kypello-programma-5is">Πρόγραμμα</a>';
 const p=await refreshGreekCup({fetchText:async u=>u===cupNewsURL?news:u===url?html.replace('4ης','5ης').replace('28 Οκτωβρίου','4 Νοεμβρίου'):html});
 assert.equal(p.matches.length,2);assert.ok(p.matches.some(m=>m.date==='2026-11-04'));const offline=await refreshGreekCup({previous:p,fetchText:async()=>{throw Error('offline');}});assert.deepEqual(offline.matches,p.matches);assert.equal(offline.sections.matches.status,'failed');assert.equal(offline.sections.matches.lastSuccessAt,p.sections.matches.lastSuccessAt);
});
test('All five 28 October Cup fixtures and today’s fixture reach both published daily and TV guides',async()=>{
 const daily=JSON.parse(await readFile('docs/snapshots/daily-2026-27.json','utf8')),tv=JSON.parse(await readFile('docs/snapshots/tv-guide-2026-27.json','utf8'));
 for(const [date,n]of[['2026-10-28',5],['2026-10-29',1]]){const d=dailySelection(daily,{season:'2026-27',date,competitionIDs:['greek-cup']}),t=selectTVGuide(tv,date,'greek-cup');assert.equal(d.matches.length,n);assert.equal(t.matches.length,n);assert.ok(t.matches.every(m=>m.channel&&m.live&&!('score'in m)));if(n===5)assert.ok(d.matches.every(m=>m.scoreState==='final'));}
});
