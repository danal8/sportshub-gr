import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import vm from'node:vm';
test('Versioned modules reuse the shell cache; schedules and live APIs always reach the network',async()=>{
 const handlers={},assets=[],network=[],scope='https://example.test/sportshub-gr/';
 const sandbox={URL,Response,self:{location:{origin:'https://example.test'},registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>({addAll:async urls=>assets.push(...urls),put:async()=>{}}),match:async()=>new Response('cached'),keys:async()=>[],delete:async()=>{}},fetch:async request=>{network.push(request.url);return new Response('network');}};
 vm.runInNewContext(await readFile('dist/sw.js','utf8'),sandbox);let install;handlers.install({waitUntil:p=>install=p});await install;
 assert.equal(new Set(assets).size,assets.length);assert.ok(assets.length<100,'No historical module-version downloads');
 let response;handlers.fetch({request:{url:scope+'app.js?v=51',method:'GET'},respondWith:p=>response=p});assert.equal(await(await response).text(),'cached');assert.equal(network.length,0);
 response=null;handlers.fetch({request:{url:scope+'snapshots/daily-2026-27.json',method:'GET'},respondWith:p=>response=p});assert.equal(response,null,'Schedule is not served from shell cache');
 response=null;handlers.fetch({request:{url:'https://site.web.api.espn.com/scoreboard',method:'GET'},respondWith:p=>response=p});assert.equal(response,null,'External live API stays outside shell cache');
});
