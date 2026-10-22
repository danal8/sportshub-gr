import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTeamRoster,parseEuroRoster,photoCandidates} from '../dist/detail-data.js';
const fixture=JSON.parse(await readFile(new URL('./fixtures/details.json',import.meta.url)));
test('European roster resolves from official clubs without fixture aliases or overview records',async()=>{
 const old=globalThis.fetch,urls=[],rows=fixture['euro-roster'],club=rows[0].club;
 globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>url.endsWith('/clubs')?{data:[club],total:1}:url.includes('2025')?[]:rows};};
 try{const r=await loadTeamRoster(club.name,{id:'el',sport:'basketball'},{records:[]},{force:true});assert.ok(r.players.length);assert.ok(urls.some(url=>url.endsWith('/E2026/clubs')));assert.ok(urls.some(u=>u.includes('/clubs/'+club.code+'/people')));assert.ok(r.players.every(p=>rows.some(x=>x.active&&x.person.code===p.id)));}finally{globalThis.fetch=old;}
});
test('portrait alternatives skip unsafe primary and retain valid source images',()=>{
 const a='https://images.euroleague.net/a.png',b='https://media-cdn.cortextech.io/b.png';
 assert.deepEqual(photoCandidates('javascript:alert(1)',a,{href:b},a),[a,b]);
 const row=structuredClone(fixture['euro-roster'].find(r=>r.type==='J'));row.images={headshot:'https://evil.test/a.png',action:b};
 assert.equal(parseEuroRoster([row],row.club.name,row.club.code,'E','2026-10-22').players[0].photo,b);
});
test('daily list is committed once after delayed providers complete',async()=>{
 const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const body=app.slice(app.indexOf('async function loadDaily('),app.indexOf('\nasync function load(force='));
 const state={season:'2026-27',id:'all-matches',request:1},cache=new Map(),renders=[];
 const competitions=[{id:'fast'},{id:'slow'}];let finishSlow;
 const slow=new Promise(resolve=>{finishSlow=resolve;});
 const loadProvider=async id=>{if(id==='slow')await slow;return{matches:[{id}]};};
 const fn=new Function('state','competitions','scheduleCache','render','notify','isConnected','loadProvider','scheduleEntries','directIDs',body+';return loadDaily;');
 const load=fn(state,competitions,cache,()=>renders.push(state.matches.map(m=>m.id)),()=>{},()=>true,loadProvider,p=>p.matches,[]);
 const task=load(1,false);await new Promise(resolve=>setImmediate(resolve));assert.equal(cache.size,1);assert.equal(renders.length,0);
 finishSlow();await task;assert.deepEqual(renders,[['fast','slow']]);
});

