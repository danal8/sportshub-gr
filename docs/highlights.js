import{aliases}from'./team-aliases.js?v=31';
import{teamKey}from'./badges.js?v=26';
import{athensDay,shiftDay}from'./core.js?v=26';
export const publishers=[
 {id:'nba',label:'NBA',channel:'UCWJ2lWNubArHWmf3FIHbfcQ',playlists:['PLmlpqJ_fjNIiioJQQTmpyOSMg78S6B1ty']},
 {id:'el',label:'EuroLeague',channel:'UCGr3nR_XH9r6E5b09ZJAT9w'},
 {id:'ec',label:'EuroCup',channel:'UCpFqOv5z4WKps64GlQS4ytw'},
 {id:'nova',label:'Novasports',channel:'UCEIbXco8hU9oDHXGo1kwIlA'},
 {id:'magenta',label:'Magenta Sport',channel:'UCgMUmr7uLDalwVk63Sf6pBw'}
];
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):'';}).replace(/&(?:amp|lt|gt|quot|apos);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[s]));
const field=(xml,key)=>decode(xml.match(new RegExp('<'+key+'>([\\s\\S]*?)</'+key+'>'))?.[1]);
function namedDate(text){const english=text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i);if(english){const d=new Date(english[0]+' 12:00 UTC');return Number.isFinite(+d)?d.toISOString().slice(0,10):null;}const d=text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);return d?d[3]+'-'+d[2].padStart(2,'0')+'-'+d[1].padStart(2,'0'):null;}
function novaCompetition(text){
 const s=norm(text);if(/γυναικ|women|youth|u19|basketball champions league/.test(s))return null;
 for(const [id,re]of[['eurocup',/eurocup|γιουροκαπ/],['el',/euroleague|ευρωλιγκα/],['sl2',/super league 2|superleague 2|super league ii/],['sl',/super league|superleague/],['pl',/premier league/],['bund',/bundesliga/],['laliga',/laliga|la liga/],['seriea',/serie a/],['ligue1',/ligue 1/],['cl',/champions league/],['europa',/europa league/],['conference',/conference league/],['gbl',/basket league|gbl/],['elite',/elite league/]])if(re.test(s))return id;return null;
}
export function parsePublisherFeed(xml,publisher){
 const source=publishers.find(p=>p.id===publisher);if(!source)throw Error('Unknown publisher');
 const entries=[...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)],videos=[];
 if(!entries.length)throw Error('Empty publisher feed');
 for(const [,entry]of entries){const channel=field(entry,'yt:channelId'),videoId=field(entry,'yt:videoId'),title=field(entry,'title'),publishedAt=field(entry,'published'),description=field(entry,'media:description');
 if(channel!==source.channel||!/^[\w-]{11}$/.test(videoId)||!Number.isFinite(Date.parse(publishedAt)))continue;
 const base={videoId,channelId:channel,title,publishedAt,publisher:source.id},gameDate=namedDate(title);
 if(publisher==='nba'){
  if(!gameDate)continue;
  if(/full game highlights/i.test(title))videos.push({...base,competition:'nba',gameDate,kind:'game'});
  else if(/nightly recap/i.test(title)){
   const chapters=description.split(/\r?\n/).map(line=>{const m=line.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+?\s+at\s+.+?)\s*$/i);return m?{seconds:Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3]),label:m[4]}:null;}).filter(Boolean);
   if(chapters.length)videos.push({...base,competition:'nba',gameDate,kind:'chapters',chapters});
  }
 }else if(publisher==='el'||publisher==='ec'){
  const r=title.match(/\bR(?:ound\s*)?(\d+)\b/i),season=title.match(/\b(20\d{2})[-–](\d{2})\b/);
  if(r&&season&&(/highlights/i.test(title+' '+description)||publisher==='ec'&&/\s[-–]\s/.test(title)&&/\|\s*BKT EuroCup Basketball\s+20\d{2}[-–]\d{2}/i.test(title))&&!/player highlights|last \d+ meetings|preview|full game|live stream|press conference/i.test(title))videos.push({...base,competition:publisher==='ec'?'eurocup':'el',round:Number(r[1]),season:season[1]+'-'+season[2],kind:'game'});
 }else{
  const intro=description.slice(0,650),competition=novaCompetition(title+' '+intro),broadcastDate=gameDate||namedDate(intro);
  if(competition&&broadcastDate&&/highlights|στιγμι[οό]τυπ/i.test(title+' '+intro)&&!/preview|pre game|pregame|δηλ[ωώ]σεις|συν[εέ]ντευξη/i.test(title))videos.push({...base,competition,gameDate:broadcastDate,kind:'game'});
 }
 }
 return videos;
}
function choices(name,extra=[],nba=false){
 const all=[name,...extra].filter(n=>typeof n==='string').flatMap(n=>[n,...aliases[teamKey(n)]||[]]);
 if(nba){const english=all.find(n=>/^[A-Za-z0-9 .]+$/.test(n));if(english)all.push(english.endsWith('Trail Blazers')?'Trail Blazers':english.split(' ').at(-1));}
 if(all.some(n=>/ulm/i.test(n)))all.push('Ουλμ');
 for(const row of [['Club Brugge','Club Brugge KV','Μπριζ'],['Sporting CP','Sporting Lisbon','Σπόρτινγκ'],['LASK Linz','LASK','ΛΑΣΚ Λιντζ']])if(all.some(n=>row.some(a=>teamKey(a)===teamKey(n))))all.push(...row);
 return [...new Set(all.map(norm).filter(n=>n.length>=3||n==='ulm'||n==='ουλμ'))];
}
function mentions(text,names){const s=' '+norm(text)+' ';return names.some(n=>s.includes(' '+n+' '));}
function nbaDate(m){
 if(!/^\d{2}:\d{2}$/.test(m.time||''))return null;
 const part=new Intl.DateTimeFormat('en',{timeZone:'Europe/Athens',timeZoneName:'longOffset'}).formatToParts(new Date(m.date+'T12:00:00Z')).find(p=>p.type==='timeZoneName')?.value.replace('GMT','');
 const start=new Date(m.date+'T'+m.time+':00'+(part||'+00:00'));if(!Number.isFinite(+start))return null;
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(start);
}
// normalizeFootball exposes score.ft as score and marks the record non-provisional.
export function highlightMatch(m){
 return m.scoreState==null&&m.provisional===false&&Array.isArray(m.score)&&m.score.length===2&&m.score.every(n=>Number.isInteger(n)&&n>=0)?{...m,scoreState:'final'}:m;
}
export function selectHighlights(videos,m,{now=Date.now()}={}){
 if(m.scoreState!=='final'||!Array.isArray(m.score)||m.score.length!==2||!m.score.every(n=>Number.isInteger(n)&&n>=0)||!/^\d{4}-\d{2}-\d{2}$/.test(m.date||'')||m.date>athensDay(new Date(now)))return null;
 const home=choices(m.home,m.homeAliases,m.competition==='nba'),away=choices(m.away,m.awayAliases,m.competition==='nba'),hits=[];
 for(const v of videos||[]){
 const pub=publishers.find(p=>p.id===v.publisher&&p.channel===v.channelId),published=Date.parse(v.publishedAt);
 if(!pub||v.competition!==m.competition||!/^[\w-]{11}$/.test(v.videoId)||!Number.isFinite(published)||published>now+300000||athensDay(new Date(published))<m.date||athensDay(new Date(published))>shiftDay(m.date,1))continue;
 if(m.competition==='nba'){if(v.publisher!=='nba'||v.gameDate!==nbaDate(m))continue;}
 else if(v.publisher==='el'||v.publisher==='ec'){if(v.season!=='2026-27'||!Number.isInteger(v.round)||v.round!==Number(m.round))continue;}
 else if(v.gameDate!==m.date)continue;
 let text=v.title,seconds=null;
 if(v.kind==='chapters'){
  const matches=(v.chapters||[]).filter(c=>Number.isInteger(c.seconds)&&c.seconds>=0&&mentions(c.label,home)&&mentions(c.label,away));
  if(matches.length!==1)continue;text=matches[0].label;seconds=matches[0].seconds;
 }else if(v.kind!=='game')continue;
 if(!mentions(text,home)||!mentions(text,away))continue;
 const url='https://www.youtube.com/watch?v='+v.videoId+(seconds===null?'':'&t='+seconds+'s');
 hits.push({url,title:text,provider:pub.label,publishedAt:v.publishedAt,chapter:seconds,rank:seconds!==null?2:v.publisher==='nova'?0:1});
 }
 hits.sort((a,b)=>a.rank-b.rank||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));return hits[0]||null;
}
let cached=null,pending=null,loadedAt=0;
export async function loadHighlightsIndex({force=false}={}){
 if(!pending&&(force||!cached||Date.now()-loadedAt>120000))pending=fetch('./snapshots/highlights-2026-27.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(6000)}).then(async r=>{if(!r.ok)throw Error('Highlights unavailable');const p=await r.json();if(p.season!=='2026-27'||!Array.isArray(p.videos))throw Error('Wrong highlights season');cached=p.videos;loadedAt=Date.now();}).finally(()=>pending=null);
 if(pending)await pending;return cached;
}
export async function loadMatchHighlights(m,{force=false}={}){
 if(m.scoreState!=='final')return null;
 try{
 await loadHighlightsIndex({force});
 let ref=m;
 if(['el','eurocup'].includes(m.competition)&&!m.round){try{const r=await fetch('./snapshots/'+m.competition+'-2026-27.json',{signal:AbortSignal.timeout(6000)}),p=await r.json();const matches=(p.matches||[]).filter(x=>x.date===m.date&&mentions(x.home,choices(m.home,m.homeAliases))&&mentions(x.away,choices(m.away,m.awayAliases)));if(p.season==='2026-27'&&matches.length===1)ref={...matches[0],...m,round:matches[0].round};}catch{}}
 return selectHighlights(cached,ref);
 }catch{return null;}
}

export function parsePublisherVideoPage(html,publisher,videoId){
 const source=publishers.find(p=>p.id===publisher);if(!source||!/^[\w-]{11}$/.test(videoId))throw Error('Unknown publisher or video');
 const json=String(html).match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/)?.[1];if(!json)throw Error('Missing publisher video metadata');
 const p=JSON.parse(json),v=p.videoDetails,m=p.microformat?.playerMicroformatRenderer;
 if(v?.videoId!==videoId||v.channelId!==source.channel||!m?.publishDate||Array.isArray(m.availableCountries)&&!m.availableCountries.includes('GR'))throw Error('Unverified publisher video '+JSON.stringify({video:v?.videoId,channel:v?.channelId,title:v?.title,date:m?.publishDate,greece:m?.availableCountries?.includes('GR'),status:p.playabilityStatus?.status,reason:p.playabilityStatus?.reason}));
 const publishedAt=new Date(m.publishDate).toISOString(),xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return parsePublisherFeed('<feed><entry><yt:channelId>'+source.channel+'</yt:channelId><yt:videoId>'+videoId+'</yt:videoId><title>'+xml(v.title)+'</title><published>'+publishedAt+'</published><media:description>'+xml(v.shortDescription||'')+'</media:description></entry></feed>',publisher);
}
