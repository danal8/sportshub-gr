import test from'node:test';import assert from'node:assert/strict';import{loadProvider}from'../dist/providers.js';
test('A slow badge catalog never delays the fixture payload',async()=>{
 const original=globalThis.fetch;let release;
 globalThis.fetch=async url=>url.includes('catalog.json')?new Promise(resolve=>release=()=>resolve({ok:true,json:async()=>({teams:{},urls:{}})})):{ok:true,json:async()=>({season:'2026-27',retrievedAt:new Date().toISOString(),matches:[{id:'one',date:'2026-10-24',home:'A',away:'B'}]})};
 try{const result=await Promise.race([loadProvider('el','2026-27'),new Promise(resolve=>setTimeout(()=>resolve(null),300))]);assert.ok(result,'Schedule resolves while badges remain pending');assert.equal(result.matches[0].id,'one');}finally{release?.();globalThis.fetch=original;}
});
