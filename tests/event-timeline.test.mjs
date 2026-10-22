import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import{footballEvents}from'../dist/football-events.js';import{eventTimeline}from'../dist/event-timeline.js';
test('football timeline uses verified team IDs, compact participants and chronological periods',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('./fixtures/details.json',import.meta.url)))['soccer-summary'];
 raw.plays=[{id:'sub',team:{id:'1010'},type:{text:'Substitution'},clock:{displayValue:"63'"},period:{number:2},participants:[{type:'replacement',athlete:{displayName:'Incoming <script>'}},{type:'replaced',athlete:{displayName:'Outgoing'}}],text:'A long source commentary that should never be shown'}];
 const events=footballEvents(raw),sub=events.find(p=>p.kind==='substitution');assert.equal(sub.side,'away');assert.equal(sub.team,'OFI Crete');assert.equal(events.find(p=>p.kind==='goal').side,'home');
 const html=eventTimeline(events);assert.match(html,/event-side-away/);assert.match(html,/Incoming &lt;script&gt;/);assert.match(html,/↓ Outgoing/);assert.ok(!html.includes('long source commentary'));assert.ok(html.indexOf("14&#39;")<html.indexOf("63&#39;"));assert.match(html,/2ο ημίχρονο/);
});
test('unidentified incident stays neutral and does not default to the home team',()=>{
 const html=eventTimeline([{kind:'yellow',label:'Κίτρινη κάρτα',clock:'20′',order:2000,participants:[{name:'Player',role:''}]}]);assert.match(html,/event-side-unknown/);assert.ok(!html.includes('event-side-home'));
});
