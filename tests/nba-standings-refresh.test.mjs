import test from'node:test';
import assert from'node:assert/strict';
import{refreshNBAStandings}from'../dist/nba.js';
const now=Date.parse('2026-10-29T07:00:00Z');
const raw={children:['Eastern Conference','Western Conference'].map((name,c)=>({name,standings:{season:2027,entries:Array.from({length:15},(_,i)=>({team:{displayName:'Team '+c+'-'+i},stats:[{name:'wins',value:3},{name:'losses',value:2},{name:'playoffSeed',value:i+1},{name:'winPercent',value:.6}]}))}}))};
const payload={season:'2026-27',matches:[{id:'one',home:'Team 0-0',away:'Team 1-0',date:'2026-10-29',scoreState:'final',score:[100,90]}],standings:[{team:'Team 0-0',played:0}],sections:{standings:{lastSuccessAt:'2026-10-29T02:29:00Z'}}};
test('Opening an old NBA snapshot fetches current official standings and preserves fixtures',async()=>{
 const p=await refreshNBAStandings(payload,{now,fetchJSON:async()=>raw});
 assert.equal(p.standings.length,30);assert.equal(p.standings[0].played,5);assert.equal(p.sections.standings.lastSuccessAt,new Date(now).toISOString());assert.equal(p.sections.standings.status,'ok');assert.equal(p.matches,payload.matches);
});
test('Failed NBA refresh preserves the table and last successful check',async()=>{
 const p=await refreshNBAStandings(payload,{now,fetchJSON:async()=>{throw Error('HTTP 503');}});
 assert.equal(p.standings,payload.standings);assert.equal(p.sections.standings.lastSuccessAt,payload.sections.standings.lastSuccessAt);assert.equal(p.sections.standings.status,'failed');
});
test('Recent complete NBA standings avoid repeated requests, but lagging rows retry',async()=>{
 const fresh=await refreshNBAStandings(payload,{now,fetchJSON:async()=>raw});
 assert.equal(await refreshNBAStandings(fresh,{now:now+1000,fetchJSON:async()=>{throw Error('unexpected fetch');}}),fresh);
 let calls=0;await refreshNBAStandings({...payload,sections:fresh.sections},{now:now+1000,fetchJSON:async()=>{calls++;return raw;}});assert.equal(calls,1);
});
