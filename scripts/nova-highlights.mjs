import{athensDay,shiftDay}from'../dist/core.js';
import{novaWebCompetition,selectHighlights}from'../dist/highlights.js';
const decode=s=>String(s||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replaceAll('&amp;','&').replaceAll('&quot;','"').replace(/<[^>]+>/g,' ').trim();
export function novaVideoLinks(html){return[...new Set([...html.matchAll(/href=["']([^"']+)["']/g)].map(m=>decode(m[1])).filter(u=>novaWebCompetition(u)&&/highlights|highilghts/i.test(u)))];}
export function parseNovaVideo(html,url,matches,{now=Date.now()}={}){
 const competition=novaWebCompetition(url);if(!competition)return[];const data=[];
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g))try{const p=JSON.parse(m[1]);data.push(...(Array.isArray(p)?p:p['@graph']||[p]));}catch{}
 const v=data.find(x=>x['@type']==='VideoObject'&&x['@id']===url+'#video'&&x.embedUrl?.startsWith(url)),article=data.find(x=>x['@type']==='NewsArticle'&&x.mainEntityOfPage?.['@id']===url);
 if(!v||!article||!Number.isFinite(Date.parse(v.uploadDate))||v.uploadDate!==article.datePublished||!/highlights|highilghts|στιγμι[οό]τυπ/i.test(v.name))return[];
 const publishedAt=v.uploadDate,title=decode(v.name),published=athensDay(new Date(publishedAt)),score=title.match(/(?:^|\s|:)\s*(\d+)\s*[-–]\s*(\d+)(?:\s|$)/);
 if(!score)return[];
 const hits=matches.filter(m=>m.competition===competition&&m.scoreState==='final'&&m.score?.[0]===+score[1]&&m.score?.[1]===+score[2]&&m.date>=shiftDay(published,-1)&&m.date<=published).map(m=>({m,video:{publisher:'nova-web',competition,title,gameDate:m.date,publishedAt,kind:'game',url,sourceURL:url,videoId:'nova-'+url.match(/\/video\/(\d+)/)[1]}})).filter(x=>selectHighlights([x.video],x.m,{now}));
 return hits.length===1?[hits[0].video]:[];
}
export async function loadNovaHighlights(matches,{fetchText=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();},now=Date.now()}={}){
 const urls=new Set(),errors=[],videos=[];for(const url of ['https://www.novasports.gr/','https://www.novasports.gr/web-tv/highlights/'])try{for(const u of novaVideoLinks(await fetchText(url)))urls.add(u);}catch(e){errors.push(url+': '+e.message);}
 let cursor=0;const pending=[...urls].slice(0,45);await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.length){const url=pending[cursor++];try{videos.push(...parseNovaVideo(await fetchText(url),url,matches,{now}));}catch(e){errors.push(url+': '+e.message);}}}));return{videos,errors,scanned:pending.length};
}
