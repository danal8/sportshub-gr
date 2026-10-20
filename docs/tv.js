import{isExplicitLive,broadcastDetails}from'./tv-meta.js?v=15';
// Runs only in the visitor's browser; no EPG archive is published with the app.
export function parseNova(html){
 const doc=new DOMParser().parseFromString(html,'text/html');const stamp=doc.querySelector('[name="match-center-date"]')?.value;
 if(!/^\d{2}-\d{2}-\d{4}$/.test(stamp||''))throw Error('Το πρόγραμμα Nova δεν δηλώνει ημερομηνία');
 const base=stamp.split('-').reverse().join('-'),matches=[];
 for(const section of doc.querySelectorAll('.channel-program')){const channel=section.parentElement.querySelector('.channel-title')?.textContent.trim();if(!channel)continue;let day=base,previous=-1;
  for(const item of section.querySelectorAll('.tv-broadcast')){const time=item.querySelector('.time')?.textContent.trim();if(!/^\d{2}:\d{2}$/.test(time||''))continue;const minute=Number(time.slice(0,2))*60+Number(time.slice(3));if(previous>=0&&minute<previous){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);day=d.toISOString().slice(0,10);}previous=minute;
   const title=item.querySelector('.title')?.textContent.trim()||'',subtitle=item.querySelector('.subtitle')?.textContent.trim()||'';
   // Match listings only; omit shows, descriptions, logos and highlights.
   const teams=title.replace(/\s*\([ΖZΕE]\)\s*$/,'').split(/\s+[–—-]\s+/);if(teams.length!==2||/στιγμιότυπα|magazine/i.test(title+subtitle))continue;
   if(!isExplicitLive(title,!!item.querySelector('.live-now')))continue;
   matches.push({id:`nova-${channel}-${day}-${time}`,home:teams[0],away:teams[1],date:day,time,round:'',...broadcastDetails(subtitle),channel,live:true,broadcastType:'Ζωντανή μετάδοση',source:'https://www.novasports.gr/tv-program/'});
  }
 }
 if(!matches.length)throw Error('Δεν αναγνωρίστηκε το πρόγραμμα Nova');return{matches,source:'https://www.novasports.gr/tv-program/',retrievedAt:new Date().toISOString(),notice:'Προσωπική ανάγνωση Novasports στον browser. Μόνο ρητά δηλωμένες ζωντανές μεταδόσεις.'};
}
export async function loadNova(){const r=await fetch('https://www.novasports.gr/tv-program/',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Nova HTTP '+r.status);return parseNova(await r.text());}
