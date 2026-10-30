import test from'node:test';import assert from'node:assert/strict';import{parseLiveScoreboard,sourceClock,applyLiveScores,parseEuroHeader,loadLiveScores}from'../dist/live-scores.js';import{resultLabel}from'../dist/results.js';import{displayTeamName}from'../dist/team-display.js';
const at='2026-10-22T17:00:00Z',now=Date.parse(at);
function raw(state='in',completed=false){return{leagues:[{season:{year:2026}}],events:[{id:'123',date:'2026-10-22T16:45:00Z',status:{displayClock:"67'",period:2,type:{state,completed,name:completed?'STATUS_FULL_TIME':'STATUS_IN_PROGRESS'}},competitions:[{competitors:[{homeAway:'home',team:{displayName:'OFI Crete'},score:'1'},{homeAway:'away',team:{displayName:'Bayer Leverkusen'},score:'2'}]}]}]};}
const match={id:'a',date:'2026-10-22',time:null,competition:'europa',home:'ΟΦΗ',away:'Λεβερκούζεν'};
test('Live football takes score and real minute from ESPN; scheduled 0-0 never becomes live',()=>{
 const entries=parseLiveScoreboard(raw(),'europa',at),m=applyLiveScores([match],entries,now)[0];assert.deepEqual(m.score,[1,2]);assert.equal(m.scoreClock,'67′');assert.equal(resultLabel(m,now),'● LIVE · 67′');assert.equal(m.time,'19:45');assert.equal(m.scoreProvider,'ESPN');
 assert.equal(parseLiveScoreboard(raw('pre'),'europa',at)[0].score,null);assert.equal(parseLiveScoreboard(raw('post',true),'europa',at)[0].clock,null);assert.throws(()=>parseLiveScoreboard({...raw(),leagues:[{season:{year:2025}}]},'europa',at));
});
test('Football handles stoppage time, halftime and interruptions without synthesizing elapsed minutes',()=>{
 for(const [status,expected]of[[{displayClock:"45'+3'",type:{state:'in'}},'45+3′'],[{displayClock:"45'",type:{state:'in',name:'STATUS_HALFTIME'}},'Ημίχρονο'],[{type:{state:'in',name:'STATUS_SUSPENDED'}},'Διακοπή'],[{clock:4000,type:{state:'in'}},null]])assert.equal(sourceClock(status,'soccer'),expected);
 assert.equal(sourceClock({displayClock:"90'",type:{state:'post',completed:true}},'soccer'),null);
 assert.equal(sourceClock({displayClock:'<script>',type:{state:'in'}},'soccer'),null);
});
test('NBA uses Athens date past midnight and displays the remaining period clock',()=>{
 const p=raw();p.leagues[0].season.year=2027;p.events[0].date='2026-10-21T23:00:00Z';p.events[0].status={displayClock:'02:17',period:3,type:{state:'in',name:'STATUS_IN_PROGRESS'}};
 const e=parseLiveScoreboard(p,'nba',at)[0];assert.equal(e.date,'2026-10-22');assert.equal(e.clock,'3η περ. · 02:17');
});
test('Stale or future-dated live data loses LIVE and its clock; finals remain final and identities fail closed',()=>{
 const entries=parseLiveScoreboard(raw(),'europa',at);
 for(const t of[now+90000,now-60001]){const m=applyLiveScores([match],entries,t)[0];assert.equal(m.scoreState,'current');assert.equal(m.scoreClock,null);assert.equal(resultLabel(m,t),'Σκορ πηγής');}
 for(const change of[{competition:'sl'},{date:'2026-10-23'},{home:match.away,away:match.home}])assert.equal(applyLiveScores([{...match,...change}],entries,now)[0].score,undefined);
 assert.equal(applyLiveScores([match],[...entries,...entries],now)[0].score,undefined);
 const final=applyLiveScores([match],parseLiveScoreboard(raw('post',true),'europa',at),now+999999)[0];assert.equal(resultLabel(final,now+999999),'Τελικό');
});
test('EuroLeague official Header validates season, teams and date and refuses scheduled 0-0',()=>{
 const m={id:'E-67',competition:'el',home:'Panathinaikos AKTOR Athens',away:'Kosner Baskonia Vitoria-Gasteiz',date:'2026-10-22',scoreState:null},header={CompetitionReducedName:'E2026 ',Date:'22/10/2026',TeamA:m.home.toUpperCase(),TeamB:m.away.toUpperCase(),ScoreA:'65',ScoreB:'61',Live:true,Quarter:'3',RemainingPartialTime:'02:11'};
 let e=parseEuroHeader(header,m,at);assert.deepEqual(e.score,[65,61]);assert.equal(e.clock,'3η περ. · 02:11');assert.equal(e.provider,'Euroleague Basketball');
 assert.equal(parseEuroHeader({...header,Live:false,ScoreA:'0',ScoreB:'0'},m,at),null);
 assert.equal(parseEuroHeader({...header,Live:false},m,at,{ForthQuarter:[{PLAYTYPE:'EG'}]}).scoreState,'final');
 assert.throws(()=>parseEuroHeader({...header,Date:'21/10/2026'},m,at));assert.throws(()=>parseEuroHeader({...header,CompetitionReducedName:'E2025'},m,at));
});
test('EuroLeague Header refreshes inherited snapshot timestamps and clocks',()=>{
 for(const competition of ['el','eurocup']){
 const m={id:'E-70',competition,date:'2026-10-23',home:'Olympiacos Piraeus',away:'Fenerbahce Tarfin Istanbul',score:[20,18],scoreState:'current',scoreCheckedAt:'2026-10-22T16:00:00Z',scoreClock:'1η περ. · 01:00'};
 const header={CompetitionReducedName:competition==='el'?'E2026':'U2026',Date:'23/10/2026',TeamA:m.home,TeamB:m.away,ScoreA:'34',ScoreB:'24',Live:true,Quarter:'',RemainingPartialTime:''};
 const entry=parseEuroHeader(header,m,at),updated=applyLiveScores([m],[entry],now)[0];
 assert.deepEqual(updated.score,[34,24]);assert.equal(updated.scoreCheckedAt,at);assert.equal(updated.scoreState,'live');assert.match(resultLabel(updated,now),/LIVE/);assert.equal(updated.scoreClock,null);
 const expired=applyLiveScores([m],[entry],now+90000)[0];assert.equal(expired.scoreState,'current');assert.equal(resultLabel(expired,now+90000),'Σκορ πηγής');
 }
});
test('Source names are formatted only for display, preserving acronyms and favourite identities',()=>{
 assert.equal(displayTeamName('ΠΑΝΕΡΥΘΡΑΙΚΟΣ ΑΣ'),'Πανερυθραϊκός ΑΣ');assert.equal(displayTeamName('ΓΣ ΣΟΦΑΔΩΝ ΒΙΚΟΣ COLA'),'ΓΣ Σοφάδων Βίκος Cola');assert.equal(displayTeamName('ΠΑΟΚ'),'ΠΑΟΚ');assert.equal(displayTeamName('ΑΕΚ'),'ΑΕΚ');assert.equal(displayTeamName('Boston Celtics'),'Boston Celtics');assert.equal(displayTeamName('<SCRIPT>'),' <Script>'.trim());const m={home:'ΠΑΝΙΩΝΙΟΣ'};displayTeamName(m.home);assert.equal(m.home,'ΠΑΝΙΩΝΙΟΣ');
});
test('Score requests deduplicate in-flight calls and surface failed feeds without fake updates',async(t)=>{
 // The fixture must stay inside Flashscore's seven-day window regardless of the CI date.
 // Mock Date only; real promises and timers still exercise request deduplication.
 t.mock.timers.enable({apis:['Date'],now});
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async url=>{calls++;if(String(url).includes('flashscore.ninja'))return{ok:true,text:async()=> 'SA÷1¬',headers:{get:()=>null}};if((String(url).includes('/gbl-live-data/live-scores.json')||String(url).includes('/functions/v1/sportshub-live')))return{ok:true,json:async()=>({season:'2026-27',provider:'SportsHub live relay',entries:[]})};return{ok:true,json:async()=>raw()};};
 try{const list=[match];const [a,b]=await Promise.all([loadLiveScores(list,'2026-10-22',{force:true}),loadLiveScores(list,'2026-10-22',{force:true})]);assert.equal(calls,3);assert.equal(a.entries.length,1);assert.equal(b.errors.length,0);globalThis.fetch=async()=>{throw Error('CORS')};const failed=await loadLiveScores(list,'2026-10-22',{force:true});assert.equal(failed.errors.length,4);assert.equal(failed.entries.length,0);assert.equal(failed.succeeded.length,0);
 }finally{globalThis.fetch=original;}
});

test('An older live response never replaces a more recent score from the same public source',()=>{
 const old=parseLiveScoreboard(raw(),'europa',at),m={...match,score:[3,2],scoreCheckedAt:'2026-10-22T17:00:30Z',scoreState:'live',scoreProvider:'ESPN'};
 assert.deepEqual(applyLiveScores([m],old,now+30000)[0].score,[3,2]);
});


