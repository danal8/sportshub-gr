import{broadcastDetails}from'../dist/tv-meta.js';
import{readFile,writeFile,readdir}from'node:fs/promises';import{fileURLToPath}from'node:url';import path from'node:path';
import{competitions}from'../dist/data.js';
import{setBadgeCatalog,badgeSources}from'../dist/badges.js';
import{applyTVDetails}from'../dist/tv-details.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),folder=path.join(root,'snapshots'),ids=['elite','gbl','sl2','volley-w','volley-m','greek-cup'];
export async function buildTVGuide(){
 const records=await Promise.all(ids.map(async id=>{const p=JSON.parse(await readFile(path.join(folder,id+'-2026-27.json'),'utf8'));if(p.season!=='2026-27'||!Array.isArray(p.matches))throw Error('Invalid TV source '+id);return{id,p,c:competitions.find(c=>c.id===id)};}));
 try{setBadgeCatalog(JSON.parse(await readFile(path.join(root,'badges/catalog.json'),'utf8')));}catch{}
 const dates=new Set((await readdir(folder)).filter(n=>/^tv-\d{4}-\d{2}-\d{2}\.json$/.test(n)).map(n=>n.slice(3,13)));
 for(const m of records.find(r=>r.id==='greek-cup')?.p.matches||[])if(m.date&&m.time&&m.channel)dates.add(m.date);
 const days={};for(const date of [...dates].sort()){
  let nova;try{nova=JSON.parse(await readFile(path.join(folder,'tv-'+date+'.json'),'utf8'));}catch{}
  const validNova=nova?.date===date&&Array.isArray(nova.matches);
  const sources=validNova?[{id:'nova',source:nova.source,retrievedAt:nova.retrievedAt,sections:nova.sections}]:[],matches=(validNova?nova.matches:[]).map(m=>m.competitionLabel?{...m,...broadcastDetails(m.competitionLabel)}:m).filter(m=>m.date===date&&m.live&&m.time&&m.channel);
  for(const{id,p,c}of records){sources.push({id,source:p.source,retrievedAt:p.retrievedAt,copyright:p.copyright,terms:p.terms,sections:p.sections?{matches:p.sections.matches}:undefined});for(const m of p.matches.filter(m=>m.date===date&&m.time&&m.channel))matches.push({...m,id:'tv-'+m.id,competition:id,competitionLabel:c.name,sportLabel:c.sport==='football'?'Ποδόσφαιρο':c.sport==='volleyball'?'Βόλεϊ':'Μπάσκετ',live:true,source:m.source||p.source});}
  let details=[];try{const p=JSON.parse(await readFile(path.join(folder,'tv-details-'+date+'.json'),'utf8'));if(p.date===date)details=p.entries||[];}catch{}
  const checked=Math.max(...sources.map(s=>Date.parse(s.retrievedAt)).filter(Number.isFinite));
  const enriched=applyTVDetails(matches,details,checked).map(m=>{const result={...m},c=competitions.find(c=>c.id===m.competition);for(const side of ['home','away']){const b=badgeSources(m[side],m[side+'Badge'],m.competition,c?.sport);if(b.src)result[side+'Badge']=b.src;else delete result[side+'Badge'];}for(const k of Object.keys(result))if(result[k]==null||/^score/.test(k)||k==='clock')delete result[k];return result;});
  days[date]={sources,matches:enriched};
 }
 const p={season:'2026-27',days};await writeFile(path.join(folder,'tv-guide-2026-27.json'),JSON.stringify(p)+'\n');return p;
}
