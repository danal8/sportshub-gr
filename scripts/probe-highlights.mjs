const base='https://site.web.api.espn.com/apis/site/v2/sports/',q='&region=us&lang=en&contentorigin=espn';const out=[];
for(const [sport,league,event]of [['basketball','nba','401909834'],['soccer','gre.1','401896817']]){const r=await fetch(base+sport+'/'+league+'/summary?event='+event+q),p=await r.json();out.push({event,status:r.status,videos:p.videos});}
const r=await fetch(base+'basketball/nba/scoreboard?dates=20261021'+q),p=await r.json();
for(const e of (p.events||[]).slice(0,5)){const r=await fetch(base+'basketball/nba/summary?event='+e.id+q),p=await r.json();out.push({event:e.id,date:e.date,teams:p.header?.competitions?.[0]?.competitors?.map(t=>({homeAway:t.homeAway,team:t.team.displayName})),videos:p.videos});}
console.log('HL_PROBE_START');console.log(JSON.stringify(out));console.log('HL_PROBE_END');
