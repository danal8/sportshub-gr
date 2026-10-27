import test from'node:test';
import assert from'node:assert/strict';
import{statisticValue,isUpcomingMatch,loadMatchDetails}from'../dist/detail-data.js';
import{calculateTable}from'../dist/core.js';
import{footballStandings,loadFootballStandings,preferCompleteFootballStandings}from'../dist/football-leagues.js';
import{selectTVGuide}from'../dist/tv-guide.js';

test('ESPN football ratios become percentages without rescaling possession or formatted percentages',()=>{
 assert.equal(statisticValue({name:'passPct',displayValue:'0.6'}),'60%');
 assert.equal(statisticValue({name:'shotPct',displayValue:'1.0'}),'100%');
 assert.equal(statisticValue({name:'longballPct',displayValue:'0.5'}),'50%');
 assert.equal(statisticValue({name:'crossPct',displayValue:'0.0'}),'0%');
 assert.equal(statisticValue({name:'possessionPct',displayValue:'30.3'}),'30.3');
 assert.equal(statisticValue({name:'fieldGoalPct',displayValue:'45.5'}),'45.5');
 assert.equal(statisticValue({name:'passPct',displayValue:'60%'}),'60%');
 assert.equal(statisticValue({name:'passPct'}),null);
});
test('pregame EuroLeague details return the scheduled state without requesting unavailable statistics',async()=>{
 const m={competition:'el',date:'2099-10-27',time:'21:15',home:'Home',away:'Away'},old=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('Unexpected request');};
 try{const result=await loadMatchDetails(m);assert.equal(result.scheduled,true);assert.deepEqual(result.stats,[]);assert.equal(result.score,null);}finally{globalThis.fetch=old;}
 const now=new Date('2026-10-27T17:00:00Z');
 assert.equal(isUpcomingMatch({...m,date:'2026-10-27'},now),true);
 assert.equal(isUpcomingMatch({...m,date:'2026-10-27',time:'18:00'},now),false);
 assert.equal(isUpcomingMatch({...m,scoreState:'live'},now),false);
});
test('indicative standings count confirmed finals today and exclude live or unconfirmed scores',()=>{
 const matches=[{home:'A',away:'B',date:'2026-10-27',score:[2,0],scoreState:'final'},{home:'A',away:'C',date:'2026-10-26',score:[5,0],scoreState:'live'},{home:'B',away:'C',date:'2026-10-27',score:[1,0]}];
 const rows=calculateTable(matches,'2026-10-27');assert.equal(rows.find(r=>r.team==='A').points,3);assert.equal(rows.find(r=>r.team==='A').played,1);assert.equal(rows.find(r=>r.team==='C').played,0);
});
const rawTable=()=>({children:[{standings:{season:2026,entries:Array.from({length:20},(_,i)=>({team:{id:String(i),displayName:'Team '+i},stats:Object.entries({rank:i+1,gamesPlayed:8,wins:4,ties:2,losses:2,points:14}).map(([name,value])=>({name,value}))}))}}]});
test('alternative Premier League and La Liga tables require season, full coverage, unique IDs and valid records',async()=>{
 for(const id of['pl','laliga'])assert.equal(footballStandings(rawTable(),id).length,20);
 const p=await loadFootballStandings('pl',{fetchJSON:async url=>{assert.match(url,/eng\.1\/standings\?season=2026/);return rawTable();}});assert.equal(p.standings[0].played,8);
 const wrong=rawTable();wrong.children[0].standings.season=2025;assert.throws(()=>footballStandings(wrong,'pl'));
 const bad=rawTable();bad.children[0].standings.entries[0].stats.find(s=>s.name==='wins').value=9;assert.throws(()=>footballStandings(bad,'pl'));
 const duplicate=rawTable();duplicate.children[0].standings.entries[1].team.id='0';await assert.rejects(loadFootballStandings('pl',{fetchJSON:async()=>duplicate}));
});
test('retained TV guides expose refresh failures on their sources',()=>{
 const p={season:'2026-27',fallback:'offline',days:{'2026-10-27':{matches:[],sources:[{id:'nova'}]}}};assert.equal(selectTVGuide(p,'2026-10-27').sources[0].fallback,'offline');
});
test('standings fallback checks reconciled finals even when primary results and table lag together',async()=>{
 const matches=Array.from({length:80},(_,i)=>({id:String(i),date:'2026-10-26',home:'Team '+(i%20),away:'Team '+((i+1)%20),score:[1,0],scoreState:'final'}));
 const p={matches,standings:footballStandings(rawTable(),'pl').map(r=>({...r,played:6})),standingsSource:'https://primary.example/'};
 const next=await preferCompleteFootballStandings(p,'pl',{fetchJSON:async()=>rawTable()});
 assert.equal(next.standings[0].played,8);assert.match(next.standingsSource,/espn/);assert.equal(next.sections.standings.coverage.stale,false);
 assert.equal(await preferCompleteFootballStandings(p,'pl',{fetchJSON:async()=>{throw Error('offline');}}),p);
});
