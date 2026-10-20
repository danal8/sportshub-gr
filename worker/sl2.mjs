import{sl2Score}from'../dist/results.js';
// Public read endpoints used by the official SL2 website. Only normalized scores and public club artwork are retained.
export function normalizeSL2(games,table){
 if(!Array.isArray(games)||games.length!==240||!Array.isArray(table)||table.length!==16)throw Error('Μη πλήρη στοιχεία SL2');
 const matches=games.map(g=>{const round=g.matchday_el?.match(/^(\d+)η/)?.[1];if(g.competition_slug!=='sl2-2627'||!round||!g.home_team?.name_el||!g.away_team?.name_el)throw Error('Μη έγκυρος αγώνας SL2');return{...sl2Score(g),id:'sl2-'+g.id,home:g.home_team.name_el,away:g.away_team.name_el,homeBadge:g.home_team.logo?.small,awayBadge:g.away_team.logo?.small,round,date:g.date||null,time:g.time&&g.time!=='00:00:00'?g.time.slice(0,5):null,channel:g.channel||null,source:'https://www.sl2.gr/program',provisional:!g.time};});
 if(new Set(matches.map(m=>m.id)).size!==240||new Set(matches.map(m=>m.round)).size!==30)throw Error('Μη πλήρες πρόγραμμα SL2');
 const standings=table.map(r=>{if(!r.team?.name_el||r.matches!==r.wins+r.draws+r.losses)throw Error('Μη έγκυρη βαθμολογία SL2');return{rank:r.position,team:r.team.name_el,played:r.matches,wins:r.wins,draws:r.draws,losses:r.losses,points:r.points};});
 return{matches,standings};
}
export async function loadSL2(){const root='https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/';const values=await Promise.all(['matches','standings'].map(async p=>{const r=await fetch(root+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('SL2 HTTP '+r.status);return r.json();}));return{...normalizeSL2(...values),season:'2026-27',source:'https://www.sl2.gr/program',standingsSource:'https://www.sl2.gr/rating',copyright:'Πηγή: Superbet League 2 / sl2.gr. Προβολή προγράμματος και αποτελεσμάτων επίσημης πηγής.',notice:'Επίσημη SL2 · 30 αγωνιστικές / 240 αγώνες / 16 ομάδες. Κανάλι μόνο όπου δηλώνεται από την πηγή.'};}
