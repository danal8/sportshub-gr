import{readdir,copyFile,mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,''));
async function copy(dir,relative=''){await mkdir(path.join(root,'docs',relative),{recursive:true});for(const entry of await readdir(dir,{withFileTypes:true})){if(['server','.openai'].includes(entry.name)||entry.name.includes('-personal-'))continue;const rel=path.join(relative,entry.name);if(entry.isDirectory())await copy(path.join(dir,entry.name),rel);else await copyFile(path.join(dir,entry.name),path.join(root,'docs',rel));}}
await copy(path.join(root,'dist'));await writeFile(path.join(root,'docs','.nojekyll'),'');console.log('GitHub Pages assets prepared in docs/');
