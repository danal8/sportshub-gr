import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{footballStandings,loadFootballStandings,preferCompleteFootballStandings}from'../dist/football-leagues.js';
const europa=JSON.parse(await readFile(new URL('./fixtures/uefa.europa-standings.json',import.meta.url))),conference=JSON.parse(await readFile(new URL('./fixtures/uefa.europa.conf-standings.json',import.meta.url)));
test('Europa and Conference return their complete 36-team league-phase tables',async()=>{
 for(const [id,raw]of[['europa',europa],['conference',conference]]){
  const p=await loadFootballStandings(id,{fetchJSON:async url=>{assert.match(url,/standings\?season=2026/);return raw;}});assert.equal(p.standings.length,36);assert.equal(new Set(p.standings.map(r=>r.sourceTeamID)).size,36);
 }
 assert.throws(()=>footballStandings(europa,'conference'));assert.throws(()=>footballStandings(conference,'europa'));
 const old=structuredClone(conference);old.season.year=2025;assert.throws(()=>footballStandings(old,'conference'));
 const partial=structuredClone(conference);partial.children[0].standings.entries.pop();assert.throws(()=>footballStandings(partial,'conference'));
});
test('Conference qualifying matches do not prevent loading its league-phase table',async()=>{
 const p={matches:[{id:'qualifier',date:'2026-07-10',home:'Qualifier A',away:'Qualifier B',score:[1,0],scoreState:'final'}],standings:[]};
 const next=await preferCompleteFootballStandings(p,'conference',{fetchJSON:async()=>conference});assert.equal(next.standings.length,36);
 const retained=await preferCompleteFootballStandings(next,'conference',{force:true,fetchJSON:async()=>{throw Error('offline');}});assert.deepEqual(retained.standings,next.standings);
});
test('match standings belong only to their own tab and show the full table immediately',async()=>{
 const code=await readFile(new URL('../dist/detail-panels.js',import.meta.url),'utf8');
 assert.match(code,/\['events','Εξέλιξη'\],\['standings','Βαθμολογία'\]/);
 assert.match(code,/if\(card.tab==='standings'\)return standingsBody\(card\)/);
 assert.doesNotMatch(code,/teams\+score\+standingsBody|teams\+standingsBody|draw\(sides\)|Πλήρης βαθμολογία διοργάνωσης/);
 assert.match(code,/draw\(table.rows\)/);
});
