import test from'node:test';import assert from'node:assert/strict';
import{loadNationalTeams}from'../dist/national-teams.js';
import{competitions}from'../dist/data.js';import{isConnected}from'../dist/providers.js';import{broadcastDetails}from'../dist/tv-meta.js';
const game=(date='2026-11-12T17:00Z')=>({id:'123',date,status:{type:{state:'pre',completed:false}},competitions:[{competitors:[{homeAway:'home',team:{id:'1',displayName:'Türkiye'},score:'0'},{homeAway:'away',team:{id:'2',displayName:'Belgium'},score:'0'}]}]});
test('National teams are available in football and matches, and Nations TV shares the competition',()=>{
 for(const id of ['nations','friendly']){assert.equal(isConnected(id),true);assert.equal(competitions.find(c=>c.id===id)?.sport,'football');}
 assert.equal(broadcastDetails('UEFA Nations League 2026/27').competition,'nations');
});
test('National schedule deduplicates fixtures, respects Athens time and never invents scheduled scores',async()=>{
 let calls=0;const p=await loadNationalTeams('nations','2026-27',{fetchJSON:async()=>{calls++;return{leagues:[{slug:'uefa.nations',season:{year:2026}}],events:[game()]};}});
 assert.equal(calls,12);assert.equal(p.matches.length,1);assert.equal(p.matches[0].date,'2026-11-12');assert.equal(p.matches[0].time,'19:00');assert.equal(p.matches[0].score,null);assert.equal(p.matches[0].eventIDs.espn,'123');
});
test('Rejects a different league rather than assigning its matches to national teams',async()=>{
 await assert.rejects(loadNationalTeams('nations','2026-27',{fetchJSON:async()=>({leagues:[{slug:'eng.1'}],events:[]})}));
});
test('Friendlies accept next calendar year within the selected season',async()=>{
 const p=await loadNationalTeams('friendly','2026-27',{fetchJSON:async()=>({leagues:[{slug:'fifa.friendly',season:{year:2027}}],events:[game('2027-03-12T17:00Z')]})});assert.equal(p.matches[0].date,'2027-03-12');
});
