import {writeFile} from 'node:fs/promises';
import {handleApi} from '../worker/runtime.mjs';
import {pathToFileURL} from 'node:url';
const source='https://www.volleyleague.gr/index.php/season/2026-27/volley-league-2026-27';
export function parseMen(html){
 const body=html.match(/class="itemFullText">([\s\S]*?)<\/div>/)?.[1];
 if(!body?.includes('2026-27'))throw Error('Missing men season');
 const lines=body.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').split('\n').map(s=>s.trim());
 let round,date;const matches=[];
 for(const line of lines){const heading=line.match(/^(\d+)η αγωνιστική(?:\s*[–-]\s*(\d+)\/(\d+)\/(202[67]))?/i);if(heading){round=heading[1];date=heading[2]?`${heading[4]}-${heading[3].padStart(2,'0')}-${heading[2].padStart(2,'0')}`:null;continue;}
 if(!round)continue;let fixture=line,time=null,day=date,channel=null;
 const detail=line.match(/^(\d+)\/(\d+)\/(202[67])\s*[–-]\s*(\d{2}:\d{2})[\s\S]*?:\s*(.+)$/);
 if(detail){day=`${detail[3]}-${detail[2].padStart(2,'0')}-${detail[1].padStart(2,'0')}`;time=detail[4];fixture=detail[5];channel=line.match(/\((ΕΡΤ-2|ERTSPORTS)\)/)?.[1]||null;}
 const teams=fixture.split(/\s+-\s+/);if(teams.length!==2||!teams.every(Boolean))continue;
 matches.push({id:`volley-m-${round}-${matches.length}`,home:teams[0],away:teams[1],round,date:day,time,channel,source,provisional:!time});
 }
 if(matches.length!==132||new Set(matches.map(m=>m.round)).size!==22)throw Error(`Incomplete men schedule ${matches.length}`);
 return matches;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const id of ['sl2','elite','gbl']){
  const r=await handleApi(new Request(`https://local.test/api/data?id=${id}&season=2026-27`));const p=await r.json();if(!r.ok)throw Error(p.error);
  await writeFile(new URL(`../dist/snapshots/${id}-2026-27.json`,import.meta.url),JSON.stringify(p));console.log(id,p.matches.length);
 }
 const r=await fetch(source,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('ESAP '+r.status);
 const html=await r.text(),matches=parseMen(html);
 const names={'panathinaikos':'Παναθηναϊκός Α.Ο.','p-a-o-k':'Π.Α.Ο.Κ.','aons-milon':'Α.Ο.Ν.Σ. Μίλων','olympiakos-s-f-p':'Ολυμπιακός Σ.Φ.Π. ΟΝΕΧ','o-o-f-heraklion':'Ο.Φ.Η.','ao-kalamata-80':'Α.Ο.Καλαμάτα Affidea V.C','a-o-p-kifisias':'Α.Ο.Π. Κηφισιάς','panionios-gs':'Πανιώνιος Betsson','floisvos-p-falirou':'Α.Ο.Φλοίσβος Members Paron','a-o-foinikas-syros':'Α.Ο.Φοίνικας Σύρου','rethimno':'Ν.Ο.Π.Ε.Ρεθύμνου','aris':'Α.Σ.Άρης'};
 const badges=new Map([...html.matchAll(/href="\/index.php\/season\/2026-27\/teams\/([^"]+)">\s*<img src="([^"]+)"/g)].map(m=>[names[m[1]],new URL(m[2],source).href]));
 for(const m of matches){m.homeBadge=badges.get(m.home);m.awayBadge=badges.get(m.away);}
 await writeFile(new URL('../dist/snapshots/volley-m-2026-27.json',import.meta.url),JSON.stringify({season:'2026-27',source,retrievedAt:new Date().toISOString(),matches,notice:'Επίσημο πρόγραμμα ΕΣΑΠ. Οι ημερομηνίες αγωνιστικής χωρίς ώρα είναι προσωρινές.'}));console.log('volley-m',matches.length);
}
