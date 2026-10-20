import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateTable,normalizeFootball,filterMatches,chooseRound,escapeHTML,athensDay,validateFootball,shiftDay} from '../dist/core.js';
import {eliteMatches,broadcasts,currentTV,gblStandings,competitions} from '../dist/data.js';
test('table excludes current day, future and incomplete results; uses 3/1/0 points',()=>{
 const matches=[{home:'A',away:'B',date:'2026-10-01',score:[2,0]},{home:'B',away:'C',date:'2026-10-02',score:[1,1]},{home:'C',away:'A',date:'2026-10-20',score:[9,0]},{home:'A',away:'C',date:'2026-10-21',score:[0,1]},{home:'C',away:'B',date:'2026-10-03'}];
 const t=calculateTable(matches,'2026-10-20');assert.deepEqual(t.map(x=>[x.team,x.points,x.played]),[['A',3,1],['C',1,1],['B',1,2]]);
});
test('source malformed data is rejected rather than rendered as matches',()=>{assert.throws(()=>validateFootball({matches:[]}));assert.throws(()=>normalizeFootball({name:'X',matches:[{team1:'A',team2:'B',date:'2026-01-01',round:'Matchday 1',score:{ft:['2',0]}}]},'x'));});
test('untrusted team names are escaped',()=>assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
test('round, team and favorites filters compose',()=>{const m=[{id:'1',round:'4',home:'ΠΑΟΚ',away:'Άρης'},{id:'2',round:'5',home:'ΠΑΟΚ',away:'ΑΕΚ'}];assert.equal(filterMatches(m,{round:'4',search:'παοκ',favoritesOnly:true,favorites:['1']}).length,1);assert.equal(filterMatches(m,{favoritesOnly:true,favorites:[]}).length,0);assert.equal(chooseRound([{round:'1',date:'2026-10-10'},{round:'2',date:'2026-10-21'}],'2026-10-20'),'2');});
test('Athens date uses Greece rather than browser timezone',()=>assert.equal(athensDay(new Date('2026-10-19T22:30:00Z')),'2026-10-20'));
test('daily TV selection does not mix dates; day stepping crosses months and DST',()=>{assert.equal(filterMatches([{date:'2026-10-19',home:'A',away:'B'}],{date:'2026-10-19'}).length,1);assert.equal(filterMatches(broadcasts,{date:'2026-10-20'}).length,0);assert.equal(shiftDay('2026-10-31',1),'2026-11-01');assert.equal(shiftDay('2026-10-25',-1),'2026-10-24');});
test('public source does not bundle personal-use source extracts',()=>{assert.deepEqual([broadcasts,currentTV,gblStandings,eliteMatches].map(x=>x.length),[0,0,0,0]);});
test('bundled openfootball extracts validate for the declared season',async()=>{for(const c of competitions.filter(c=>c.file)){const payload=JSON.parse(await readFile(new URL(`../dist/snapshots/2026-27-${c.file}.json`,import.meta.url)));assert.ok(payload.source.includes('2026-27'));assert.ok(payload.retrievedAt);assert.ok(normalizeFootball(payload.data,c.id).length>300);}});
test('PWA assets, icon dimensions and relative paths exist',async()=>{const root=new URL('../dist/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root)));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');for(const i of manifest.icons){const b=await readFile(new URL(i.src,root));assert.equal(b.readUInt32BE(16),Number(i.sizes.split('x')[0]));}const sw=await readFile(new URL('sw.js',root),'utf8');const assets=sw.match(/const ASSETS=\[(.*?)\]/s)[1].matchAll(/'([^']+)'/g);for(const [,asset]of assets)await readFile(new URL(asset==='./'?'index.html':asset,root));});
