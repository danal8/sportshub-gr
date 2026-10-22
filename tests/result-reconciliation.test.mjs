import test from'node:test';import assert from'node:assert/strict';
import{applyLiveScores,parseLiveScoreboard,mergeLiveMatches}from'../dist/live-scores.js';
import{sameResultMatch,preserveConfirmedResults,resultCoverage,synchronizeDetailScore}from'../dist/result-reconciliation.js';
import{rememberConfirmedResults,loadProvider}from'../dist/providers.js';
const at='2026-10-22T19:00:00Z',now=Date.parse(at),match={id:'open-1',competition:'europa',date:'2026-10-22',home:'FC Ararat-Armenia',away:'AZ Alkmaar',homeIDs:{openliga:'8876'},awayIDs:{openliga:'727'}},entry={id:'espn-1',competition:'europa',date:match.date,home:'Ararat-Armenia',away:match.away,homeIDs:{espn:'1'},awayIDs:{espn:'2'},eventIDs:{espn:'123'},score:[0,4],scoreState:'final',checkedAt:at,source:'https://www.espn.com/soccer/',provider:'ESPN'};
test('verified source names learn stable IDs, then renamed teams still resolve',()=>{
 const m=applyLiveScores([match],[entry],now)[0];assert.deepEqual(m.score,[0,4]);assert.deepEqual(m.homeIDs,{openliga:'8876',espn:'1'});assert.equal(m.eventIDs.espn,'123');
 assert.equal(sameResultMatch(m,{...entry,home:'Renamed team',away:'Renamed opponent'}),true);
 for(const x of [{...entry,homeIDs:{espn:'9'}},{...entry,eventIDs:{espn:'different'}},{...entry,competition:'conference'},{...entry,date:'2026-10-23'},{...entry,home:entry.away,away:entry.home,homeIDs:entry.awayIDs,awayIDs:entry.homeIDs}])assert.equal(sameResultMatch(m,x),false);
});
test('Torreense and other league spellings match without fuzzy club-name guesses',()=>{
 assert.ok(sameResultMatch({...match,home:'Ferencváros Budapest',away:'SC União Torreense'},{...entry,home:'Ferencvaros',away:'Torreense'}));
 assert.equal(sameResultMatch({...match,home:'Ararat Yerevan'},entry),false);
 assert.ok(sameResultMatch({...match,competition:'pl',home:'Everton FC',away:'Chelsea FC'},{...entry,competition:'pl',home:'Everton',away:'Chelsea'}));
});
test('final survives newer live, empty, failed and stale primary responses; corrected final is accepted',()=>{
 const m=applyLiveScores([match],[entry],now)[0];for(const score of [null,[0,0]])assert.deepEqual(applyLiveScores([m],[{...entry,score,scoreState:'live',checkedAt:'2026-10-22T19:00:30Z'}],now+30000)[0].score,[0,4]);
 assert.deepEqual(applyLiveScores([m],[{...entry,score:[0,5],checkedAt:'2026-10-22T18:00:00Z'}],now)[0].score,[0,4]);
 assert.deepEqual(applyLiveScores([m],[{...entry,score:[0,5],checkedAt:'2026-10-22T19:00:30Z'}],now+30000)[0].score,[0,5]);
 const old={season:'2026-27',retrievedAt:at,matches:[m]},fresh={season:'2026-27',retrievedAt:'2026-10-22T19:05:00Z',matches:[{...match,score:null,scoreState:'current'}]};assert.deepEqual(preserveConfirmedResults(fresh,old,'europa').matches[0].score,[0,4]);assert.equal(preserveConfirmedResults({...fresh,season:'2027-28'},old,'europa').matches[0].score,null);
});
test('ambiguous fixtures and duplicate source entries fail closed and appear in coverage',()=>{
 assert.equal(applyLiveScores([match],[entry,entry],now)[0].score,undefined);assert.equal(applyLiveScores([match,{...match,id:'second'}],[entry],now)[0].score,undefined);
 assert.equal(resultCoverage([match,{...match,id:'second'}],[entry],'2026-10-22').unmatchedResults.length,1);
});
test('new source finals absent from the schedule appear once and survive a later incomplete schedule',()=>{
 const result=mergeLiveMatches([], [entry],{date:match.date,competitionIDs:['europa']});assert.equal(result.length,1);assert.equal(mergeLiveMatches(result,[entry],{date:match.date,competitionIDs:['europa']}).length,1);
 assert.equal(preserveConfirmedResults({season:'2026-27',matches:[]},{season:'2026-27',retrievedAt:at,matches:result},'europa').matches.length,1);
});
test('summary statistics can lag while the modal header immediately uses the current scoreboard',()=>{
 const stats=[{home:1,away:0}],data={score:[0,0],scoreState:'live',checkedAt:at,stats},m={score:[2,1],scoreState:'live',scoreClock:'67′',scoreCheckedAt:at};
 const result=synchronizeDetailScore(data,m,now);assert.deepEqual(result.score,[2,1]);assert.equal(result.clock,'67′');assert.equal(result.stats,stats);assert.equal(result.checkedAt,at);
 assert.deepEqual(synchronizeDetailScore({...data,scoreState:'final',score:[3,1]},m,now).score,[3,1]);assert.deepEqual(synchronizeDetailScore(data,m,now+90000).score,[0,0]);
});
test('confirmed browser result survives a reload with a scoreless provider snapshot',async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const fresh={...entry,checkedAt:new Date().toISOString()};rememberConfirmedResults([fresh]);
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('catalog')?{teams:{},urls:{}}:{season:'2026-27',retrievedAt:new Date().toISOString(),matches:[{...match,score:null,scoreState:'current'}]}});
 try{const p=await loadProvider('europa','2026-27');assert.deepEqual(p.matches[0].score,[0,4]);assert.equal(p.matches[0].scoreState,'final');}finally{globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;}
});
