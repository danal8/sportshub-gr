import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseVolleyReport,parseVolleyTable,reportLinks,applyVolleyResults,collectVolleyResults,resultsURL} from '../scripts/volley-results.mjs';
const url='https://www.volleyleague.gr/index.php/news/all-news/item/13591-match',html=await readFile(new URL('./fixtures/volley-official-report.html',import.meta.url),'utf8');
const fixture={id:'volley-m-1-0',home:'Α.Ο.Π. Κηφισιάς',away:'Πανιώνιος Betsson',round:'1',date:'2026-10-23',time:'19:30'};
test('Official volleyball report verifies oriented teams, round and all completed sets',()=>{
 const r=parseVolleyReport(html,url);assert.deepEqual(r.score,[2,3]);assert.equal(r.round,'1');assert.equal(r.sets.length,5);
 const [m]=applyVolleyResults([fixture],[r],'2026-10-24');assert.equal(m.home,fixture.home);assert.equal(m.id,fixture.id);assert.equal(m.scoreState,'final');assert.deepEqual(m.score,[2,3]);
 for(const bad of [html.replace('2-3 (23-25','3-2 (23-25'),html.replace('13-15)','14-15)'),html.replace('23-10-2026','23-10-2025')])assert.equal(parseVolleyReport(bad,url),null);
 assert.equal(parseVolleyReport(html,url.replace('/news/','/super/')),null);
 for(const wrong of [{...r,date:'2026-10-25'},{...r,round:'2'},{...r,home:r.away,away:r.home}])assert.equal(applyVolleyResults([fixture],[wrong],'2026-10-24')[0].score,undefined);
 assert.equal(applyVolleyResults([fixture],[r,{...r,score:[3,2]}],'2026-10-24')[0].score,undefined);
 assert.equal(applyVolleyResults([fixture,{...fixture,id:'duplicate'}],[r],'2026-10-24')[0].score,undefined);
});
test('Official table placeholders and incomplete scores cannot become finals',()=>{
 const row=score=>`<div style="padding-bottom:0px;"><div>23/10/2026</div><a href="/index.php/season/2026-27/teams/a-o-p-kifisias">Α.Ο.Π.Κηφισιάς</a><span class="team-class">${score}</span><a href="/index.php/season/2026-27/teams/">Πανιώνιος Betsson</a></div>`;
 const table="<div id='full-program'><style></style>2026-27";
 assert.equal(parseVolleyTable(table+row('0-0')).length,0);assert.equal(parseVolleyTable(table+row('2-2')).length,0);assert.deepEqual(parseVolleyTable(table+row('2-3'))[0].score,[2,3]);assert.throws(()=>parseVolleyTable('outage'));
});
test('Report fallback survives table failure and retains saved finals on source outage',async()=>{
 const listing=`<a href="${url}">Ο Πανιώνιος νίκησε 3-2 την Κηφισιά</a>`;assert.deepEqual(reportLinks(listing),[url]);
 const r=await collectVolleyResults([fixture],{today:'2026-10-24',fetchText:async u=>{if(u===resultsURL)throw Error('timeout');return u===url?html:listing;}});assert.deepEqual(r.matches[0].score,[2,3]);assert.equal(r.errors.length,1);
 const saved=await collectVolleyResults(r.matches,{today:'2026-10-24',fetchText:async()=>{throw Error('outage');}});assert.deepEqual(saved.matches[0].score,[2,3]);
});
