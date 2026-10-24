import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{parseGblWidget,verifiedGblEntries}from'../dist/gbl-scores.js';import{applyLiveScores,isFreshLive}from'../dist/live-scores.js';
const script=await readFile(new URL('./fixtures/gbl-widget.js.txt',import.meta.url),'utf8'),matches=JSON.parse(await readFile(new URL('../dist/snapshots/gbl-2026-27.json',import.meta.url))).matches.map(m=>({...m,competition:'gbl',score:null,scoreState:null})),at='2026-10-24T17:09:49Z';
test('Official GBL fixture IDs match all live and final matches with verified season and orientation',()=>{
 const p=parseGblWidget(script,matches,{today:'2026-10-24',checkedAt:at});assert.equal(p.unmatched.length,0);assert.equal(p.entries.length,5);
 assert.deepEqual(p.entries.find(m=>m.id==='gbl-BD2162B8').score,[65,62]);const live=p.entries.find(m=>m.id==='gbl-8645D767');assert.equal(live.scoreState,'live');assert.equal(live.clock,'4η περ. · 03:07');assert.ok(isFreshLive(live,Date.parse(at)));
 const changed=applyLiveScores(matches,p.entries,Date.parse(at));assert.equal(changed.find(m=>m.id===live.id).scoreState,'live');assert.equal(changed.find(m=>m.id==='gbl-BD2162B8').scoreState,'final');assert.equal(changed.length,matches.length);
 assert.equal(parseGblWidget(script.replaceAll('2026-2027','2025-2026'),matches,{today:'2026-10-24'}).entries.length,0);
 assert.equal(parseGblWidget(script,[...matches,matches.find(m=>m.id===live.id)],{today:'2026-10-24'}).unmatched.length,1);
 assert.throws(()=>parseGblWidget('bad source',matches));
 const payload={season:'2026-27',provider:'ΕΣΑΚΕ / Genius Sports',entries:p.entries};const stale=verifiedGblEntries(payload,matches,Date.parse(at)+120000);assert.equal(stale.find(m=>m.id===live.id).scoreState,'current');assert.equal(stale.find(m=>m.id==='gbl-BD2162B8').scoreState,'final');
 assert.equal(verifiedGblEntries({...payload,entries:[{...live,home:live.away,away:live.home}]},matches,Date.parse(at)).length,0);
 assert.equal(verifiedGblEntries({...payload,entries:[{...live,checkedAt:'2026-10-25T00:00:00Z'}]},matches,Date.parse(at)).length,0);
});
