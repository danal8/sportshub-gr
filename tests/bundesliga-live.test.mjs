import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseLiveScoreboard,applyLiveScores,mergeLiveMatches,isFreshLive} from '../dist/live-scores.js';
import {sameResultMatch} from '../dist/result-reconciliation.js';
const raw=JSON.parse(await readFile(new URL('./fixtures/bundesliga-20261024.json',import.meta.url)));
const fixtures=JSON.parse(await readFile(new URL('../dist/snapshots/bund-2026-27.json',import.meta.url))).matches.filter(m=>m.date==='2026-10-24').map(m=>({...m,score:null,scoreState:null}));
test('Every October 24 Bundesliga fixture matches exactly one ESPN event, including promoted clubs',()=>{
 const at='2026-10-24T13:46:00Z',entries=parseLiveScoreboard(raw,'bund',at);
 for(const m of fixtures)assert.equal(entries.filter(e=>sameResultMatch(m,e)).length,1,m.home+' / '+m.away);
 const merged=applyLiveScores(fixtures,entries,Date.parse(at));
 const originalNow=Date.now;Date.now=()=>Date.parse(at);try{const all=mergeLiveMatches(fixtures,entries,{date:'2026-10-24',competitionIDs:['bund']});assert.equal(all.length,fixtures.length,'LIVE feed updates existing cards instead of adding duplicate short-name cards');assert.equal(all.filter(m=>isFreshLive(m)).length,5);}finally{Date.now=originalNow;}
 for(const m of merged.filter(m=>m.time==='16:30')){assert.equal(m.scoreState,'live',m.home);assert.ok(m.score);assert.ok(m.eventIDs.espn);}
 assert.equal(merged.find(m=>m.time==='19:30').score,null);
 const leipzig=merged.find(m=>m.home==='RB Leipzig');assert.equal(leipzig.awayIDs.espn,'10388');
 const cologne=merged.find(m=>m.home==='1. FC Köln');assert.equal(cologne.homeIDs.espn,'122');assert.equal(cologne.awayIDs.espn,'133');
 assert.equal(sameResultMatch(fixtures[0],{...entries.find(e=>e.home==='RB Leipzig'),date:'2026-10-25'}),false);
 assert.equal(sameResultMatch(fixtures[0],{...entries.find(e=>e.home==='RB Leipzig'),away:'FC Schalke 04',awayIDs:{espn:'133'},awayAliases:[]}),false);
});
