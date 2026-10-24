import{readFile,writeFile,mkdir}from'node:fs/promises';
import{publishers,parsePublisherFeed,parseRecapPlaylists,parseGamePlaylists}from'../dist/highlights.js';
import{loadPublisherArchive}from'./youtube-publisher-archive.mjs';
import{loadUEFAHighlights}from'./uefa-highlights.mjs';
import{loadPressEmbeds}from'./press-highlight-embeds.mjs';
const sourceVersion=8;
const target='dist/snapshots/highlights-2026-27.json';let old;
try{old=JSON.parse(await readFile(target,'utf8'));}catch{old={season:'2026-27',videos:[]};}
if(!process.argv.includes('--force')&&old.sourceVersion===sourceVersion&&!old.errors?.length&&Date.now()-Date.parse(old.retrievedAt)<900000){console.log('Highlights index is recent.');process.exit(0);}
const videos=[],errors=[];let succeeded=0;
let recapPlaylists=[],gamePlaylists=[];try{const r=await fetch('https://www.youtube.com/@NBA/playlists?hl=en&gl=US',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);const html=await r.text();recapPlaylists=parseRecapPlaylists(html);gamePlaylists=parseGamePlaylists(html);if(!gamePlaylists.length)throw Error('Official full-game playlist unavailable');}catch(e){errors.push('NBA playlists: '+e.message);}if(process.argv.includes('--dry-run'))console.log('NBA PLAYLISTS '+JSON.stringify({recapPlaylists,gamePlaylists}));
const feeds=publishers.flatMap(p=>[{publisher:p,url:'https://www.youtube.com/feeds/videos.xml?channel_id='+p.channel},...(p.id==='nba'?[...recapPlaylists,...gamePlaylists]:[]).map(id=>({publisher:p,url:'https://www.youtube.com/feeds/videos.xml?playlist_id='+id}))]);
await Promise.all(feeds.map(async({publisher:p,url})=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const xml=await r.text(),parsed=parsePublisherFeed(xml,p.id);videos.push(...parsed);if(process.argv.includes('--dry-run')){console.log('HIGHLIGHTS SOURCE '+p.id+' '+JSON.stringify(parsed));}succeeded++;}catch(e){errors.push(p.label+': '+e.message);}}));
await Promise.all(['europa','conference'].map(async id=>{try{const entries=await loadUEFAHighlights(id);videos.push(...entries);succeeded++;console.log('UEFA '+id+': '+entries.length+' verified videos');}catch(e){errors.push('UEFA '+id+': '+e.message);}}));
const known=new Set([...(old.videos||[]),...videos].map(v=>(v.channelId||v.publisher)+'|'+v.videoId));
// Channel RSS contains only the newest 15 uploads; busy matchdays need pagination.
await Promise.all(publishers.filter(p=>['nba','magenta','nova'].includes(p.id)).map(async p=>{try{const archive=await loadPublisherArchive(p,{known,playlists:p.id==='nba'?gamePlaylists:[]});videos.push(...archive.videos);succeeded++;console.log('Publisher archive '+p.id+': scanned '+archive.scanned+', indexed '+archive.videos.length);errors.push(...archive.errors.map(e=>p.label+': '+e));}catch(e){errors.push(p.label+' archive: '+e.message);}}));
const pressMatches=[];for(const id of ['europa','conference'])try{const p=JSON.parse(await readFile('dist/snapshots/'+id+'-2026-27.json','utf8'));pressMatches.push(...p.matches.map(m=>({...m,competition:id})));}catch{}
try{const p=await loadPressEmbeds(pressMatches,{known});videos.push(...p.videos);errors.push(...p.errors);succeeded++;console.log('Press video discovery: '+p.pages+' pages, '+p.videos.length+' videos');}catch(e){errors.push('Press video discovery: '+e.message);}
if(!succeeded)console.log('Retaining verified highlights index: '+errors.join('; '));
const now=Date.now(),all=new Map((old.videos||[]).filter(v=>Date.parse(v.publishedAt||v.verifiedAt)>now-90*86400000).map(v=>[(v.channelId||v.publisher)+'|'+v.videoId,v]));
for(const v of videos)if(Date.parse(v.publishedAt||v.verifiedAt)>now-90*86400000&&Date.parse(v.publishedAt||v.verifiedAt)<=now+300000)all.set((v.channelId||v.publisher)+'|'+v.videoId,v);
const next={season:'2026-27',sourceVersion,retrievedAt:new Date().toISOString(),errors,sources:publishers.map(p=>({name:p.label,url:'https://www.youtube.com/channel/'+p.channel})),videos:[...all.values()].sort((a,b)=>Date.parse(b.publishedAt||b.verifiedAt)-Date.parse(a.publishedAt||a.verifiedAt))};
if(process.argv.includes('--dry-run'))console.log('Verified publisher feeds: '+succeeded+'; indexed videos: '+next.videos.length);else{await mkdir('dist/snapshots',{recursive:true});await writeFile(target,JSON.stringify(next,null,2)+'\n');console.log('Highlights index updated: '+next.videos.length);}
if(errors.length)console.log('Retained earlier entries for unavailable sources: '+errors.join('; '));

if(!process.argv.includes('--dry-run')){
 const {highlightCoverage}=await import('../dist/highlight-coverage.js');const snapshots=[];
 for(const id of ['europa','conference','nba'])try{const p=JSON.parse(await readFile('dist/snapshots/'+id+'-2026-27.json','utf8'));snapshots.push(...(p.matches||[]).map(m=>({...m,competition:id})));}catch(e){errors.push(id+' snapshot: '+e.message);}
 const report={checkedAt:new Date().toISOString(),sourceErrors:errors,...highlightCoverage(snapshots,next.videos)};
 await writeFile('dist/snapshots/highlights-coverage.json',JSON.stringify(report,null,2)+'\n');
 console.log('Highlight coverage '+JSON.stringify(report.competitions));
}
