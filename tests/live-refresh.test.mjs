import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {refreshLiveData,hasExpectedLiveGame} from '../scripts/refresh-live-scores.mjs';

const now=new Date('2026-10-30T22:38:00Z'); // 00:38 on 31 October in Athens.
const previous={season:'2026-27',provider:'SportsHub live relay',checkedAt:'2026-10-30T20:00:00Z',entries:[]};
const match={id:'pl-test',date:'2026-10-30',time:'23:00',home:'Manchester United FC',away:'AFC Bournemouth'};
const empty=url=>{const sport=Number(String(url).match(/feed\/f_(\d+)_/)[1]);return new Response('SA÷'+sport+'¬');};
async function setup(t,matches=[]){
 const dir=await mkdtemp(join(tmpdir(),'sportshub-live-test-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const snapshotRoot=pathToFileURL(dir+'/');
 await writeFile(new URL('pl-2026-27.json',snapshotRoot),JSON.stringify({season:'2026-27',matches}));
 await writeFile(new URL('live-scores.json',snapshotRoot),JSON.stringify(previous));
 return {snapshotRoot,now};
}
test('Healthy empty feeds finish idle without replacing the last publication',async t=>{
 const options=await setup(t,[{...match,date:'2026-10-31',time:'15:00'}]),calls=[];
 const payload=await refreshLiveData({...options,fetchImpl:async url=>{calls.push(url);return empty(url);}});
 assert.equal(payload,null);assert.equal(calls.length,6);
 assert.deepEqual(JSON.parse(await readFile(new URL('live-scores.json',options.snapshotRoot))),previous);
});
test('A match starting yesterday remains in the live window after Athens midnight',()=>{
 assert.equal(hasExpectedLiveGame([match],now),true);
 assert.equal(hasExpectedLiveGame([{...match,scoreState:'final'}],now),false);
 assert.equal(hasExpectedLiveGame([{...match,time:'16:00'}],now),false);
});
test('Midnight refresh fetches yesterday and publishes its verified match',async t=>{
 const options=await setup(t,[match]),calls=[];
 const feed='SA÷1¬~ZA÷ENGLAND: Premier League¬ZL÷/football/england/premier-league/¬~AA÷test123¬AD÷'+Date.parse('2026-10-30T21:00:00Z')/1000+'¬AB÷2¬AC÷13¬AO÷'+Date.parse('2026-10-30T21:45:00Z')/1000+'¬AE÷Manchester United FC¬AF÷AFC Bournemouth¬AG÷1¬AH÷2¬';
 const p=await refreshLiveData({...options,fetchImpl:async url=>{calls.push(String(url));return String(url).includes('/f_1_-1_')?new Response(feed):empty(url);}});
 assert.ok(calls.some(url=>url.includes('/f_1_-1_')));
 assert.deepEqual(p.entries.find(m=>m.id===match.id).score,[1,2]);
 assert.equal(p.entries.find(m=>m.id===match.id).date,'2026-10-30');
 assert.equal(p.entries.find(m=>m.id===match.id).scoreCheckedAt,now.toISOString());
});
test('Empty scores during an active window remain an error and preserve old data',async t=>{
 const options=await setup(t,[match]);
 await assert.rejects(refreshLiveData({...options,fetchImpl:async url=>empty(url)}),/active game window/);
 assert.deepEqual(JSON.parse(await readFile(new URL('live-scores.json',options.snapshotRoot))),previous);
});
test('Network and malformed feed failures never become successful idle checks',async t=>{
 const options=await setup(t);
 for(const fetchImpl of [async()=>{throw Error('timeout');},async()=>new Response('<html>invalid feed</html>')]){
  await assert.rejects(refreshLiveData({...options,fetchImpl}),/No verified live source/);
 }
 assert.deepEqual(JSON.parse(await readFile(new URL('live-scores.json',options.snapshotRoot))),previous);
});
