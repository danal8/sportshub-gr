import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{selectHighlights,parsePublisherFeed,publishers,publisherCompetition}from'../dist/highlights.js';
import{parseNovaVideo,novaVideoLinks}from'../scripts/nova-highlights.mjs';
const options={now:Date.parse('2026-10-25T06:00:00Z')};
test('October 24 highlights match explicit Greek aliases through provider-name variants',()=>{
 const rows=[['pl','FC Arsenal','Everton FC','Άρσεναλ-Έβερτον: 2-0'],['pl','Coventry City','Fulham FC','Κόβεντρι-Φούλαμ: 0-1'],['bund','RB Leipzig','SV 07 Elversberg','Λειψία-Έλβερσμπεργκ: 4-0'],['bund','1. FC Köln','FC Schalke 04','Κολωνία-Σάλκε: 0-0'],['bund','SC Paderborn 07','Hamburger SV','Πάντερμπορν-Αμβούργο: 1-0']];
 for(const [competition,home,away,title]of rows){const v={videoId:'abcdefghijk',publisher:'nova',channelId:publishers.find(p=>p.id==='nova').channel,competition,gameDate:'2026-10-24',publishedAt:'2026-10-24T20:00:00Z',title,kind:'game'},m={competition,home,away,date:v.gameDate,score:[1,0],scoreState:'final'};assert.ok(selectHighlights([v],m,options),title);assert.equal(selectHighlights([v],{...m,away:'Different FC'},options),null);}
});
test('Competition comes from the dated title before unrelated broadcaster description tags',()=>{
 const title='ΑΕΚ - Παναιτωλικός 5 - 0 | Highlights - Stoiximan Super League - 24/10/2026 | MagentaTV';assert.equal(publisherCompetition(title),'sl');
 const p=publishers.find(p=>p.id==='magenta'),xml=`<feed><entry><yt:channelId>${p.channel}</yt:channelId><yt:videoId>abcdefghijk</yt:videoId><title>${title}</title><published>2026-10-24T20:00:00Z</published><media:description>Όλα τα highlights: Super League 2, EuroLeague, Premier League</media:description></entry></feed>`;assert.equal(parsePublisherFeed(xml,'magenta')[0].competition,'sl');assert.equal(publisherCompetition('Super League 2 - 24/10/2026'),'sl2');
});
test('Native Novasports highlights require matching canonical metadata, competition, final score and unique teams',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/nova-web-highlights.json',import.meta.url))),{url,metadata}=fixture,html=metadata.map(p=>'<script type="application/ld+json">'+JSON.stringify(p)+'</script>').join(''),m={competition:'pl',home:'Chelsea FC',away:'Tottenham Hotspur FC',date:'2026-10-24',score:[0,2],scoreState:'final'};
 assert.deepEqual(novaVideoLinks(`<a href="${url}">Highlights</a><a href="https://evil.example/video/1/">highlights</a>`),[url]);const [v]=parseNovaVideo(html,url,[m],options);assert.equal(selectHighlights([v],m,options).url,url);
 for(const bad of [{...m,scoreState:'live'},{...m,score:[2,0]},{...m,competition:'gbl'},{...m,date:'2026-10-22'}])assert.equal(parseNovaVideo(html,url,[bad],options).length,0);
 assert.equal(parseNovaVideo(html,url,[m,{...m,id:'duplicate'}],options).length,0);assert.equal(parseNovaVideo(html.replaceAll('VideoObject','Article'),url,[m],options).length,0);assert.equal(selectHighlights([{...v,url:url.replace('www.novasports.gr','evil.example')}],m,options),null);
});
