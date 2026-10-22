import{mkdir,writeFile}from'node:fs/promises';
const out={};async function probe(key,url,pick){try{const r=await fetch(url,{headers:{Origin:'https://danal8.github.io'},signal:AbortSignal.timeout(15000)}),body=await r.text();let p;try{p=JSON.parse(body);}catch{}out[key]={status:r.status,cors:r.headers.get('access-control-allow-origin'),data:p?pick(p):body.slice(0,100)};}catch(e){out[key]={error:e.message};}}
const web='https://site.web.api.espn.com/apis/site/v2/sports/';
await Promise.all([
 probe('soccer-teams',web+'soccer/gre.1/teams?limit=1000&region=us&lang=en&contentorigin=espn',p=>({keys:Object.keys(p),teams:p.sports?.[0]?.leagues?.[0]?.teams?.slice(0,2)})),
 probe('nba-roster',web+'basketball/nba/teams/2/roster?season=2027&region=us&lang=en&contentorigin=espn',p=>({keys:Object.keys(p),team:p.team,season:p.season,coach:p.coach,athlete:p.athletes?.slice(0,1)})),
 probe('soccer-roster',web+'soccer/gre.1/teams/435/roster?season=2026&region=us&lang=en&contentorigin=espn',p=>({keys:Object.keys(p),team:p.team,season:p.season,coach:p.coach,athlete:p.athletes?.slice(0,1)})),
 probe('nba-summary',web+'basketball/nba/summary?event=401909834&region=us&lang=en&contentorigin=espn',p=>({keys:Object.keys(p),header:p.header,boxscore:p.boxscore,plays:p.plays?.slice(0,2)})),
 probe('soccer-summary',web+'soccer/gre.1/summary?event=401896817&region=us&lang=en&contentorigin=espn',p=>({keys:Object.keys(p),header:p.header,boxscore:p.boxscore,rosters:p.rosters?.slice(0,1),events:p.keyEvents?.slice(0,3)})),
 probe('euro-boxscore','https://live.euroleague.net/api/Boxscore?gamecode=1&seasoncode=E2026',p=>p),
 probe('euro-roster','https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/clubs/PAN/people',p=>({keys:Object.keys(p),data:Array.isArray(p)?p.slice(0,2):p})),
]);
await mkdir('test-artifacts',{recursive:true});await writeFile('test-artifacts/detail-source-probe.json',JSON.stringify(out,null,2));console.log('DETAIL_PROBE_START');console.log(JSON.stringify(out));console.log('DETAIL_PROBE_END');
