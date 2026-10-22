import {sameTeam} from '../dist/detail-data.js';
import {teamKey} from '../dist/badges.js';
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const base=(team,source,provider,players)=>({team,source,provider,season:'2026–27',checkedAt:new Date().toISOString(),staff:[],players});
export function parseEsakeRoster(html,source){
 const team=clean(html.match(/<td[^>]*>\s*ΟΜΑΔΑ\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1]);
 if(!team||!source.includes('idchampionship=184645B9'))throw Error('Missing verified GBL season or team');
 const players=[];
 for(const m of html.matchAll(/background:url\(['"]([^'"]*\/dat\/esakeplayer\/([^/]+)\/[^'"]+)['"]\)[\s\S]*?<div class="player-title">([\s\S]*?)<div class="player-details/gi)){
  const title=m[3],name=clean(title.match(/player-title-name[^>]*>([\s\S]*?)<div class="player-title-post/si)?.[1]),position=clean(title.match(/player-title-post[^>]*>([\s\S]*?)<\/div>/i)?.[1]),jersey=clean(title.match(/player-dash[^>]*>[^<]*<\/span>([^<]*)/i)?.[1]);
  if(name)players.push({id:m[2],name,position,jersey,age:null,country:'',photo:new URL(m[1],source).href.replace(/^http:/,'https:'),photos:[]});
 }
 const unique=[...new Map(players.map(p=>[p.id,p])).values()];if(!unique.length)throw Error('Empty GBL roster');return base(team,source,'ΕΣΑΚΕ',unique);
}
export function parseMenRoster(html,team,source){
 if(!source.includes('/2026-27/teams/')||!html.includes('2026-27'))throw Error('Wrong volleyball season');
 const players=[];
 for(const m of html.matchAll(/<tr\b[^>]*>\s*<td[^>]*>[\s\S]*?<\/tr>/gi)){
  const row=m[0],toggle=row.match(/id=['"]togglep_(\d+)['"]/);if(!toggle)continue;
  const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]));if(cells.length!==7||!/^\d+$/.test(cells[0]))continue;
  const details=html.slice(m.index+row.length).match(new RegExp("<tr class=['\"]togglep_"+toggle[1]+"['\"][\\s\\S]*?<img[^>]*class=['\"][^'\"]*player-ico[^>]*src=['\"]([^'\"]+)","i"));
  const image=details?.[1],photo=image?.includes('/media/bearleague/')?new URL(image,source).href:null;
  players.push({id:teamKey(team)+':'+teamKey(cells[1]),name:cells[1],jersey:cells[0],position:cells[5],country:cells[2],age:null,photo,photos:photo?[photo]:[]});
 }
 const unique=[...new Map(players.map(p=>[p.id,p])).values()];if(unique.length<6)throw Error('Incomplete volleyball roster structure');return base(team,source,'ΕΣΑΠ',unique);
}
export async function greekRosters(id,fetchJSON,fetchText){
 const records=[];
 if(id==='gbl'){
  const directory=await fetchText('https://www.esake.gr/el/action/EsakeTeams');
  const ids=[...new Set([...directory.matchAll(/EsaketeamView\?idteam=([A-F0-9]+)&mode=1&idchampionship=184645B9/g)].map(m=>m[1]))];
  for(const team of ids){const url='https://www.esake.gr/el/action/EsaketeamView?idteam='+team+'&mode=1&idchampionship=184645B9';try{records.push(parseEsakeRoster(await fetchText(url),url));}catch(error){console.log('GBL '+team+': '+error.message);}}
 }
 if(id==='volley-w'){
  const root='https://volleyball.gr/wp-json/sportspress/v2/',teams=await fetchJSON(root+'teams?leagues=11&seasons=298&per_page=100&_fields=id,title'),all=[];
  for(let page=1;page<=10;page++){const rows=await fetchJSON(root+'players?leagues=11&seasons=298&per_page=100&page='+page+'&_fields=id,title,number,current_teams,teams,seasons,leagues,positions,metrics,nationalities,_links,_embedded&_embed=wp:featuredmedia');if(!Array.isArray(rows))throw Error('Invalid player page');all.push(...rows);if(rows.length<100)break;if(page===10)throw Error('Truncated volleyball player directory');}
  for(const t of teams){const players=all.filter(p=>p.seasons?.includes(298)&&p.leagues?.includes(11)&&(p.current_teams||p.teams||[]).includes(t.id)).map(p=>({id:String(p.id),name:clean(p.title.rendered),jersey:String(p.number??''),position:'',age:null,country:(p.nationalities||[]).join(', '),photo:p._embedded?.['wp:featuredmedia']?.[0]?.source_url||null,photos:[]}));if(players.length)records.push(base(clean(t.title.rendered),root+'teams/'+t.id,'ΕΟΠΕ',players));}
 }
 if(id==='volley-m'){
  const root='https://www.volleyleague.gr',html=await fetchText(root+'/index.php/season/2026-27/teams/panathinaikos');
  const links=new Map([...html.matchAll(/href=['"]([^'"]*\/season\/2026-27\/teams\/[^'"]+)['"][^>]*title=['"]([^'"]+)['"]/g)].map(m=>[new URL(m[1],root).href,clean(m[2].split(' - ')[0])]));
  for(const [url,team]of links){try{records.push(parseMenRoster(url.endsWith('/panathinaikos')?html:await fetchText(url),team,url));}catch(error){console.log('Volley '+team+': '+error.message);}}
 }
 return records;
}
