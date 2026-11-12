import{readFile,writeFile}from'node:fs/promises';
import{loadNationalTeams}from'../dist/national-teams.js';
for(const id of ['nations','friendly']){
 const file=new URL('../dist/snapshots/'+id+'-2026-27.json',import.meta.url);let old;try{old=JSON.parse(await readFile(file,'utf8'));}catch{}
 if(Date.now()-Date.parse(old?.retrievedAt)<6*3600000)continue;
 try{const p=await loadNationalTeams(id,'2026-27');await writeFile(file,JSON.stringify(p));console.log(id,p.matches.length);}catch(error){console.error(id,error.message);process.exitCode=1;}
}
