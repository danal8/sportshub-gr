import{aliases}from'./team-aliases.js?v=75';
const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const names=(s,extra=[])=>new Set([s,...extra].filter(Boolean).flatMap(n=>[n,...aliases[key(n)]||[]]).map(key));
function matchesTeam(row,m,side){const id=row.sourceTeamID,ids=m[side+'IDs'];if(id&&ids?.espn)return String(id)===String(ids.espn);const a=names(row.team,row.teamAliases);return[...names(m[side],m[side+'Aliases'])].some(n=>a.has(n));}
export function standingsCoverage(matches,rows,{today='9999-12-31'}={}){
 const finals=matches.filter(m=>m.date&&m.date<=today&&m.scoreState==='final'&&Array.isArray(m.score)&&m.score.length===2&&m.score.every(n=>Number.isInteger(n)&&n>=0)),seen=new Set(),counts=new Map(),unmatched=[];
 for(const m of finals){const identity=m.id||[m.date,m.home,m.away].join('|');if(seen.has(identity))continue;seen.add(identity);for(const side of['home','away']){const hits=rows.filter(r=>matchesTeam(r,m,side));if(hits.length!==1){unmatched.push({id:m.id,team:m[side]});continue;}counts.set(hits[0],(counts.get(hits[0])||0)+1);}}
 const lagging=rows.filter(r=>r.played<(counts.get(r)||0)).map(r=>({team:r.team,played:r.played,confirmedFinals:counts.get(r)}));return{stale:!!lagging.length,lagging,unmatched,confirmedGames:seen.size};
}
export function validateOfficialStandings(rows,{expected,matches=[]}={}){
 if(!Array.isArray(rows)||rows.length!==expected||new Set(rows.map(r=>key(r.team))).size!==expected||new Set(rows.map(r=>r.rank)).size!==expected||rows.some(r=>!r.team||![r.rank,r.played,r.wins,r.losses,r.points].every(Number.isFinite)||![r.rank,r.played,r.wins,r.losses].every(Number.isInteger)||r.played<0||r.wins<0||r.losses<0||r.wins+r.losses!==r.played))throw Error('Μη έγκυρη επίσημη βαθμολογία');
 // Points are copied verbatim, including published penalties. No win-based formula.
 const known=new Set(matches.flatMap(m=>[m.home,m.away]));if(known.size&&rows.some(r=>![...known].some(n=>matchesTeam(r,{home:n},'home'))))throw Error('Άγνωστη ομάδα στην επίσημη βαθμολογία');return rows;
}

