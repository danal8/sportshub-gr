import{readFile,writeFile}from'node:fs/promises';
const folder=new URL('../supabase/functions/sportshub-nba-highlights/',import.meta.url);
for(const name of['core.js','results.js','team-aliases.js','result-reconciliation.js','badges.js','highlights.js']){const content=(await readFile(new URL('../dist/'+name,import.meta.url),'utf8')).replace(/\?v=\d+/g,'');await writeFile(new URL(name,folder),content);}
await writeFile(new URL('nba-recaps.js',folder),(await readFile(new URL('./nba-recaps.mjs',import.meta.url),'utf8')).replaceAll('../dist/','./'));
