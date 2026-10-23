import{selectHighlights,highlightTeamsMentioned}from'../dist/highlights.js';
import{publisherOEmbed}from'./youtube-publisher-archive.mjs';
const decode=s=>String(s||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replaceAll('&quot;','"').replaceAll('&amp;','&');
export function embeddedYouTubeIDs(html){return[...new Set([...html.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/|\/files\/YouTube\/)([\w-]{11})/g)].map(m=>m[1]))];}
export function parsePressPlayers(html,matches,sourceURL,{now=Date.now()}={}){
 const source=new URL(sourceURL);if(source.origin!=='https://www.protothema.gr'||!/^\/sports\/article\/\d+\//.test(source.pathname))return[];
 let publishedAt;for(const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))try{const p=JSON.parse(m[1]);if(p['@type']==='NewsArticle')publishedAt=p.datePublished;}catch{}if(!Number.isFinite(Date.parse(publishedAt)))return[];
 const headings=[...html.matchAll(/<strong[^>]*>([\s\S]*?)<\/strong>/g)],videos=[];
 for(let i=0;i<headings.length;i++){const title=decode(headings[i][1].replace(/<[^>]+>/g,' ')).trim(),score=title.match(/\b(\d+)\s*[-–]\s*(\d+)\b/);if(!score)continue;const section=html.slice(headings[i].index+headings[i][0].length,headings[i+1]?.index||html.length),url=decode(section.match(/<(?:amp-)?iframe[^>]*\bsrc="(https:\/\/platform\.firstview\.gr\/player\/[^\"]+)"/)?.[1]);if(!url)continue;
 const hits=matches.filter(m=>m.scoreState==='final'&&m.score?.[0]===Number(score[1])&&m.score?.[1]===Number(score[2])&&highlightTeamsMentioned(title,m)&&Date.parse(publishedAt)>=Date.parse(m.date+'T00:00:00Z')-10800000&&Date.parse(publishedAt)<=Date.parse(m.date+'T00:00:00Z')+2*86400000);
 if(hits.length!==1)continue;const m=hits[0],v={publisher:'press-player',competition:m.competition,title,gameDate:m.date,publishedAt,kind:'game',url,sourceURL:source.href,videoId:url.split('/').at(-1)};if(selectHighlights([v],m,{now}))videos.push(v);
 }return videos;
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);return r;}
export async function loadPressEmbeds(matches,{known=new Set()}={}){
 const index=await(await get('https://www.protothema.gr/sports/')).text(),links=[...index.matchAll(/<a\b[^>]*href="([^\"]*\/sports\/article\/[^\"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter(m=>/Europa|Conference|γκολ.*βραδιά/i.test(m[2].replace(/<[^>]+>/g,' '))).map(m=>new URL(decode(m[1]),'https://www.protothema.gr').href),urls=[...new Set(links)].filter(u=>u.startsWith('https://www.protothema.gr/sports/article/')).slice(0,6),videos=[],errors=[],ids=new Set();
 await Promise.all(urls.map(async url=>{try{const html=await(await get(url)).text();videos.push(...parsePressPlayers(html,matches,url));for(const id of embeddedYouTubeIDs(html))if(!known.has('UCgMUmr7uLDalwVk63Sf6pBw|'+id))ids.add(id);}catch(e){errors.push(url+': '+e.message);}}));
 let cursor=0;const pending=[...ids].slice(0,50);await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.length){const id=pending[cursor++];try{const r=await get('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+id));videos.push(...publisherOEmbed(await r.json(),id,'magenta'));}catch(e){errors.push(id+': '+e.message);}}}));
 return{videos,errors,pages:urls.length};
}
