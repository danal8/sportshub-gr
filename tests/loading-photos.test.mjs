import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyRosterPhotos,playerPhoto} from '../dist/detail-data.js';
const catalog=JSON.parse(await readFile(new URL('../dist/snapshots/player-photos-2026-27.json',import.meta.url)));
test('official Olympiacos portraits require exact ESPN player ID, name and club',()=>{
 const entry=catalog.teams['435'].players[0];
 const roster={team:'Olympiacos',players:[{id:entry.id,name:entry.name,photo:null},{id:'wrong',name:entry.name,photo:null}]};
 const result=applyRosterPhotos(roster,catalog,'435');assert.equal(result.players[0].photo,entry.photo);assert.equal(result.players[1].photo,null);
 assert.equal(applyRosterPhotos({...roster,team:'Other club'},catalog,'435').players[0].photo,null);
 assert.equal(applyRosterPhotos(roster,{...catalog,season:'2025-26'},'435').players[0].photo,null);
 assert.equal(catalog.teams['435'].players.length,30);assert.ok(catalog.teams['435'].players.every(p=>playerPhoto(p.photo)));
});
test('initial HTML and loading header reflect TV immediately before providers complete',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(!html.includes('Elite League · Α2 Ανδρών'));
 const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const start=app.indexOf('function renderHeader(){'),end=app.indexOf('\nfunction render(){',start),elements=new Map();
 const element=()=>({hidden:false,textContent:'',closest(){return this;},querySelector(){return this;},setAttribute(){},before(){},append(){}});
 const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const state={tab:'tv',id:'all-tv',tvDate:'2026-10-22'};
 new Function('state','current','$','document','renderMyTeamsControls','renderNav',app.slice(start,end)+';renderHeader();')(state,()=>({id:'all-tv',name:'Όλες οι διοργανώσεις',sport:'all'}),$,{body:{dataset:{}}},()=>{},()=>{});
 assert.equal($('section-title').textContent,'Όλες οι διοργανώσεις');assert.equal($('page-title').textContent,'Τηλεοπτικό πρόγραμμα');
 assert.match(app,/state\.loading=true;renderHeader\(\);/);
});
