import {aliases} from './team-aliases.js?v=52';
export const teamKey=name=>String(name||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('el').replace(/[^\p{L}\p{N}]/gu,'');
const sports={bcl:'basketball',cev:'volleyball',seriea:'football',ligue1:'football',sl:'football',sl2:'football',pl:'football',bund:'football',laliga:'football',cl:'football',europa:'football',conference:'football',elite:'basketball',gbl:'basketball',el:'basketball',eurocup:'basketball',nba:'basketball','volley-m':'volleyball','volley-w':'volleyball'};
let catalog={teams:{},urls:{}},pending;
const https=url=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
export function setBadgeCatalog(value){catalog=value?.teams?value:{teams:{},urls:{}};}
export function rememberBadges(payload,id){const teams=catalog.teams[id]||={};for(const m of payload.matches||[]){for(const side of ['home','away']){const url=m[side+'Badge'];if(!https(url))continue;for(const name of [m[side],...(m[side+'Aliases']||[])]){const key=teamKey(name);if(!catalog.urls?.[teams[key]])teams[key]=url;}}}return payload;}
export function badgeFor(name,id,sport){
 const plain=String(name||'').replace(/\./g,'').replace(/\b(?:fc|cf|afc|sc|ssc|sk)\b/gi,'').trim();
 const candidates=[name,plain,...(aliases[teamKey(name)]||[]),...(aliases[teamKey(plain)]||[])].map(teamKey),maps=[catalog.teams[id]];
 for(const [key,teams] of Object.entries(catalog.teams))if(key!==id&&sports[key]===(sport||sports[id]))maps.push(teams);
 let fallback=null;for(const teams of maps)for(const key of candidates){const url=teams?.[key];if(catalog.urls?.[url]||url?.startsWith('./badges/'))return url;if(!fallback&&https(url))fallback=url;}
 return fallback;
}
export function badgeSources(name,url,id,sport){
 const registered=badgeFor(name,id,sport),original=catalog.urls?.[url]?url:catalog.urls?.[registered]?registered:https(url)?url:registered;
 if(!original)return {};
 return {src:catalog.urls?.[original]||original,fallback:https(original)?original:null};
}
export function loadBadgeCatalog(){return pending||=(async()=>{try{const r=await fetch('./badges/catalog.json',{cache:'no-cache',signal:AbortSignal.timeout(5000)});if(r.ok){const p=await r.json();for(const [id,teams]of Object.entries(catalog.teams))p.teams[id]={...p.teams[id],...teams};setBadgeCatalog(p);}}catch{}return catalog;})();}
