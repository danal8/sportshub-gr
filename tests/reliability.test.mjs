import test from'node:test';import assert from'node:assert/strict';import{readFile,access}from'node:fs/promises';
import{parseNova,loadNova,novaURL}from'../dist/tv.js';import{nbaStandings}from'../dist/nba.js';import{loadProvider}from'../dist/providers.js';import{setBadgeCatalog,badgeSources}from'../dist/badges.js';
import{mergeScoreboard}from'../dist/scoreboard.js';
const broadcast=(time,title)=>`<div class="tv-broadcast row"><div class="time">${time}</div><div class="title">${title}</div><div class="subtitle">EuroLeague 2026/27</div></div>`;
test('TV parses date-specific AJAX fragments, excludes repeats, handles midnight and rejects wrong stamped date',()=>{
 const html='<div class="channel-title bold">Novasports Prime</div><div class="channel-program">'+broadcast('20:00','Α – Β (Ε)')+broadcast('22:00','Γ – Δ (Ζ)')+broadcast('01:00','Ε – Ζ (Z)')+'</div>';
 const p=parseNova(html,'2026-10-23');assert.equal(p.matches.length,2);assert.equal(p.matches[0].date,'2026-10-23');assert.equal(p.matches[1].date,'2026-10-24');assert.ok(novaURL('2026-10-23').endsWith('dt=2026-10-23'));assert.throws(()=>novaURL('../secret'));assert.throws(()=>parseNova('<input name="match-center-date" value="21-10-2026">'+html,'2026-10-23'));assert.throws(()=>parseNova('blocked','2026-10-23'));
});
test('TV CORS failure uses only the requested day snapshot and preserves actual check time',async()=>{
 const old=globalThis.fetch,urls=[];globalThis.fetch=async u=>{urls.push(u);if(u.startsWith('https:'))throw Error('CORS');return{ok:true,json:async()=>({date:'2026-10-23',matches:[],retrievedAt:'2026-10-21T00:00:00Z'})};};try{const p=await loadNova('2026-10-23');assert.equal(p.fallback,'CORS');assert.equal(p.retrievedAt,'2026-10-21T00:00:00Z');assert.equal(urls[1],'./snapshots/tv-2026-10-23.json');}finally{globalThis.fetch=old;}
});
test('Women have complete same-origin season data and never require a CORS-blocked federation request',async()=>{
 const p=JSON.parse(await readFile(new URL('../dist/snapshots/volley-w-2026-27.json',import.meta.url)));assert.equal(p.season,'2026-27');assert.equal(p.matches.length,132);assert.equal(new Set(p.matches.map(m=>m.id)).size,132);assert.equal(new Set(p.matches.map(m=>m.round)).size,22);
 const old=globalThis.fetch,urls=[];globalThis.fetch=async u=>{urls.push(u);return{ok:true,json:async()=>p};};try{assert.equal((await loadProvider('volley-w','2026-27')).matches.length,132);assert.ok(urls.every(u=>u.startsWith('./')));}finally{globalThis.fetch=old;}
});
test('All 14 Super League teams resolve to real local badge files',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../dist/badges/catalog.json',import.meta.url)));setBadgeCatalog(catalog);const p=JSON.parse(await readFile(new URL('../dist/snapshots/sl-2026-27.json',import.meta.url)));const names=new Set(p.matches.flatMap(m=>[m.home,m.away]));assert.equal(names.size,14);for(const name of names){const b=badgeSources(name,null,'sl','football');assert.ok(b.src?.startsWith('./badges/'),name);await access(new URL('../dist/'+b.src.slice(2),import.meta.url));}
});
test('NBA snapshot has 30 teams in two ranked conferences, correct season, and no invented points',async()=>{
 const p=JSON.parse(await readFile(new URL('../dist/snapshots/nba-2026-27.json',import.meta.url)));assert.equal(p.season,'2026-27');assert.equal(p.standings.length,30);assert.equal(new Set(p.standings.map(r=>r.group)).size,2);assert.ok(p.standings.every(r=>r.played===r.wins+r.losses&&r.winRate.endsWith('%')&&r.points===null));assert.throws(()=>nbaStandings({children:[]}));assert.throws(()=>nbaStandings({children:[{standings:{season:2026,entries:[]}}]}));
});
test('Greek LiveScore matches aliases, preserves fixture IDs, and accepts only explicit live or final scores',()=>{
 const matches=[{id:'fixture-1',home:'Olympiakos Piraeus',away:'PAOK',date:'2026-10-24',score:null}];
 const raw=state=>({leagues:[{season:{year:2026}}],events:[{date:'2026-10-24T18:00:00Z',competitions:[{status:{type:state},competitors:[{homeAway:'home',team:{displayName:'Olympiacos'},score:'2'},{homeAway:'away',team:{displayName:'PAOK Thessaloniki'},score:'1'}]}]}]});
 assert.equal(mergeScoreboard(matches,raw({state:'pre',completed:false}))[0].score,null);
 let m=mergeScoreboard(matches,raw({state:'in',completed:false}))[0];assert.equal(m.id,'fixture-1');assert.deepEqual(m.score,[2,1]);assert.equal(m.scoreState,'live');assert.equal(m.time,'21:00');
 assert.equal(mergeScoreboard(matches,raw({state:'post',completed:true}))[0].scoreState,'final');assert.throws(()=>mergeScoreboard(matches,{leagues:[{season:{year:2025}}]}));assert.equal(matches[0].score,null);
});
