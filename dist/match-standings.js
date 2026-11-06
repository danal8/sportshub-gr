import{preferCompleteFootballStandings}from'./football-leagues.js?v=78';
import{sameTeam,snapshotMatches,detailJSON}from'./detail-data.js?v=77';
import{sameResultMatch,mergeResultUpdates}from'./result-reconciliation.js?v=77';
import{isFreshLive}from'./live-scores.js?v=77';

const valid=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0);
export function pointsAdjustment(row,c){
 if(!['gbl','elite'].includes(c.id)||!Number.isFinite(row.points))return 0;
 return row.points-(2*row.wins+row.losses);
}
export async function loadMatchStandings(c,{seed=[],force=false}={}){
 if(c.noStandings||c.tvOnly||c.sport==='other')return null;
 let payload=!force&&seed.find(r=>r.competition.id===c.id&&r.payload.standings?.length)?.payload;
 if(!payload)payload=await detailJSON('./snapshots/'+c.id+'-2026-27.json',{ttl:30000,force});
 if(payload.season!=='2026-27')return null;
 if(['europa','conference'].includes(c.id))payload=await preferCompleteFootballStandings(payload,c.id,{force});
 if(!payload.standings?.length)return null;
 return{payload,matches:snapshotMatches(payload,c),source:payload.standingsSource||payload.source,checkedAt:payload.sections?.standings?.lastSuccessAt||payload.retrievedAt};
}

// Never rebuild official points from wins: deductions remain part of the baseline.
// Only project when the baseline's played counts match the confirmed final games.
export function projectMatchStandings(c,record,updates=[],now=Date.now()){
 const rows=record.payload.standings.map(r=>({...r,baseRank:r.rank}));
 const relevant=updates.filter(m=>m.competition===c.id);
 const matches=mergeResultUpdates(record.matches,relevant);
 for(const m of relevant){if(!matches.some(x=>sameResultMatch(x,m)))matches.push(m);}
 const active=matches.filter(m=>isFreshLive(m,now)&&valid(m.score));
 if(!active.length)return{rows,live:false,reason:''};
 if(c.sport==='volleyball')return{rows,live:false,reason:'Οι βαθμοί στο βόλεϊ εξαρτώνται από το τελικό αποτέλεσμα των σετ. Προβάλλεται η δημοσιευμένη βαθμολογία.'};
 if(!['football','basketball'].includes(c.sport))return{rows,live:false,reason:'Δεν υποστηρίζεται προσωρινός υπολογισμός για αυτή τη διοργάνωση.'};
 const find=team=>rows.filter(r=>sameTeam(team,r.team,r.teamAliases));
 const finals=matches.filter(m=>m.scoreState==='final'&&valid(m.score));
 if(rows.some(r=>finals.filter(m=>sameTeam(r.team,m.home,m.homeAliases)||sameTeam(r.team,m.away,m.awayAliases)).length!==r.played))return{rows,live:false,reason:'Αναμονή συγχρονισμού βαθμολογίας και τελικών αποτελεσμάτων. Δεν προστίθενται αγώνες δεύτερη φορά.'};
 const used=new Set(),percent=['el','eurocup','nba'].includes(c.id);
 for(const m of active){
  const h=find(m.home),a=find(m.away);
  if(h.length!==1||a.length!==1||h[0]===a[0]||used.has(h[0])||used.has(a[0]))return{rows:record.payload.standings.map(r=>({...r})),live:false,reason:'Δεν επιβεβαιώθηκε μοναδικά η αντιστοίχιση των ζωντανών αγώνων.'};
  used.add(h[0]);used.add(a[0]);
 }
 for(const m of active){
  const h=find(m.home)[0],a=find(m.away)[0],[hs,as]=m.score;
  // A basketball tie has no provisional winner; keep its official record unchanged.
  if(c.sport==='basketball'&&hs===as)continue;
  for(const [r,own,other]of[[h,hs,as],[a,as,hs]]){
   r.played++;r.projected=true;
   if(own===other){r.draws=(r.draws||0)+1;r.points++;}
   else if(own>other){r.wins++;if(!percent)r.points+=c.sport==='football'?3:2;}
   else{r.losses++;if(!percent&&c.sport==='basketball')r.points++;}
   if(percent)r.winRate=(100*r.wins/r.played).toFixed(1)+'%';
  }
 }
 const groups=[...new Set(rows.map(r=>r.group||''))];
 const ranked=groups.flatMap(group=>rows.filter(r=>(r.group||'')===group).sort((a,b)=>(percent?b.wins/Math.max(1,b.played)-a.wins/Math.max(1,a.played):b.points-a.points)||a.baseRank-b.baseRank).map((r,i)=>({...r,rank:i+1})));
 return{rows:ranked,live:true,reason:'Προσωρινή κατάταξη με το τρέχον σκορ όλων των επιβεβαιωμένων LIVE αγώνων της διοργάνωσης. Σε ισοβαθμία διατηρείται η σειρά της δημοσιευμένης κατάταξης· δεν εφαρμόζονται τα τελικά κριτήρια ισοβαθμίας.'};
}
