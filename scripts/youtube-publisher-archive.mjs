// Read public channel uploads, then verify each video against its publisher.
import{publishers,parsePublisherFeed}from'../dist/highlights.js';
export function assignedJSON(html,name){const marker=new RegExp('(?:var\\s+)?'+name+'\\s*=\\s*').exec(html);if(!marker)return null;const start=html.indexOf('{',marker.index+marker[0].length);if(start<0)return null;let depth=0,quoted=false,escape=false;for(let i=start;i<html.length;i++){const c=html[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{return JSON.parse(html.slice(start,i+1));}catch{return null;}}}return null;}
export function uploadPage(data){const videos=new Map(),tokens=new Set();function walk(v){if(!v||typeof v!=='object')return;const r=v.videoRenderer||v.playlistVideoRenderer;if(r?.videoId)videos.set(r.videoId,{id:r.videoId,title:r.title?.runs?.map(x=>x.text).join('')||r.title?.simpleText||''});const l=v.lockupViewModel;if(l?.contentType==='LOCKUP_CONTENT_TYPE_VIDEO'&&l.contentId)videos.set(l.contentId,{id:l.contentId,title:l.metadata?.lockupMetadataViewModel?.title?.content||''});const t=v.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;if(t)tokens.add(t);for(const child of Object.values(v))if(Array.isArray(child))child.forEach(walk);else if(child&&typeof child==='object')walk(child);}walk(data);return{videos:[...videos.values()],continuation:[...tokens][0]};}
const xmlEscape=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function unavailablePlaylistNavigation(data,list){let found=null;function walk(v){if(!v||typeof v!=='object'||found)return;const r=v.menuNavigationItemRenderer,b=r?.navigationEndpoint?.browseEndpoint;if(/show unavailable videos/i.test(r?.text?.simpleText||'')&&b?.browseId==='VL'+list&&typeof b.params==='string')found={browseId:b.browseId,params:b.params};for(const child of Object.values(v))if(Array.isArray(child))child.forEach(walk);else if(child&&typeof child==='object')walk(child);}walk(data);return found;}
export function publisherVideo(player,publisher){const p=publishers.find(p=>p.id===publisher),v=player?.videoDetails,f=player?.microformat?.playerMicroformatRenderer;if(!p||v?.channelId!==p.channel||!/^[-\w]{11}$/.test(v.videoId||''))return[];const date=f?.publishDate||f?.uploadDate;if(!date||!/^\d{4}-\d{2}-\d{2}/.test(date))return[];const publishedAt=date.includes('T')?date:date+'T00:00:00Z';return parsePublisherFeed('<feed><entry><yt:channelId>'+p.channel+'</yt:channelId><yt:videoId>'+v.videoId+'</yt:videoId><title>'+xmlEscape(v.title)+'</title><published>'+publishedAt+'</published><media:description>'+xmlEscape(v.shortDescription)+'</media:description></entry></feed>',publisher).map(v=>publisher==='nba'?{...v,availableCountries:Array.isArray(f.availableCountries)?f.availableCountries:[]}:v);}

export function publisherOEmbed(metadata,videoId,publisher,verifiedAt=new Date().toISOString()){
 if(!['nba','magenta','nova'].includes(publisher)||metadata?.type!=='video'||!/^[-\w]{11}$/.test(videoId))return[];
 let author;try{author=new URL(metadata.author_url);}catch{return[];}
 if(author.origin!=='https://www.youtube.com'||!['/@'+({nba:'NBA',magenta:'magentasportgr',nova:'novasports'}[publisher]),'/channel/'+publishers.find(p=>p.id===publisher).channel].includes(author.pathname)||author.search||author.hash)return[];
 const p=publishers.find(p=>p.id===publisher);const videos=parsePublisherFeed('<feed><entry><yt:channelId>'+p.channel+'</yt:channelId><yt:videoId>'+videoId+'</yt:videoId><title>'+xmlEscape(metadata.title)+'</title><published>'+verifiedAt+'</published><media:description></media:description></entry></feed>',publisher);
 return videos.filter(v=>v.kind==='game').map(v=>({...v,publishedAt:null,verifiedAt,metadataSource:'YouTube oEmbed'}));
}

async function get(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r;}
export async function loadPublisherArchive(p,{known=new Set(),pages=3,playlists=[]}={}){
 const handles={nba:'NBA',magenta:'magentasportgr',nova:'novasports'};
 const urls=['https://www.youtube.com/'+(handles[p.id]?'@'+handles[p.id]:'channel/'+p.channel)+'/videos',...playlists.filter(id=>/^PL[\w-]+$/.test(id)).slice(0,3).map(id=>'https://www.youtube.com/playlist?list='+id)];
 const entries=[],discoveryErrors=[];
 for(const url of urls)try{
 const html=await(await get(url+(url.includes('?')?'&':'?')+'hl=en&gl=US')).text();let initial=assignedJSON(html,'ytInitialData');if(!initial)throw Error('Video listing unavailable');
 const marker='"INNERTUBE_CONTEXT":',context=html.includes(marker)?assignedJSON('var context = '+html.slice(html.indexOf(marker)+marker.length),'context'):null;
 const version=html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
 const list=new URL(url).searchParams.get('list'),navigation=list&&unavailablePlaylistNavigation(initial,list);
 if(navigation&&context)try{const r=await get('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context,...navigation})});initial=await r.json();}catch(e){discoveryErrors.push('Playlist metadata: '+e.message);}
 let page=uploadPage(initial);entries.push(...page.videos);
 for(let i=1;i<pages&&page.continuation&&version;i++){const r=await get('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context:context||{client:{clientName:'WEB',clientVersion:version}},continuation:page.continuation})});page=uploadPage(await r.json());entries.push(...page.videos);}
 }catch(e){discoveryErrors.push(url+': '+e.message);}
 if(!entries.length)throw Error('Empty publisher video listings; retained earlier videos: '+discoveryErrors.join('; '));
 const pending=[...new Map(entries.map(v=>[v.id,v])).values()].filter(v=>/^[-\w]{11}$/.test(v.id)&&!known.has(p.channel+'|'+v.id)&&(/highlights|nightly recap|στιγμι[οό]τυπ/i.test(v.title)||p.id==='ec'&&/\|\s*BKT EuroCup Basketball\s+2026[-–]27/i.test(v.title)));let cursor=0;const videos=[],errors=[...discoveryErrors];
 await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.length){const v=pending[cursor++];try{let parsed=[];
 // Full-game videos can be absent from channel uploads and watch pages can fail.
 // oEmbed independently verifies the official NBA author and the dated title.
 if(p.id==='nba'&&/full game highlights/i.test(v.title))try{const r=await get('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+v.id));parsed=publisherOEmbed(await r.json(),v.id,p.id);}catch{}
 if(!parsed.length){const html=await(await get('https://www.youtube.com/watch?v='+v.id)).text();parsed=publisherVideo(assignedJSON(html,'ytInitialPlayerResponse'),p.id);}
 if(!parsed.length&&/full game highlights/i.test(v.title))errors.push(v.id+': official video metadata unavailable');videos.push(...parsed);}catch(e){errors.push(v.id+': '+e.message);}}}));
 return{videos,scanned:entries.length,errors};
}
