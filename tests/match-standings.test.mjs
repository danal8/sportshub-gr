import test from'node:test';
import assert from'node:assert/strict';
import{projectMatchStandings,pointsAdjustment,loadMatchStandings}from'../dist/match-standings.js';
import{displayTeamName}from'../dist/team-display.js';
import{selectTVGuide}from'../dist/tv-guide.js';
const now=Date.now(),stamp=new Date(now).toISOString();
const row=(team,rank,extra={})=>({team,rank,played:0,wins:0,draws:0,losses:0,points:0,...extra});
const match=(home,away,score,extra={})=>({id:home+'-'+away,competition:'sl',date:'2026-11-06',home,away,score,scoreState:'live',scoreCheckedAt:stamp,...extra});
const record=(rows,matches=[])=>({payload:{standings:rows},matches});
test('live football projects all simultaneous games and retains deductions without mutating source',()=>{
 const source=record([row('A',1,{points:-2}),row('B',2),row('C',3),row('D',4)]);
 const p=projectMatchStandings({id:'sl',sport:'football'},source,[match('A','B',[1,0]),match('C','D',[0,0])],now);
 assert.equal(p.live,true);assert.equal(p.rows.find(r=>r.team==='A').points,1);assert.equal(p.rows.find(r=>r.team==='C').points,1);assert.equal(p.rows.find(r=>r.team==='A').played,1);assert.equal(source.payload.standings[0].played,0);
 const changed=projectMatchStandings({id:'sl',sport:'football'},source,[match('A','B',[0,1])],now);assert.equal(changed.rows[0].team,'B');
});
test('same teams in another competition never affect the selected competition',()=>{
 const p=projectMatchStandings({id:'sl',sport:'football'},record([row('A',1),row('B',2)]),[match('A','B',[2,0],{competition:'cl'})],now);assert.equal(p.live,false);assert.equal(p.rows[0].played,0);
});
test('stale live scores and finals already in official standings are not added again',()=>{
 const c={id:'sl',sport:'football'},m=match('A','B',[2,0],{scoreState:'final'}),source=record([row('A',1,{played:1,wins:1,points:3}),row('B',2,{played:1,losses:1})],[m]);
 const p=projectMatchStandings(c,source,[m],now);assert.equal(p.live,false);assert.equal(p.rows[0].points,3);
 const stale=projectMatchStandings(c,record([row('A',1),row('B',2)]),[match('A','B',[1,0],{scoreCheckedAt:new Date(now-300000).toISOString()})],now);assert.equal(stale.live,false);
});
test('incomplete or lagging baselines block misleading live projections',()=>{
 const p=projectMatchStandings({id:'sl',sport:'football'},record([row('A',1,{played:1}),row('B',2)]),[match('A','B',[1,0])],now);assert.equal(p.live,false);assert.match(p.reason,/συγχρονισμού/);
});
test('GBL keeps adjustments and awards two points to provisional winner and one to loser',()=>{
 const c={id:'gbl',sport:'basketball'},source=record([row('A',1,{points:-2}),row('B',2)]),p=projectMatchStandings(c,source,[match('A','B',[70,60],{competition:'gbl'})],now);
 assert.equal(p.live,true);assert.equal(p.rows.find(r=>r.team==='A').points,0);assert.equal(p.rows.find(r=>r.team==='B').points,1);assert.equal(pointsAdjustment(p.rows.find(r=>r.team==='A'),c),-2);
 const tie=projectMatchStandings(c,source,[match('A','B',[60,60],{competition:'gbl'})],now);assert.equal(tie.rows.find(r=>r.team==='A').played,0);
});
test('NBA projection ranks within conferences, by win percentage',()=>{
 const c={id:'nba',sport:'basketball'},source=record([row('A',1,{group:'East',points:null}),row('B',2,{group:'East',points:null}),row('C',1,{group:'West',points:null}),row('D',2,{group:'West',points:null})]);
 const p=projectMatchStandings(c,source,[match('A','B',[80,90],{competition:'nba'})],now);assert.equal(p.rows.find(r=>r.team==='B').rank,1);assert.equal(p.rows.find(r=>r.team==='B').winRate,'100.0%');assert.equal(p.rows.find(r=>r.team==='C').rank,1);
});
test('volleyball does not invent match points from unfinished sets',()=>{
 const p=projectMatchStandings({id:'volley-w',sport:'volleyball'},record([row('A',1),row('B',2)]),[match('A','B',[1,0],{competition:'volley-w'})],now);assert.equal(p.live,false);assert.match(p.reason,/σετ/);
});
test('cup standings stay unavailable and do not fetch a domestic league',async()=>{
 assert.equal(await loadMatchStandings({id:'greek-cup',noStandings:true}),null);
});
test('TV-only leagues in existing snapshots can be selected and names/acronyms remain consistent',()=>{
 const matches=['2.Bundesliga 2026/27','Sky Bet EFL Championship 2026-27','Liga Portugal Betclic 2026-27'].map((competitionLabel,i)=>({id:String(i),competition:'other',competitionLabel,date:'2026-11-06',live:true,time:'22:00',channel:'TV'}));
 const p={season:'2026-27',days:{'2026-11-06':{matches,sources:[]}}};
 for(const id of['bund2','championship','portugal'])assert.equal(selectTVGuide(p,'2026-11-06',id).matches.length,1);
 assert.equal(displayTeamName('Ζ.Α.Ο.Ν.'),'Ζ.Α.Ο.Ν.');assert.equal(displayTeamName('Ολυμπιακός Σ.Φ.Π.'),'Ολυμπιακός Σ.Φ.Π.');assert.equal(displayTeamName('Crvena Zvezda Meridianbet Belgrade'),displayTeamName('Ερυθρός Αστέρας'));
});
