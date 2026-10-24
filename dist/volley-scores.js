import{volleyGames}from'./direct.js?v=61';
export const VOLLEY_RESULTS='https://raw.githubusercontent.com/danal8/sportshub-gr/gbl-live-data/volley-results.json';
export const WOMEN_API='https://volleyball.gr/wp-json/sportspress/v2/events/';
const name=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const final=s=>Array.isArray(s)&&s.length===2&&s.every(Number.isInteger)&&Math.max(...s)===3&&Math.min(...s)>=0&&Math.min(...s)<=2;
export function verifiedVolleyEntries(payload,matches,now=Date.now()){
 if(payload?.season!=='2026-27'||payload.provider!=='ESAP / EOPE'||!Array.isArray(payload.entries))throw Error('Invalid volleyball results');
 return payload.entries.filter(x=>['volley-m','volley-w'].includes(x.competition)&&x.scoreState==='final'&&final(x.score)&&Number.isFinite(Date.parse(x.scoreCheckedAt))&&Date.parse(x.scoreCheckedAt)<=now+60000&&matches.filter(m=>m.id===x.id&&m.competition===x.competition&&m.date===x.date&&name(m.home)===name(x.home)&&name(m.away)===name(x.away)).length===1);
}
export async function loadWomenResults(matches,date,{fetchJSON,checkedAt=new Date().toISOString()}={}){
 const fixtures=matches.filter(m=>m.competition==='volley-w'&&m.date===date&&/^volley-\d+$/.test(m.id));
 const results=await Promise.allSettled(fixtures.map(async m=>{
  const url=WOMEN_API+m.id.slice(7)+'?_fields=id,date,title,teams,day,results,leagues,seasons&t='+Date.parse(checkedAt),raw=await fetchJSON(url),game=volleyGames([raw],11)[0];
  if(game.id!==m.id||game.date!==m.date||name(game.home)!==name(m.home)||name(game.away)!==name(m.away))throw Error('Wrong EOPE event');
  return game.scoreState==='final'&&final(game.score)?{...m,score:game.score,scoreState:'final',checkedAt,scoreCheckedAt:checkedAt,source:WOMEN_API+raw.id,provider:'EOPE'}:null;
 }));
 const entries=results.filter(r=>r.status==='fulfilled'&&r.value).map(r=>r.value),errors=results.filter(r=>r.status==='rejected').map(r=>r.reason.message);
 return {entries,errors};
}
