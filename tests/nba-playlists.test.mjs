import test from'node:test';import assert from'node:assert/strict';
import{parseGamePlaylists,publishers,selectHighlights}from'../dist/highlights.js';
import{loadPublisherArchive,unavailablePlaylistNavigation}from'../scripts/youtube-publisher-archive.mjs';
test('NBA discovers the current full-game playlist separately from recaps and old seasons',()=>{
 const list=[['PLcurrent','Nightly Full Game Highlights | 2026-27 Season'],['PLrecap','NBA Nightly Recap | 2026-27'],['PLold','Full Game Highlights | 2025-26']].map(([contentId,title])=>({lockupViewModel:{contentId,metadata:{lockupMetadataViewModel:{title:{content:title}}}}}));
 assert.deepEqual(parseGamePlaylists('var ytInitialData = '+JSON.stringify({contents:list})+';'),['PLcurrent']);
});
test('Playlist discovery follows only the matching public metadata navigation',()=>{
 const data={menuNavigationItemRenderer:{text:{simpleText:'Show unavailable videos'},navigationEndpoint:{browseEndpoint:{browseId:'VLPLcurrent',params:'observed-value'}}}};
 assert.deepEqual(unavailablePlaylistNavigation(data,'PLcurrent'),{browseId:'VLPLcurrent',params:'observed-value'});assert.equal(unavailablePlaylistNavigation(data,'PLother'),null);
});
test('NBA playlist-only games use independently verified oEmbed even when watch metadata is unavailable',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(url);if(url.includes('/oembed'))return{ok:true,json:async()=>({type:'video',title:'HAWKS at HORNETS | FULL GAME HIGHLIGHTS | October 23, 2026',author_url:'https://www.youtube.com/@NBA'})};
 const videos=url.includes('/playlist?')?[{playlistVideoRenderer:{videoId:'w4g6vpvVyos',title:{simpleText:'HAWKS at HORNETS | FULL GAME HIGHLIGHTS | October 23, 2026'}}}]:[];
 return{ok:true,text:async()=>'var ytInitialData = '+JSON.stringify({contents:videos})+';'};};
 try{const p=await loadPublisherArchive(publishers.find(p=>p.id==='nba'),{playlists:['PLcurrent']});assert.equal(p.videos.length,1);assert.equal(p.videos[0].metadataSource,'YouTube oEmbed');assert.ok(!calls.some(u=>u.includes('/watch?')));const match={competition:'nba',date:'2026-10-24',time:'02:00',home:'Charlotte Hornets',away:'Atlanta Hawks',score:[81,128],scoreState:'final'};assert.ok(selectHighlights(p.videos.map(v=>({...v,verifiedAt:'2026-10-24T05:00:00Z'})),match,{now:Date.parse('2026-10-24T05:00:00Z')}));}finally{globalThis.fetch=original;}
});
