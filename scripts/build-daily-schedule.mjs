import{readFile,writeFile}from'node:fs/promises';
import{fileURLToPath}from'node:url';
import path from'node:path';
import{competitions}from'../dist/data.js';
import{scheduleEntries}from'../dist/schedule.js';
import{athensDay,shiftDay}from'../dist/core.js';
import{setBadgeCatalog,badgeSources}from'../dist/badges.js';
const root=fileURLToPath(new URL('..',import.meta.url));
export async function buildDailySchedule(){
 try{setBadgeCatalog(JSON.parse(await readFile(path.join(root,'dist/badges/catalog.json'),'utf8')));}catch{}
 const records=await Promise.all(competitions.map(async c=>{try{const p=JSON.parse(await readFile(path.join(root,'dist/snapshots',c.id+'-2026-27.json'),'utf8'));return (!p.season||p.season==='2026-27')&&Array.isArray(p.matches)?{c,p}:null;}catch{return null;}}));
 const valid=records.filter(Boolean),checked=valid.map(({p})=>p.retrievedAt).filter(t=>Number.isFinite(Date.parse(t))).sort((a,b)=>Date.parse(b)-Date.parse(a))[0];
 if(!checked)throw Error('No dated schedules');
 const anchor=athensDay(new Date(checked)),start=shiftDay(anchor,-7),end=shiftDay(anchor,14),matches=[],sources=[];
 for(const{c,p}of valid){sources.push({id:c.id,name:c.name,source:p.source,retrievedAt:p.retrievedAt,copyright:p.copyright,terms:p.terms});
  for(const m of scheduleEntries(p,c).filter(m=>m.date>=start&&m.date<=end)){
   // Preserve fixture/source identities and timestamps; omit unrelated season tables.
   const entry={...m,scoreCheckedAt:m.scoreCheckedAt||p.retrievedAt};
   for(const side of ['home','away']){const b=badgeSources(m[side],m[side+'Badge'],c.id,c.sport);if(b.src)entry[side+'Badge']=b.src;else delete entry[side+'Badge'];}
   for(const key of Object.keys(entry))if(entry[key]==null)delete entry[key];
   matches.push(entry);
  }
 }
 const payload={season:'2026-27',retrievedAt:checked,start,end,sources,matches};
 await writeFile(path.join(root,'dist/snapshots/daily-2026-27.json'),JSON.stringify(payload)+'\n');
 return payload;
}
