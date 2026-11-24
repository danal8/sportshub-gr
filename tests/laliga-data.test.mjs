import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validSpanishLeague} from '../dist/football-leagues.js';

test('La Liga fixtures and standings agree on all 20 clubs', async () => {
 const snapshot=JSON.parse(await readFile('dist/snapshots/laliga-2026-27.json','utf8'));
 assert.equal(validSpanishLeague(snapshot),true);
 assert.ok(snapshot.standings.some(row=>row.team==='Barcelona'));
 const unrelated={...snapshot,standings:snapshot.standings.map((row,index)=>index===0?{...row,team:'AZ Alkmaar',sourceTeamID:'unrelated'}:row)};
 assert.equal(validSpanishLeague(unrelated),false);
 const matches=snapshot.matches.map((match,index)=>index===0?{...match,homeIDs:{espn:'unrelated'}}:match);
 assert.equal(validSpanishLeague({...snapshot,matches}),false);
});
