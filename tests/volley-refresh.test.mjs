import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{headlineResults,reportLinks}from'../scripts/volley-results.mjs';
import{verifiedVolleyEntries,loadWomenResults}from'../dist/volley-scores.js';
import{loadLiveScores,applyLiveScores}from'../dist/live-scores.js';
const at=new Date().toISOString(),date='2026-10-24';
const men={id:'volley-m-1-1',competition:'volley-m',date,round:'1',home:'Ο.Φ.Η.',away:'Π.Α.Ο.Κ.'};
const report='https://www.volleyleague.gr/index.php/component/k2/item/13596/result';
const headline=`<div class='latest-news-content'><p>24-10-2026</p><h4><a href='${report}'>Eντυπωσιακός ο ΟΦΗ...</a></h4></div><a href="/index.php/news/all-news/item/13596-result">Eντυπωσιακός ο ΟΦΗ νίκησε 3-0 τον ΠΑΟΚ</a>`;
const raw=JSON.parse(await readFile(new URL('./fixtures/volley-w-finished.json',import.meta.url))),women={id:'volley-'+raw.id,competition:'volley-w',date,home:'Α.Σ. Ελπίς',away:'Α.Ο. Μαρκοπούλου Revoil'};
test('Official dated headlines survive broken article aliases, preserve orientation, and reject old or ambiguous games',()=>{
 assert.deepEqual(reportLinks(headline),[report]);const [r]=headlineResults(headline,[men],at);assert.deepEqual(r.score,[3,0]);
 assert.deepEqual(headlineResults(headline,[{...men,home:men.away,away:men.home}],at)[0].score,[0,3]);
 assert.equal(headlineResults(headline.replace('24-10-2026','24-10-2025'),[men],at).length,0);
 assert.equal(headlineResults(headline,[men,{...men,id:'duplicate'}],at).length,0);
 assert.equal(headlineResults(headline.replace('νίκησε','αντιμετωπίζει'),[men],at).length,0);
 assert.equal(headlineResults(headline.replace('3-0','2-0'),[men],at).length,0);
});
test('Women refresh reads the precise EOPE event and rejects wrong competition, date and orientation',async()=>{
 const r=await loadWomenResults([women],date,{checkedAt:at,fetchJSON:async()=>raw});assert.deepEqual(r.entries[0].score,[0,3]);
 for(const bad of [{...raw,seasons:[297]},{...raw,leagues:[156]},{...raw,date:'2026-10-23T16:30:00'},{...raw,title:{rendered:'Α.Ο. Μαρκοπούλου Revoil &#8211; Α.Σ. Ελπίς'}}]){
  const x=await loadWomenResults([women],date,{checkedAt:at,fetchJSON:async()=>bad});assert.equal(x.entries.length,0);assert.equal(x.errors.length,1);
 }
 const pending={...raw,results:{}};assert.equal((await loadWomenResults([women],date,{checkedAt:at,fetchJSON:async()=>pending})).entries.length,0);
});
test('Periodic volleyball refresh merges both competitions once, with fallback and persistent finals on outage',async()=>{
 const entries=[...headlineResults(headline,[men],at),{...women,score:[0,3],scoreState:'final',scoreCheckedAt:at}],payload={season:'2026-27',provider:'ESAP / EOPE',entries};
 assert.equal(verifiedVolleyEntries(payload,[men,women]).length,2);assert.equal(verifiedVolleyEntries({...payload,entries:[{...entries[0],competition:'volley-w'}]},[men,women]).length,0);
 const prior=globalThis.fetch;let outage=false;
 globalThis.fetch=async url=>{if(outage){if(String(url).startsWith('./snapshots/volley-results.json'))return{ok:true,json:async()=>payload};throw Error('outage');}return{ok:true,json:async()=>String(url).includes('/events/')?raw:payload};};
 try{const r=await loadLiveScores([men,women],date,{force:true,competitionIDs:['volley-m','volley-w']});assert.equal(r.entries.length,2);const merged=applyLiveScores([men,women],r.entries);assert.deepEqual(merged.map(x=>x.score),[[3,0],[0,3]]);outage=true;const fallback=await loadLiveScores(merged,date,{force:true,competitionIDs:['volley-m','volley-w']});assert.deepEqual(applyLiveScores(merged,fallback.entries).map(x=>x.score),[[3,0],[0,3]]);}
 finally{globalThis.fetch=prior;}
});
