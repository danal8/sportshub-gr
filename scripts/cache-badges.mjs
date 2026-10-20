import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {directProvider} from '../dist/direct.js';
import {teamKey} from '../dist/badges.js';
const root=new URL('../dist/',import.meta.url),teams={},urls={};
const seed=process.argv.includes('--seed');
function add(id,name,url,aliases=[]){if(!name||!url?.startsWith('https://'))return;const table=teams[id]||={};for(const n of [name,...aliases])table[teamKey(n)]=url;}
function ingest(id,p){for(const m of p.matches||[])for(const side of ['home','away'])add(id,m[side],m[side+'Badge'],m[side+'Aliases']);}
for(const file of await readdir(new URL('snapshots/',root))){if(!file.endsWith('-2026-27.json'))continue;const p=JSON.parse(await readFile(new URL('snapshots/'+file,root)));ingest(file.replace('-2026-27.json',''),p);}
if(!seed)for(const id of ['sl','pl','bund','laliga','cl','europa','el','eurocup','volley-w']){try{ingest(id,await directProvider(id,'2026-27'));}catch(e){console.warn(id,e.message);}}
// Independent badge metadata fills gaps or broken URLs in schedule providers.
if(!seed)for(const [id,sport,league]of [['pl','soccer','eng.1'],['bund','soccer','ger.1'],['laliga','soccer','esp.1'],['cl','soccer','uefa.champions'],['europa','soccer','uefa.europa'],['conference','soccer','uefa.europa.conf'],['nba','basketball','nba']]){try{const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams?limit=1000`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const p=await r.json();for(const {team:t}of p.sports?.[0]?.leagues?.[0]?.teams||[])add(id,t.displayName,t.logos?.[0]?.href,[t.shortDisplayName,t.name,t.abbreviation].filter(Boolean));}catch(e){console.warn('Badge metadata',id,e.message);}}
if(!seed)for(const [id,league]of [['conference','5071']]){try{const r=await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookup_all_teams.php?id=${league}`,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const p=await r.json();for(const t of p.teams||[])add(id,t.strTeam,t.strBadge||t.strTeamBadge,(t.strAlternate||'').split('|').filter(Boolean));}catch(e){console.warn(id,e.message);}}
const sl=[['ΑΕΚ','156284491142'],['Άρης','153009594452'],['Asteras Aktor','17207032014'],['Ατρόμητος','137355275659'],['Βόλος','179214611037'],['Ηρακλής','178360075999'],['Καλαμάτα','178281675545'],['Κηφισιά','175145739550'],['Λεβαδειακός','179119995167'],['Ολυμπιακός','172070387647'],['ΟΦΗ','178972707338'],['Παναθηναϊκός','126935356667'],['Παναιτωλικός','153451533633'],['ΠΑΟΚ','137355273012']];
for(const [name,file]of sl)add('sl',name,`https://www.slgr.gr/img/uploads/big/${file}.png`);
await mkdir(new URL('badges/',root),{recursive:true});
const sources=[...new Set(Object.values(teams).flatMap(t=>Object.values(t)))];let cursor=0,downloaded=0;
async function reader(){while(cursor<sources.length){const url=sources[cursor++];try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const type=r.headers.get('content-type')?.split(';')[0],ext={'image/png':'png','image/jpeg':'jpg','image/svg+xml':'svg','image/webp':'webp','image/gif':'gif'}[type];if(!ext)throw Error('Not an image');const data=new Uint8Array(await r.arrayBuffer());if(data.length>2000000||data.length<20)throw Error('Invalid image size');const file=createHash('sha256').update(url).digest('hex').slice(0,24)+'.'+ext;await writeFile(new URL('badges/'+file,root),data);urls[url]='./badges/'+file;downloaded++;}catch(e){console.warn('Badge unavailable:',url,e.message);}}}
if(!seed)await Promise.all([reader(),reader(),reader(),reader()]);
await writeFile(new URL('badges/catalog.json',root),JSON.stringify({retrievedAt:new Date().toISOString(),teams,urls}));
console.log(`Badges: ${downloaded}/${sources.length} cached locally across ${Object.keys(teams).length} competitions`);
