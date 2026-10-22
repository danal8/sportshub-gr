import test from 'node:test';import assert from 'node:assert/strict';
import {footballEvents} from '../dist/football-events.js';
import {isFreshLive,mergeLiveMatches} from '../dist/live-scores.js';
test('goals, cards and substitutions merge across source arrays instead of hiding one another',()=>{
 const goal={id:'goal',type:{text:'Goal'},clock:{displayValue:"29'"},participants:[{athlete:{displayName:'Scorer'}}]},yellow={id:'yellow',type:{text:'Yellow Card'},clock:{displayValue:"45'+2"},participants:[{athlete:{displayName:'Booked'}}]},sub={id:'sub',type:{text:'Substitution'},clock:{displayValue:"63'"},participants:[{type:'replacement',athlete:{displayName:'Incoming'}},{type:'replaced',athlete:{displayName:'Outgoing'}}]};
 const rows=footballEvents({keyEvents:[goal],plays:[yellow,sub],header:{competitions:[{details:[goal]}]}});
 assert.equal(rows.length,3);assert.deepEqual(rows.map(r=>r.kind),['substitution','yellow','goal']);assert.match(rows[0].text,/Incoming/);assert.match(rows[0].text,/Outgoing/);assert.match(rows[2].text,/Scorer/);
});
test('only fresh genuine live scores are selected and missing live fixtures are merged once',()=>{
 const checkedAt=new Date().toISOString(),live={id:'espn-1',competition:'europa',date:'2026-10-22',home:'A',away:'B',score:[0,1],scoreState:'live',checkedAt};
 assert.ok(isFreshLive(live));assert.equal(isFreshLive({...live,checkedAt:'2020-01-01'}),false);assert.equal(isFreshLive({...live,scoreState:'final'}),false);
 const options={date:'2026-10-22',competitionIDs:['europa']};const merged=mergeLiveMatches([], [live],options);assert.equal(merged.length,1);assert.equal(mergeLiveMatches(merged,[live],options).length,1);assert.equal(mergeLiveMatches([],[live],{...options,competitionIDs:['cl']}).length,0);
});
