const urls=[
'https://www.sl2.gr/api/sportsdata/v1/teams/e6a56a5e053d46a18312b13520f0a963/players',
'https://www.sl2.gr/api/sportsdata/v1/teams/e6a56a5e053d46a18312b13520f0a963/roster',
'https://www.sl2.gr/api/sportsdata/v1/competitions/sl2-2627/teams/e6a56a5e053d46a18312b13520f0a963/players',
'https://www.sl2.gr/teams/panionios-igss',
'https://www.esake.gr/el/action/EsaketeamView?idteam=00000001&mode=1&idchampionship=184645B9',
'https://stats.basket.gr/2026-2027/elite-league/leader-teams',
'https://www.volleyleague.gr/index.php/season/2026-27/teams/panathinaikos',
'https://volleyball.gr/wp-json/sportspress/v2/players?leagues=11&seasons=298&per_page=1&_fields=id,title,number,current_teams,teams,seasons,leagues,positions,featured_media,_links&_embed=wp:featuredmedia'
];
let cursor=0;async function run(){while(cursor<urls.length){const url=urls[cursor++];try{const r=await fetch(url,{signal:AbortSignal.timeout(12000)}),text=await r.text();let result;try{const p=JSON.parse(text);result=JSON.stringify(p).slice(0,4000);}catch{const main=text.search(/<main|class="itemListCategory|id="tabs|class="team-view/i);const body=main<0?text:text.slice(main);const tables=[...body.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map(m=>m[0]);const scripts=[...text.matchAll(/<script[^>]*src=["']([^"']+)/g)].map(m=>m[1]);result={scripts:scripts.filter(s=>/sl2|sportsdata|super_league/.test(s)),tables:tables.map(t=>t.slice(0,7000)).slice(-3),tail:body.slice(-11000,-3000),teamlinks:[...body.matchAll(/href=["']([^"']*(?:team|player|athlete)[^"']*)["']/gi)].map(m=>m[1]).slice(-20)};}console.log(JSON.stringify({url,status:r.status,result}));}catch(e){console.log(JSON.stringify({url,error:e.message}));}}}
await Promise.all([run(),run(),run()]);