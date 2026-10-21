import test from'node:test';import assert from'node:assert/strict';
import{makeSelection,sanitizeSelections,selectionForTeam,addSelection,weekRange,weeklyMatches,selectedCompetitions}from'../dist/my-teams.js';
const sports={sl2:'football',elite:'basketball',gbl:'basketball',el:'basketball',nba:'basketball','volley-w':'volleyball','volley-m':'volleyball'};
const panionios=makeSelection('ΠΑΝΙΩΝΙΟΣ','sl2','football','club');
test('Club selection links explicit sponsored Greek names across sports and genders, without matching reserves or unrelated clubs',()=>{
 for(const [name,c]of[['ΠΑΝΙΩΝΙΟΣ COSMORAMA TRAVEL','elite'],['Πανιώνιος Betsson','volley-w'],['Πανιώνιος Betsson','volley-m']])assert.equal(selectionForTeam([panionios],name,c,sports[c]),panionios);
 assert.equal(selectionForTeam([panionios],'Πανιώνιος άλλης πόλης','elite','basketball'),undefined);
 const olympiacos=makeSelection('ΟΛΥΜΠΙΑΚΟΣ','gbl','basketball','club');assert.equal(selectionForTeam([olympiacos],'ΟΛΥΜΠΙΑΚΟΣ Β\u0027','sl2','football'),undefined);
});
test('Single section follows the same basketball team in domestic and European leagues, keeping other sports and women separate',()=>{
 const s=makeSelection('ΠΑΝΑΘΗΝΑΪΚΟΣ AKTOR','gbl','basketball');
 assert.equal(selectionForTeam([s],'Panathinaikos AKTOR Athens','el','basketball'),s);
 assert.equal(selectionForTeam([s],'Panathinaikos','sl','football'),undefined);
 const w=makeSelection('Παναθηναϊκός Α.Ο.','volley-w','volleyball');assert.equal(selectionForTeam([w],'Παναθηναϊκός Α.Ο.','volley-m','volleyball'),undefined);
});
test('Several teams persist with validated scope and duplicates collapse; replacing all-club with a section is explicit',()=>{
 const nba=makeSelection('Boston Celtics','nba','basketball');
 let list=addSelection([panionios],nba);assert.equal(list.length,2);assert.deepEqual(sanitizeSelections(JSON.parse(JSON.stringify(list))),list);
 assert.equal(addSelection(list,nba).length,2);
 const section=makeSelection('Πανιώνιος Betsson','volley-w','volleyball');list=addSelection(list,section);assert.equal(list.length,2);assert.ok(!list.some(s=>s.scope==='club'));
 assert.equal(addSelection(list,panionios).length,2);
 assert.deepEqual(sanitizeSelections([null,{},'bad',{team:'x',competition:'nba',sport:'basketball',scope:'club'}]),[]);
 assert.deepEqual(sanitizeSelections({bad:true}),[]);
});
test('Weekly boundaries are Monday to Sunday across month, year and DST; invalid calendar dates fail closed',()=>{
 assert.deepEqual(weekRange('2026-10-25'),{start:'2026-10-19',end:'2026-10-25'});
 assert.deepEqual(weekRange('2027-01-01'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(weekRange('2026-03-29'),{start:'2026-03-23',end:'2026-03-29'});
 assert.throws(()=>weekRange('2026-02-31'));assert.throws(()=>weekRange('bad'));
});
test('Week shows either selected side once, keeps competition identity, excludes undated and out-of-week fixtures, and sorts TBD hours last',()=>{
 const a={id:'a',competition:'sl2',home:'ΠΑΝΙΩΝΙΟΣ',away:'ΜΑΡΚΟ',date:'2026-10-25',time:'15:00',competitionLabel:'SL2'};
 const b={id:'b',competition:'volley-w',home:'ΑΕΚ',away:'Πανιώνιος Betsson',date:'2026-10-24',time:null,competitionLabel:'Volley'};
 const c={...b,id:'c',home:'Πανιώνιος Betsson',away:'ΑΡΗΣ',time:'17:00'};
 const out=weeklyMatches([a,a,b,c,{...a,date:'2026-10-26'},{...a,date:null},{...a,competition:'unknown'}],[panionios],'2026-10-21',sports);
 assert.deepEqual(out.map(m=>m.id),['c','b','a']);
 assert.equal(weeklyMatches([a],[],'2026-10-21',sports).length,0);
});
test('Unknown clubs support a section only; NBA names remain distinct and selection requests only relevant sports',()=>{
 assert.equal(makeSelection('Boston Celtics','nba','basketball','club'),null);
 assert.equal(selectionForTeam([makeSelection('Boston Celtics','nba','basketball')],'Charlotte Hornets','nba','basketball'),undefined);
 const cs=Object.entries(sports).map(([id,sport])=>({id,sport}));
 assert.ok(selectedCompetitions([panionios],cs).some(c=>c.id==='volley-w'));
 assert.ok(selectedCompetitions([makeSelection('Boston Celtics','nba','basketball')],cs).every(c=>c.sport==='basketball'));
 assert.deepEqual(selectedCompetitions([],cs),[]);
});
