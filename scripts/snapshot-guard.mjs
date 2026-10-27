import{competitions}from'../dist/data.js';
import{readFile,writeFile,mkdir,readdir,copyFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';
const counts={seriea:380,ligue1:306,elite:240,'volley-w':132};
export function snapshotErrors(p,id,previous){
 const errors=[];if(p?.season!=='2026-27'||!Array.isArray(p.matches)||!p.matches.length)return['Invalid season or empty schedule'];
 if(counts[id]&&p.matches.length!==counts[id])errors.push('Unexpected fixture count: '+p.matches.length);
 if(previous?.matches?.length&&p.matches.length<previous.matches.length*.9)errors.push('More than 10% of fixtures disappeared');
 const ids=new Set(),pairs=new Set();for(const m of p.matches){if(!m.id||ids.has(m.id))errors.push('Duplicate/missing fixture ID: '+m.id);ids.add(m.id);if(!m.home||!m.away||m.home===m.away)errors.push('Invalid teams: '+m.id);if(m.date&&(!/^202[67]-\d{2}-\d{2}$/.test(m.date)||!Number.isFinite(Date.parse(m.date))))errors.push('Invalid date: '+m.id);if(m.scoreState==='final'&&(!Array.isArray(m.score)||m.score.length!==2||m.score.some(n=>!Number.isInteger(n)||n<0)))errors.push('Invalid final: '+m.id);const pair=[m.date,m.round,m.home,m.away].join('|');if(pairs.has(pair))errors.push('Duplicate fixture: '+pair);pairs.add(pair);}
 return errors;
}
export async function guardSnapshots({save=false,root='dist/snapshots',backup='.snapshot-checkpoint'}={}){
 await mkdir(backup,{recursive:true});const files=(await readdir(root)).filter(f=>competitions.some(c=>f===c.id+'-2026-27.json')),report=[];
 for(const file of files){if(save){await copyFile(root+'/'+file,backup+'/'+file);continue;}let old;try{old=JSON.parse(await readFile(backup+'/'+file));}catch{continue;}let errors;try{errors=snapshotErrors(JSON.parse(await readFile(root+'/'+file)),file.replace('-2026-27.json',''),old);}catch(e){errors=[e.message];}if(errors.length)await copyFile(backup+'/'+file,root+'/'+file);report.push({competition:file.replace('-2026-27.json',''),status:errors.length?'retained-previous':'validated',errors});}
 if(!save){await writeFile(root+'/snapshot-integrity.json',JSON.stringify({checkedAt:new Date().toISOString(),competitions:report}));for(const r of report)if(r.errors.length)console.warn('::warning::'+r.competition+': retained previous snapshot: '+r.errors.join('; '));}return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await guardSnapshots({save:process.argv.includes('--save')});
