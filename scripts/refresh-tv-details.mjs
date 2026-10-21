import{readFile,writeFile}from'node:fs/promises';
import{loadTVDetails}from'../dist/tv-details.js';
const root=new URL('../dist/snapshots/',import.meta.url),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Persist normalized public facts only; browser also refreshes sources directly.
for(let offset=0;offset<7;offset++){
 const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);const date=d.toISOString().slice(0,10);
 try{await readFile(new URL('tv-'+date+'.json',root));const p=await loadTVDetails(date,{force:true,fallback:false});if(p.entries.length){await writeFile(new URL('tv-details-'+date+'.json',root),JSON.stringify(p));console.log(date,p.entries.length,'events',p.entries.filter(e=>e.odds).length,'DraftKings prices');}}catch(e){console.warn(date,e.message);}
}
