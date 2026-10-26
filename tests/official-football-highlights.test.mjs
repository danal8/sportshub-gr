import test from'node:test';import assert from'node:assert/strict';
import{parseLeagueVideo,parseERTVideo,ertHighlightURL}from'../scripts/official-football-highlights.mjs';
import{publishers,selectHighlights}from'../dist/highlights.js';
const now=Date.parse('2026-10-26T08:00:00Z');
const match={competition:'laliga',home:'FC Barcelona',away:'Real Madrid',date:'2026-10-25',round:10,score:[1,2],scoreState:'final'};
const player={videoDetails:{channelId:publishers.find(p=>p.id==='laliga').channel,videoId:'VzRr1zWFl8U',title:'FC BARCELONA 1 - 2 REAL MADRID | RESUMEN LALIGA EA SPORTS',shortDescription:'LALIGA EA SPORTS 2026/27 J10'},microformat:{playerMicroformatRenderer:{publishDate:'2026-10-25T15:13:32-07:00',availableCountries:['GR']}}};
test('Official league uploads match the previous evening across midnight with verified channel and Greek availability',()=>{
 const videos=parseLeagueVideo(player,'laliga',[match],{now});assert.equal(videos.length,1);assert.equal(videos[0].gameDate,match.date);assert.equal(selectHighlights(videos,match,{now}).provider,'LALIGA');
 for(const edit of [p=>p.videoDetails.channelId='wrong',p=>p.microformat.playerMicroformatRenderer.availableCountries=['US'],p=>p.videoDetails.shortDescription='LALIGA 2025/26 J10',p=>p.videoDetails.title=p.videoDetails.title.replace('1 - 2','2 - 1')]){let p=structuredClone(player);edit(p);assert.deepEqual(parseLeagueVideo(p,'laliga',[match],{now}),[]);}
 assert.deepEqual(parseLeagueVideo(player,'laliga',[{...match,scoreState:'live'}],{now}),[]);assert.deepEqual(parseLeagueVideo(player,'laliga',[match,match],{now}),[]);
});
test('Serie A accepts official match highlights with explicit season, unique fixture and publication date',()=>{
 const m={...match,competition:'seriea',home:'Udinese Calcio',away:'AC Milan',score:[0,2]};const p=structuredClone(player);p.videoDetails={channelId:publishers.find(p=>p.id==='seriea').channel,videoId:'TovUeAQkaFc',title:'Pulisic Shines | UDINESE-MILAN | HIGHLIGHTS | Serie A 2026/27'};
 assert.equal(parseLeagueVideo(p,'seriea',[m],{now}).length,1);
});
test('ERT links only a matching final SL2 fixture to an actual video article, including after-midnight publication',()=>{
 const url='https://www.ertsports.gr/podosfairo/super-league-2/oi-simantikoteres-stigmes-tou-panionios-marko-0-4-videos/',m={...match,competition:'sl2',home:'ΠΑΝΙΩΝΙΟΣ',away:'ΜΑΡΚΟ',score:[0,4]};
 const html='<meta property="og:title" content="Οι σημαντικότερες στιγμές του Πανιώνιος – Μαρκό 0-4 (videos)"><meta property="article:published_time" content="2026-10-26T00:13:00+00:00"><iframe src="https://player.glomex.com/integration/1/integration.html?playlistId=example"></iframe>';
 const videos=parseERTVideo(html,url,[m],{now});assert.equal(videos.length,1);assert.equal(selectHighlights(videos,m,{now}).url,url);
 assert.deepEqual(parseERTVideo(html.replace('0-4','0-2'),url,[m],{now}),[]);assert.deepEqual(parseERTVideo(html.split('<iframe')[0],url,[m],{now}),[]);assert.equal(ertHighlightURL(url.replace('www.ertsports.gr','example.com')),false);
});
