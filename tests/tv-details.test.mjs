import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{decimalOdds,parseTVDetails,applyTVDetails,loadTVDetails}from'../dist/tv-details.js';import{teamMarkup}from'../dist/team-view.js';
const now=Date.parse('2026-10-21T12:00:00Z'),checkedAt=new Date(now).toISOString();
const raw=(state='pre')=>({
 leagues:[{season:{year:2026}}],
 events:[{id:'1',date:'2026-10-21T18:00:00Z',competitions:[{
  status:{type:{state,completed:state==='post'}},
  competitors:[{homeAway:'home',team:{displayName:'Liverpool'},score:'2'},{homeAway:'away',team:{displayName:'Chelsea'},score:'1'}],
  odds:[{provider:{name:'DraftKings'},link:{href:'https://sportsbook.draftkings.com/gateway?preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F123%3Foutcomes%3Dxyz'},moneyline:{home:{close:{odds:'-150'}},away:{close:{odds:'+350'}},draw:{close:{odds:'+280'}}}}]
 }]}]
});
const match={id:'nova-1',competition:'pl',date:'2026-10-21',time:'21:00',home:'Λίβερπουλ',away:'Τσέλσι'};
test('American prices convert to decimal without accepting missing, zero or malformed prices',()=>{assert.equal(decimalOdds('-150'),1.67);assert.equal(decimalOdds('+350'),4.5);assert.equal(decimalOdds('EVEN'),2);for(const v of[null,undefined,'',0,'bad','1.95'])assert.equal(decimalOdds(v),null);});
test('Verified DraftKings prices retain provider and source-check time, with no affiliate or bet-slip URL',()=>{const[e]=parseTVDetails(raw(),'pl',checkedAt);assert.equal(e.score,null);assert.equal(e.odds.home,1.67);assert.equal(e.odds.draw,3.8);assert.equal(e.odds.away,4.5);assert.equal(e.odds.url,'https://sportsbook.draftkings.com/event/123');assert.equal(e.odds.checkedAt,checkedAt);assert.equal(e.odds.bookmaker,'DraftKings');assert.throws(()=>parseTVDetails({...raw(),leagues:[{season:{year:2025}}]},'pl',checkedAt));});
test('Odds require a supported bookmaker, complete 1X2, and a genuine bookmaker event URL',()=>{for(const mutate of[o=>o.provider.name='Unknown',o=>delete o.moneyline.draw,o=>o.link.href='https://evil.example/event/123']){const p=raw();mutate(p.events[0].competitions[0].odds[0]);assert.equal(parseTVDetails(p,'pl',checkedAt)[0].odds,undefined);}});
test('TV matches exact aliases, sport/competition, date and kickoff; reversed or ambiguous fixtures cannot receive prices',()=>{const entries=parseTVDetails(raw(),'pl',checkedAt);assert.ok(applyTVDetails([match],entries,now)[0].odds);for(const change of[{home:'Everton'},{home:match.away,away:match.home},{competition:'el'},{date:'2026-10-22'},{time:'22:00'}])assert.equal(applyTVDetails([{...match,...change}],entries,now)[0].odds,undefined);assert.equal(applyTVDetails([match],[...entries,...entries],now)[0].odds,undefined);});
test('Old or started prices disappear; confirmed live scores expire without becoming final',()=>{let entries=parseTVDetails(raw(),'pl',checkedAt);assert.equal(applyTVDetails([match],entries,now+600001)[0].odds,null);assert.equal(applyTVDetails([match],entries,Date.parse(entries[0].startsAt))[0].odds,null);entries=parseTVDetails(raw('in'),'pl',checkedAt);let m=applyTVDetails([match],entries,now)[0];assert.deepEqual(m.score,[2,1]);assert.equal(m.scoreState,'live');assert.equal(m.odds,null);assert.equal(applyTVDetails([match],entries,now+120001)[0].scoreState,'current');assert.equal(applyTVDetails([match],parseTVDetails(raw('post'),'pl',checkedAt),now)[0].scoreState,'final');});
test('Team markup holds crest and first name word in one lead span and escapes source text',()=>{const s=teamMarkup('ΑΟ ΑΜΥΝΤΑΣ',{src:'./badges/a.png'});assert.match(s,/<span class="team-lead"><img[^>]+>ΑΟ<\/span> ΑΜΥΝΤΑΣ/);assert.ok(teamMarkup('<script> x').includes('&lt;script&gt;'));});
test('Fixture favorites are available separately from team following',async()=>{const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');assert.ok(html.includes('id="favorites-only"'));assert.ok(app.includes('data-fixture-favorite='));assert.ok(!html.includes('Μόνο LIVE'));});

test('TV enrichment requests only competitions present in the selected broadcast list',async()=>{
 const original=globalThis.fetch,urls=[];globalThis.fetch=async url=>{urls.push(url);return{ok:true,json:async()=>({leagues:[{season:{year:2026}}],events:[]})};};
 try{const p=await loadTVDetails('2026-10-24',{competitionIDs:['pl'],force:true,fallback:false});assert.equal(p.errors.length,0);assert.equal(urls.length,1);assert.ok(urls[0].includes('/soccer/eng.1/scoreboard'));}finally{globalThis.fetch=original;}
});
