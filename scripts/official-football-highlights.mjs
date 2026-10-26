import{publishers,highlightTeamsMentioned,selectHighlights,highlightMatch}from'../dist/highlights.js';
import{athensDay,shiftDay}from'../dist/core.js';
import{assignedJSON,uploadPage}from'./youtube-publisher-archive.mjs';
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();};
export function parseLeagueVideo(player,publisher,matches,{now=Date.now()}={}){
 const p=publishers.find(p=>p.id===publisher),v=player?.videoDetails,f=player?.microformat?.playerMicroformatRenderer;
 if(!['laliga','seriea'].includes(publisher)||!p||v?.channelId!==p.channel||!/^[-\w]{11}$/.test(v.videoId||'')||v.isLiveContent||!f?.availableCountries?.includes('GR'))return[];
 const title=v.title||'',text=title+' '+(v.shortDescription||''),publishedAt=f.publishDate||f.uploadDate;
 if(!Number.isFinite(Date.parse(publishedAt))||! /highlights|resumen/i.test(title)||/full match|classic|throwback|preview|extended.*20(?:1\d|2[0-5])/i.test(title)||! /2026\s*[/–-]\s*(?:20)?27\b/.test(text))return[];
 const day=athensDay(new Date(publishedAt)),score=title.match(/\b(\d+)\s*[-–]\s*(\d+)\b/),round=text.match(/\b(?:J|Jornada\s+|Matchweek\s+|Matchday\s+)(\d+)\b/i);
 const hits=matches.map(highlightMatch).filter(m=>m.competition===publisher&&m.scoreState==='final'&&m.date>=shiftDay(day,-1)&&m.date<=day&&highlightTeamsMentioned(title,m)&&(!score||m.score?.[0]===+score[1]&&m.score?.[1]===+score[2])&&(!round||Number(m.round)===+round[1])).map(m=>({publisher,channelId:p.channel,videoId:v.videoId,title,publishedAt,gameDate:m.date,competition:publisher,season:'2026-27',kind:'game',availableCountries:f.availableCountries}));
 return hits.length===1&&selectHighlights(hits,matches.map(highlightMatch).find(m=>m.competition===publisher&&m.date===hits[0].gameDate&&highlightTeamsMentioned(title,m)),{now})?hits:[];
}
export async function loadLeagueHighlights(matches,{fetchText=get,now=Date.now(),known=new Set()}={}){
 const videos=[],errors=[];let scanned=0;
 await Promise.all(['laliga','seriea'].map(async publisher=>{try{
  const handle=publisher==='laliga'?'LaLiga':'seriea',html=await fetchText('https://www.youtube.com/@'+handle+'/videos?hl=en&gl=US');
  const entries=uploadPage(assignedJSON(html,'ytInitialData')).videos.filter(v=>/highlights|resumen/i.test(v.title)).slice(0,40);
  if(!entries.length)throw Error('No official uploads found');let cursor=0;
  await Promise.all(Array.from({length:3},async()=>{while(cursor<entries.length){const entry=entries[cursor++],p=publishers.find(p=>p.id===publisher);if(known.has(p.channel+'|'+entry.id))continue;scanned++;try{const html=await fetchText('https://www.youtube.com/watch?v='+entry.id+'&hl=en&gl=GR');videos.push(...parseLeagueVideo(assignedJSON(html,'ytInitialPlayerResponse'),publisher,matches,{now}));}catch(e){errors.push(publisher+' '+entry.id+': '+e.message);}}}));
 }catch(e){errors.push(publisher+': '+e.message);}}));return{videos,errors,scanned};
}
const decode=s=>String(s||'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replaceAll('&amp;','&').replaceAll('&quot;','"');
export function ertHighlightURL(url){try{const u=new URL(url);return u.origin==='https://www.ertsports.gr'&&/^\/podosfairo\/super-league-2\/[a-z0-9-]+\/$/.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}}
export function parseERTVideo(html,url,matches,{now=Date.now()}={}){
 if(!ertHighlightURL(url))return[];
 const meta=key=>decode(html.match(new RegExp('<meta[^>]+property="'+key+'"[^>]+content="([^"]+)"','i'))?.[1]);
 const title=meta('og:title'),publishedAt=meta('article:published_time'),score=title.match(/\b(\d+)\s*[-–]\s*(\d+)\b/);
 if(!/σημαντικ[οό]τερες στιγμ|στιγμι[οό]τυπ|highlights/i.test(title)||!score||!Number.isFinite(Date.parse(publishedAt))||!/<iframe[^>]+(?:src|data-lazy-src)="https:\/\/player\.glomex\.com\/integration\/1\/integration\.html\?/i.test(html))return[];
 const day=athensDay(new Date(publishedAt)),hits=matches.map(highlightMatch).filter(m=>m.competition==='sl2'&&m.scoreState==='final'&&m.date>=shiftDay(day,-1)&&m.date<=day&&m.score?.[0]===+score[1]&&m.score?.[1]===+score[2]&&highlightTeamsMentioned(title,m)).map(m=>({m,v:{publisher:'ert-web',competition:'sl2',kind:'game',videoId:'ert-'+new URL(url).pathname.split('/').filter(Boolean).at(-1),url,sourceURL:url,title,publishedAt,gameDate:m.date}})).filter(({m,v})=>selectHighlights([v],m,{now}));
 return hits.length===1?[hits[0].v]:[];
}
export async function loadERTHighlights(matches,{fetchText=get,now=Date.now()}={}){
 const urls=new Set(),videos=[],errors=[];
 for(const page of ['https://www.ertsports.gr/podosfairo/super-league-2/','https://www.ertsports.gr/podosfairo/super-league-2/page/2/'])try{const html=await fetchText(page);for(const m of html.matchAll(/href=["']([^"']+)["']/g)){const u=decode(m[1]);if(ertHighlightURL(u)&&/stigmes|stigmiotyp|highlights/.test(u))urls.add(u);}}catch(e){errors.push(page+': '+e.message);}
 let cursor=0;const pending=[...urls].slice(0,24);await Promise.all(Array.from({length:3},async()=>{while(cursor<pending.length){const url=pending[cursor++];try{videos.push(...parseERTVideo(await fetchText(url),url,matches,{now}));}catch(e){errors.push(url+': '+e.message);}}}));return{videos,errors,scanned:pending.length};
}
