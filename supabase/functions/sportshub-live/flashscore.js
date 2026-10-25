import{athensDay}from'./core.js';
import{aliases}from'./team-aliases.js';
import{sameResultMatch}from'./result-reconciliation.js';
export const LIVE_DATA='https://raw.githubusercontent.com/danal8/sportshub-gr/gbl-live-data/live-scores.json';
export const FLASH_DEFAULT={origin:'https://11.flashscore.ninja',project:'11',sign:'SW9D1eZo'};
export const flashLeagues={
 '/football/england/premier-league/':['pl',1],'/football/greece/super-league/':['sl',1],'/football/greece/super-league-2/':['sl2',1],'/football/germany/bundesliga/':['bund',1],'/football/spain/laliga/':['laliga',1],'/football/italy/serie-a/':['seriea',1],'/football/france/ligue-1/':['ligue1',1],'/football/europe/champions-league/':['cl',1],'/football/europe/europa-league/':['europa',1],'/football/europe/conference-league/':['conference',1],
 '/basketball/greece/basket-league/':['gbl',3],'/basketball/greece/elite-league/':['elite',3],'/basketball/europe/euroleague/':['el',3],'/basketball/europe/eurocup/':['eurocup',3],'/basketball/usa/nba/':['nba',3],
 '/volleyball/greece/volley-league/':['volley-m',12],'/volleyball/greece/a1-women/':['volley-w',12],'/volleyball/greece/volley-league-women/':['volley-w',12]
};
const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]/gu,'');
const extra=[['Ανζέρ','Angers SCO'],['Στρασβούργο','RC Strasbourg Alsace'],['Ολυμπιακός Σ.Φ.Π. ΟΝΕΧ','Ολυμπιακός'],['ΑΝΑΓ. ΚΑΡΔΙΤΣΑΣ','Αναγέννηση Καρδίτσας'],["ASTERAS AKTOR Β'",'Αστέρας Τρίπολης Β'],['Philadelphia 76ers','Φιλαδέλφια 76ερς'],['Washington Wizards','Ουάσιγκτον Γουίζαρντς'],['Phoenix Suns','Φίνιξ Σανς'],['Πανιώνιος','Panionios'],['Μαρκό','Marko','GS Marko'],['Χαλ','Hull City'],['Μπάγερ Λεβερκούζεν','Bayer 04 Leverkusen','Λεβερκούζεν'],['ΚΟΛΟΣΣΟΣ H HOTELS COLLECTION','Κολοσσός Ρόδου'],['VIKOS ΦALCONS','Βίκος Ιωαννίνων'],['ΠΡΟΜΗΘΕΑΣ ΠΑΤΡΑΣ ΒΙΚΟΣ COLA','Προμηθέας Πατρών'],['Ν.Ο.Π.Ε. Ρεθύμνου','Ρέθυμνο'],['Α.Σ. Άρης','Άρης'],['Α.Ο.Φλοίσβος MEMBERS PARON','ΑΟ Φλοίσβος Παλαιού Φαλήρου'],['Α.Ο.Φοίνικας Σύρου','Φοίνικας Σύρου'],['Α.Ο.Ν.Σ.Μίλων','ΑΟΝΣ Μίλων']];
const aliasMap={};for(const [k,values]of Object.entries(aliases))aliasMap[key(k)]=[...(aliasMap[key(k)]||[]),...values];
const names=n=>{const out=[n],seen=new Set();for(let i=0;i<out.length;i++){const k=key(out[i]);if(seen.has(k))continue;seen.add(k);out.push(...(aliasMap[k]||[]).filter(a=>!seen.has(key(a))));for(const row of extra)if(row.some(a=>key(a)===k))out.push(...row.filter(a=>!seen.has(key(a))));}return seen;};
const same=(a,b)=>{const left=names(a);return[...names(b)].some(n=>left.has(n));};
const score=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0&&n<400);
export function flashURL(config,sport,date,today=athensDay()){
 if(!/^https:\/\/(?:\d{1,2}|global)\.flashscore\.ninja$/.test(config?.origin)||!/^\d{1,2}$/.test(config.project)||!/^\w{4,30}$/.test(config.sign)||![1,3,12].includes(sport))throw Error('Invalid public score configuration');
 const offset=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);if(!Number.isInteger(offset)||Math.abs(offset)>7)throw Error('Unsupported score date');
 return config.origin+'/'+config.project+'/x/feed/f_'+sport+'_'+offset+'_3_el_1?t='+Date.now();
}
export function parseFlashscore(text,matches,{sport,date,checkedAt=new Date().toISOString(),cacheAge=0}={}){
 if(!String(text).startsWith('SA÷'+sport+'¬'))throw Error('Wrong Flashscore sport');
 const entries=[],unmatched=[];let league=null;const stamp=new Date(Date.parse(checkedAt)-Math.max(0,Number(cacheAge)||0)*1000).toISOString();
 for(const block of text.split('~')){
  const fields=Object.fromEntries(block.split('¬').filter(x=>x.includes('÷')).map(x=>{const i=x.indexOf('÷');return[x.slice(0,i),x.slice(i+1)];}));
  if(fields.ZA){league=flashLeagues[fields.ZL];continue;}
  if(!fields.AA||!league||league[1]!==sport||!['2','3'].includes(fields.AB))continue;
  const competition=league[0],start=new Date(Number(fields.AD)*1000);if(!Number.isFinite(+start)||athensDay(start)!==date||date<'2026-07-01'||date>='2027-07-01')continue;
  const points=[fields.AG,fields.AH].map(v=>/^\d+$/.test(v||'')?Number(v):NaN),final=fields.AB==='3'&&['3','10','11'].includes(fields.AC);if(!score(points)||fields.AB==='3'&&!final||sport===12&&final&&(Math.max(...points)!==3||Math.min(...points)>2)||sport===3&&final&&points[0]===points[1])continue;
  const refs=matches.filter(m=>m.competition===competition&&m.date===date),hits=refs.filter(m=>{
   if(m.eventIDs?.flashscore)return m.eventIDs.flashscore===fields.AA&&(!m.homeIDs?.flashscore||m.homeIDs.flashscore===fields.PX)&&(!m.awayIDs?.flashscore||m.awayIDs.flashscore===fields.PY);
   return same(m.home,fields.AE)&&same(m.away,fields.AF);
  });
  if(hits.length!==1){unmatched.push({competition,date,home:fields.AE,away:fields.AF,event:fields.AA});continue;}
  const m=hits[0];let clock=null;
  if(!final){if(fields.AC==='38')clock='Ημίχρονο';else if(sport===1&&['12','13'].includes(fields.AC)){
   const elapsed=Math.floor((Date.parse(stamp)-Number(fields.AO)*1000)/60000),half=fields.AC==='13'?2:1;
   if(Number(fields.AO)>0&&elapsed>=0&&elapsed<=70){const minute=(half===2?45:0)+elapsed,limit=half===2?90:45;clock=(minute>limit?limit+'+'+(minute-limit):minute)+'′';}
  }else if(sport===3&&+fields.AC>=22&&+fields.AC<=25)clock=(+fields.AC-21)+'η περ.';else if(sport===12&&+fields.AC>=17&&+fields.AC<=21)clock=(+fields.AC-16)+'ο σετ';}
  entries.push({...m,score:points,scoreState:final?'final':'live',clock,scoreClock:clock,checkedAt:stamp,scoreCheckedAt:stamp,eventIDs:{...m.eventIDs,flashscore:fields.AA},homeIDs:{...m.homeIDs,flashscore:fields.PX},awayIDs:{...m.awayIDs,flashscore:fields.PY},source:'https://www.flashscore.gr/',provider:'Flashscore',scoreProvider:'Flashscore',sourceUpdatedAt:fields.AO?new Date(Number(fields.AO)*1000).toISOString():null});
 }
 return{entries,unmatched,checkedAt:stamp};
}
export function verifiedScoreData(payload,matches,{date,now=Date.now()}={}){
 if(payload?.season!=='2026-27'||payload.provider!=='SportsHub live relay'||!Array.isArray(payload.entries))throw Error('Invalid live relay');
 return payload.entries.filter(x=>x&&x.date===date&&score(x.score)&&['live','final'].includes(x.scoreState)&&Date.parse(x.scoreCheckedAt)<=now+60000&&matches.filter(m=>sameResultMatch(m,x)).length===1).map(x=>({...x,id:matches.find(m=>sameResultMatch(m,x)).id,scoreState:x.scoreState==='live'&&now-Date.parse(x.scoreCheckedAt)>=90000?'current':x.scoreState}));
}
let config=FLASH_DEFAULT,configChecked=0;const pending=new Map();
export async function loadFlashScores(matches,date,{competitionIDs,fetchImpl=fetch,force=false,onUpdate}={}){
 const ids=(competitionIDs||[...new Set(matches.map(m=>m.competition))]).filter(id=>matches.some(m=>m.competition===id&&m.date===date)),sports=[...new Set(Object.values(flashLeagues).filter(([id])=>ids.includes(id)).map(([,sport])=>sport))];if(!sports.length)return{entries:[],errors:[],sources:[],succeeded:[]};
 const taskKey=date+'|'+sports.join(',');if(pending.has(taskKey))return pending.get(taskKey);
 const task=(async()=>{
 const entries=[],errors=[],sources=[],succeeded=[];
 // The relay also carries the latest public configuration; a failed relay never blocks direct scores.
 const relay=(async()=>{try{const r=await fetchImpl(LIVE_DATA+'?t='+Date.now(),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(3500)});if(!r.ok)throw Error('Relay HTTP '+r.status);const p=await r.json();if(p.flashscore&&Date.now()-configChecked>300000){flashURL(p.flashscore,sports[0],date);config=p.flashscore;configChecked=Date.now();}const verified=verifiedScoreData(p,matches,{date});if(verified.length)onUpdate?.({date,entries:verified,errors:[...errors],sources:['SportsHub live relay'],succeeded:[...new Set(verified.map(x=>x.competition))],checkedAt:p.checkedAt});return verified;}catch(e){errors.push({id:'live-relay',error:e.message});return[];}})();
 await Promise.all(sports.map(async sport=>{try{const r=await fetchImpl(flashURL(config,sport,date),{cache:'no-store',credentials:'omit',headers:{'x-fsign':config.sign},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Flashscore HTTP '+r.status);const p=parseFlashscore(await r.text(),matches,{sport,date,cacheAge:r.headers?.get('age')||0});entries.push(...p.entries);succeeded.push(...Object.values(flashLeagues).filter(([,s])=>s===sport).map(([id])=>id));sources.push('Flashscore');onUpdate?.({date,entries:[...entries],errors:[...errors],sources:[...new Set(sources)],succeeded:[...succeeded],checkedAt:new Date().toISOString()});}catch(e){errors.push({id:'flashscore-'+sport,error:e.message});}}));
 const old=await relay;if(old.length){sources.push('SportsHub live relay');succeeded.push(...new Set(old.map(x=>x.competition)));}for(const x of old)if(!entries.some(m=>m.id===x.id&&m.competition===x.competition))entries.push(x);
 return{entries,errors,sources,succeeded,checkedAt:new Date().toISOString()};
 })().finally(()=>pending.delete(taskKey));pending.set(taskKey,task);return task;
}
export function preferScoreSources(matches,candidates){
 const out=[];for(const m of matches){const hits=candidates.filter(x=>sameResultMatch(m,x)&&score(x.score));if(!hits.length)continue;
  const finals=hits.filter(x=>x.scoreState==='final'),eligible=finals.length?finals:hits;
  const rank=x=>x.scoreState!=='final'&&Date.now()-Date.parse(x.scoreCheckedAt||x.checkedAt)>=90000?1:x.provider==='Flashscore'||x.scoreProvider==='Flashscore'?3:2;
  eligible.sort((a,b)=>rank(b)-rank(a)||Date.parse(b.scoreCheckedAt||b.checkedAt)-Date.parse(a.scoreCheckedAt||a.checkedAt));out.push(eligible[0]);
 }for(const x of candidates)if(!matches.some(m=>sameResultMatch(m,x)))out.push(x);return out;
}
