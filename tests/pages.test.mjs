import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadProvider} from '../dist/providers.js';
import {parseMen} from '../scripts/refresh-pages.mjs';
test('Pages schedules have complete unique fixtures in the requested season',async()=>{
 for(const [id,count,rounds] of [['sl2',240,30],['elite',240,30],['gbl',182,26],['volley-m',132,22]]){
  const p=JSON.parse(await readFile(new URL(`../docs/snapshots/${id}-2026-27.json`,import.meta.url)));
  assert.equal(p.season,'2026-27');assert.equal(p.matches.length,count);assert.equal(new Set(p.matches.map(m=>m.id)).size,count);assert.equal(new Set(p.matches.map(m=>m.round)).size,rounds);assert.ok(p.retrievedAt);assert.ok(p.source.startsWith('https://'));
  assert.ok(p.matches.every(m=>m.homeBadge?.startsWith('https://')&&m.awayBadge?.startsWith('https://')));
 }
});
test('Static schedules retain a dated offline copy for the Android PWA',async()=>{
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,cache=new Map();globalThis.localStorage={getItem:k=>cache.get(k),setItem:(k,v)=>cache.set(k,v)};
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({season:'2026-27',retrievedAt:'2026-10-20T12:00:00Z',matches:[{id:'offline'}]})});await loadProvider('gbl','2026-27');globalThis.fetch=async()=>{throw Error('offline');};const p=await loadProvider('gbl','2026-27');assert.equal(p.matches[0].id,'offline');assert.equal(p.fallback,'offline');assert.equal(p.retrievedAt,'2026-10-20T12:00:00Z');}finally{globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;}
});
test('Pages providers use official SL2 or same-origin schedules and reject other seasons',async()=>{
 const old=globalThis.fetch;const urls=[];globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>({season:'2026-27',matches:[{id:1}]})};};
 try{for(const id of ['sl2','elite','gbl','volley-m'])await loadProvider(id,'2026-27');assert.ok(urls.every(u=>u.startsWith('./snapshots/')||u==='https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/matches'));await assert.rejects(loadProvider('gbl','2025-26'));}finally{globalThis.fetch=old;}
});
test('Men parser rejects missing season and partial official layouts',()=>{assert.throws(()=>parseMen('<div class="itemFullText">2025-26</div>'));assert.throws(()=>parseMen('<div class="itemFullText">2026-27<br>1η αγωνιστική<br>A - B</div>'));});
test('Public provider never references the old private service',async()=>{for(const dir of ['dist','docs']){const s=await readFile(new URL(`../${dir}/providers.js`,import.meta.url),'utf8');assert.ok(!s.includes('chatgpt.site'));assert.ok(!s.includes('elite-personal-'));}});
