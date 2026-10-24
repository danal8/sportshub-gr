// Facts from the official ESAKE Live Center, collected server-side. Never run widget code.
export const GBL_WIDGET='https://widget.wh.geniussports.com/widget/?RFJIN037I07QV520B7WEXKV1GYNA31';
export const GBL_LIVE='https://raw.githubusercontent.com/danal8/sportshub-gr/gbl-live-data/gbl-live.json';
const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^\p{L}\p{N}]/gu,'');
const clubs={MYK:['ΜΥΚΟΝΟΣBETSSONBC'],ARI:['ΑΡΗΣ'],LEF:['ΔΟΞΑΛΕΥΚΑΔΑΣ','ΔΟΞΑΛΕΥΚΑΔΑΣELABET'],IRA:['ΗΡΑΚΛΗΣ'],PBC:['ΠΑΟΚ'],AEK:['ΑΕΚ'],PER:['ΠΕΡΙΣΤΕΡΙBETSSON','ΠΕΡΙΣΤΕΡΙ'],MAR:['ΜΑΡΟΥΣΙ'],PAO:['ΠΑΝΑΘΗΝΑΙΚΟΣAKTOR'],KAR:['ΚΑΡΔΙΤΣΑΙΑΠΩΝΙΚΗ'],KOL:['ΚΟΛΟΣΣΟΣHHOTELSCOLLECTION'],FAL:['VIKOSΦALCONS'],PRO:['ΠΡΟΜΗΘΕΑΣΠΑΤΡΑΣΒΙΚΟΣCOLA'],OLY:['ΟΛΥΜΠΙΑΚΟΣ']};
const code=n=>Object.keys(clubs).find(c=>clubs[c].some(v=>key(v)===key(n)));
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const valid=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0&&n<300);
export function parseGblWidget(script,matches,{today,checkedAt=new Date().toISOString()}={}){
 const literal=script.match(/var html\s*=\s*("(?:[^"\\]|\\.)*")\s*;/)?.[1];if(!literal)throw Error('Missing ESAKE live data');
 const html=JSON.parse(literal),entries=[],unmatched=[];
 for(const item of html.matchAll(/<li class="spls_lsmatch[^>]*>([\s\S]*?)<\/li>/g)){
  const b=item[1];if(!/Stoiximan GBL 2026-2027/.test(b))continue;
  const fid=b.match(/webcast\/ESAKE\/(\d+)\//)?.[1],state=b.match(/class="spls_matchstatus">([^<]+)/)?.[1];
  if(!fid||!['Live','Final'].includes(state))continue;
  const teams=[...b.matchAll(/class="teamname">([^<]+)</g)].map(m=>text(m[1])),score=[...b.matchAll(/class="score[^>]*>([^<]*)</g)].map(m=>/^\d+$/.test(m[1].trim())?Number(m[1]):NaN);
  if(teams.length!==2||!valid(score)||state==='Final'&&(score[0]===score[1]||!score.some(Boolean)))continue;
  const d=b.match(/class\s*=\s*"spls_datefield">\s*(\d{2})\/(\d{2})\/(\d{4})/),date=d?`${d[3]}-${d[2]}-${d[1]}`:state==='Live'?today:null;
  if(!date)continue;
  const hits=matches.filter(m=>m.date===date&&code(m.home)===teams[0]&&code(m.away)===teams[1]);
  if(hits.length!==1){unmatched.push({date,teams,fid});continue;}
  const m=hits[0],clock=b.match(/Per\s+(\d+)\s+(\d{2}:\d{2})/),period=clock?+clock[1]:0;
  entries.push({...m,competition:'gbl',eventIDs:{...m.eventIDs,fiba:fid},score,scoreState:state==='Final'?'final':'live',clock:state==='Live'&&clock?`${period<=4?period+'η περ.':(period-4)+'η παρ.'} · ${clock[2]}`:null,checkedAt,scoreCheckedAt:checkedAt,source:'https://www.esake.gr/',provider:'ΕΣΑΚΕ / Genius Sports'});
 }
 return {entries,unmatched};
}
export function verifiedGblEntries(payload,matches,now=Date.now()){
 if(payload?.season!=='2026-27'||payload.provider!=='ΕΣΑΚΕ / Genius Sports'||!Array.isArray(payload.entries))throw Error('Invalid ESAKE live snapshot');
 return payload.entries.filter(x=>x.competition==='gbl'&&valid(x.score)&&['live','final','current'].includes(x.scoreState)&&Number.isFinite(Date.parse(x.checkedAt))&&Date.parse(x.checkedAt)<=now+60000&&matches.filter(m=>m.id===x.id&&m.date===x.date&&key(m.home)===key(x.home)&&key(m.away)===key(x.away)).length===1).map(x=>({...x,scoreState:x.scoreState==='live'&&now-Date.parse(x.checkedAt)>=90000?'current':x.scoreState}));
}
