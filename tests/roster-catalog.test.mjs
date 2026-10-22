import test from 'node:test';import assert from 'node:assert/strict';
import {catalogRoster} from '../dist/detail-data.js';
import {parseEsakeRoster,parseMenRoster} from '../scripts/roster-sources.mjs';
test('cached rosters cannot cross season, competition, sport or team boundaries',()=>{
 const c={id:'volley-w',sport:'volleyball'},raw={season:'2026-27',competition:c.id,sport:c.sport,teams:[{team:'A',competition:c.id,sport:c.sport,checkedAt:new Date().toISOString(),players:[{id:'1',name:'Player',photo:'javascript:bad'}]}]};
 assert.equal(catalogRoster(raw,'A',c).players[0].photo,null);assert.equal(catalogRoster(raw,'B',c),null);assert.equal(catalogRoster({...raw,season:'2025-26'},'A',c),null);assert.equal(catalogRoster(raw,'A',{...c,id:'volley-m'}),null);
});
test('GBL portraits come from source player photo, never the blank tile',()=>{
 const html='<td>ΟΜΑΔΑ</td><td>Club</td><img src="/skn/player_tile.png" style="background:url(\'/dat/esakeplayer/ABC/photo.png\')"><div class="player-title"><span class="player-dash">#</span>3<div class="player-title-name"><span>NAME</span><br>FIRST<div class="player-title-post">PG</div></div></div><div class="player-details">';
 const withID=html.replace('<div class="player-title">','<div class="player-title"><a href="?idplayer=ABC"></a>');
 const r=parseEsakeRoster(withID,'https://www.esake.gr/el/action/EsaketeamView?idchampionship=184645B9');assert.equal(r.players[0].photo,'https://www.esake.gr/dat/esakeplayer/ABC/photo.png');assert.equal(r.players[0].name,'NAME FIRST');assert.equal(r.players[0].jersey,'3');
});

