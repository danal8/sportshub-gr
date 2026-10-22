import{readFile,writeFile,mkdir}from'node:fs/promises';
import{publishers,parsePublisherFeed,parseRecapPlaylists}from'../dist/highlights.js';
const sourceVersion=2;
const target='dist/snapshots/highlights-2026-27.json';let old;
try{old=JSON.parse(await readFile(target,'utf8'));}catch{old={season:'2026-27',videos:[]};}
if(!process.argv.includes('--force')&&old.sourceVersion===sourceVersion&&Date.now()-Date.parse(old.retrievedAt)<900000){console.log('Highlights index is recent.');process.exit(0);}
const videos=[],errors=[];let succeeded=0;
let recapPlaylists=[];try{const r=await fetch('https://www.youtube.com/@NBA/playlists',{signal:AbortSignal.timeout(10000)});if(r.ok)recapPlaylists=parseRecapPlaylists(await r.text());}catch(e){errors.push('NBA recap playlists: '+e.message);}if(process.argv.includes('--dry-run'))console.log('NBA RECAP PLAYLISTS '+JSON.stringify(recapPlaylists));
const feeds=publishers.flatMap(p=>[{publisher:p,url:'https://www.youtube.com/feeds/videos.xml?channel_id='+p.channel},...(p.id==='nba'?recapPlaylists:[]).map(id=>({publisher:p,url:'https://www.youtube.com/feeds/videos.xml?playlist_id='+id}))]);
await Promise.all(feeds.map(async({publisher:p,url})=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const xml=await r.text(),parsed=parsePublisherFeed(xml,p.id);if(p.id==='nba'&&process.argv.includes('--dry-run'))for(const [,entry]of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))if(/Nightly Recap[\s\S]*October 20, 2026/i.test(entry))console.log('NBA ARCHIVE ENTRY '+JSON.stringify(entry));videos.push(...parsed);if(process.argv.includes('--dry-run')){console.log('HIGHLIGHTS SOURCE '+p.id+' '+JSON.stringify(parsed));}succeeded++;}catch(e){errors.push(p.label+': '+e.message);}}));
if(!succeeded){console.log('Retaining verified highlights index: '+errors.join('; '));process.exit(0);}
const now=Date.now(),all=new Map((old.videos||[]).filter(v=>Date.parse(v.publishedAt)>now-90*86400000).map(v=>[v.channelId+'|'+v.videoId,v]));
for(const v of videos)all.set(v.channelId+'|'+v.videoId,v);
const next={season:'2026-27',sourceVersion,retrievedAt:new Date().toISOString(),sources:publishers.map(p=>({name:p.label,url:'https://www.youtube.com/channel/'+p.channel})),videos:[...all.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))};
if(process.argv.includes('--dry-run'))console.log('Verified publisher feeds: '+succeeded+'; indexed videos: '+next.videos.length);else{await mkdir('dist/snapshots',{recursive:true});await writeFile(target,JSON.stringify(next,null,2)+'\n');console.log('Highlights index updated: '+next.videos.length);}
if(errors.length)console.log('Retained earlier entries for unavailable sources: '+errors.join('; '));
