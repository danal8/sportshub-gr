import test from'node:test';import assert from'node:assert/strict';import{normalizeSL2}from'../worker/sl2.mjs';
test('SL2 rejects partial feeds and does not expose scores or logos',()=>{
 assert.throws(()=>normalizeSL2([],[]),/πλήρη/);
 const games=Array.from({length:240},(_,i)=>({id:i,competition_slug:'sl2-2627',matchday_el:`${1+Math.floor(i/8)}η Αγωνιστική`,home_team:{name_el:'Α',logo:'secret'},away_team:{name_el:'Β'},date:'2026-10-20',time:'16:00:00',channel:'ERT',home_score:2,away_score:1,minute:50}));
 const table=Array.from({length:16},(_,i)=>({position:i+1,team:{name_el:'Ομάδα '+i},matches:7,wins:3,draws:2,losses:2,points:11}));
 const out=normalizeSL2(games,table);assert.equal(out.matches.length,240);assert.equal(out.standings.length,16);assert.equal(out.matches[0].time,'16:00');assert.equal(out.matches[0].channel,'ERT');assert.equal(out.matches[0].home_score,undefined);assert.equal(out.matches[0].minute,undefined);assert.equal(out.matches[0].logo,undefined);
 games[239].id=0;assert.throws(()=>normalizeSL2(games,table),/πλήρες/);
});
