const urls=[
'https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/teams',
'https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/players',
'https://www.sl2.gr/teams',
'https://www.eliteleague.gr/teams/',
'https://www.esake.gr/el/action/EsakeTeams',
'https://volleyball.gr/wp-json/sportspress/v2/players?seasons=298&per_page=1&_embed=wp:featuredmedia',
'https://volleyball.gr/wp-json/sportspress/v2/teams?seasons=298&per_page=1',
'https://www.volleyleague.gr/index.php/season/2026-27/teams/panathinaikos',
'https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=Olympiacos',
'https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id=133619'
];
let cursor=0;
async function probe(){while(cursor<urls.length){const url=urls[cursor++];try{const r=await fetch(url,{signal:AbortSignal.timeout(15000)}),text=await r.text();let result;try{const p=JSON.parse(text);const a=Array.isArray(p)?p:Object.values(p).find(Array.isArray);result={keys:Object.keys(p),sample:JSON.stringify(a?a.slice(0,1):p).slice(0,5000)};}catch{const links=[...text.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1]).filter(s=>/team|player|roster|omad|prosop|club|athlet/i.test(s));const at=text.search(/ΡΟΣΤΕΡ|Ρόστερ|roster|player-name|sp-player|Παίκτες/);result={links:[...new Set(links)].slice(0,50),sample:at<0?text.slice(-2000):text.slice(Math.max(0,at-500),at+4000)};}console.log(JSON.stringify({url,status:r.status,result}));}catch(e){console.log(JSON.stringify({url,error:e.message}));}}}
await Promise.all([probe(),probe(),probe()]);