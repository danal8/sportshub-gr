import{readFile,writeFile,mkdir}from'node:fs/promises';
import{publishers,parsePublisherFeed,parseRecapPlaylists}from'../dist/highlights.js';
import{loadPublisherArchive}from'./youtube-publisher-archive.mjs';
const sourceVersion=3;
const target='dist/snapshots/highlights-2026-27.json';let old;
try{old=JSON.parse(await readFile(target,'utf8'));}catch{old={season:'2026-27',videos:[]};}
if(!process.argv.includes('--force')&&old.sourceVersion===sourceVersion&&Date.now()-Date.parse(old.retrievedAt)<900000){console.log('Highlights index is recent.');process.exit(0);}
const videos=[],errors=[];let succeeded=0;
let recapPlaylists=[];try{const r=await fetch('https://www.youtube.com/@NBA/playlists',{signal:AbortSignal.timeout(10000)});if(r.ok)recapPlaylists=parseRecapPlaylists(await r.text());}catch(e){errors.push('NBA recap playlists: '+e.message);}if(process.argv.includes('--dry-run'))console.log('NBA RECAP PLAYLISTS '+JSON.stringify(recapPlaylists));
const feeds=publishers.flatMap(p=>[{publisher:p,url:'https://www.youtube.com/feeds/videos.xml?channel_id='+p.channel},...(p.id==='nba'?recapPlaylists:[]).map(id=>({publisher:p,url:'https://www.youtube.com/feeds/videos.xml?playlist_id='+id}))]);
await Promise.all(feeds.map(async({publisher:p,url})=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const xml=await r.text(),parsed=parsePublisherFeed(xml,p.id);videos.push(...parsed);if(process.argv.includes('--dry-run')){console.log('HIGHLIGHTS SOURCE '+p.id+' '+JSON.stringify(parsed));}succeeded++;}catch(e){errors.push(p.label+': '+e.message);}}));
const known=new Set([...(old.videos||[]),...videos].map(v=>v.channelId+'|'+v.videoId));
// Channel RSS contains only the newest 15 uploads; busy matchdays need pagination.
await Promise.all(publishers.filter(p=>['nba','magenta','nova'].includes(p.id)).map(async p=>{try{const archive=await loadPublisherArchive(p,{known});videos.push(...archive.videos);succeeded++;console.log('Publisher archive '+p.id+': scanned '+archive.scanned+', indexed '+archive.videos.length);errors.push(...archive.errors.map(e=>p.label+': '+e));}catch(e){errors.push(p.label+' archive: '+e.message);}}));
if(!succeeded){console.log('Retaining verified highlights index: '+errors.join('; '));process.exit(0);}
const now=Date.now(),all=new Map((old.videos||[]).filter(v=>Date.parse(v.publishedAt)>now-90*86400000).map(v=>[v.channelId+'|'+v.videoId,v]));
for(const v of videos)if(Date.parse(v.publishedAt)>now-90*86400000&&Date.parse(v.publishedAt)<=now+300000)all.set(v.channelId+'|'+v.videoId,v);
const next={season:'2026-27',sourceVersion,retrievedAt:new Date().toISOString(),sources:publishers.map(p=>({name:p.label,url:'https://www.youtube.com/channel/'+p.channel})),videos:[...all.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))};
if(process.argv.includes('--dry-run'))console.log('Verified publisher feeds: '+succeeded+'; indexed videos: '+next.videos.length);else{await mkdir('dist/snapshots',{recursive:true});await writeFile(target,JSON.stringify(next,null,2)+'\n');console.log('Highlights index updated: '+next.videos.length);}
if(errors.length)console.log('Retained earlier entries for unavailable sources: '+errors.join('; '));
