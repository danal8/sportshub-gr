import{isExplicitLive,broadcastDetails}from'./tv-meta.js?v=51';
export function novaURL(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Μη έγκυρη ημερομηνία');return 'https://www.novasports.gr/wp-admin/admin-ajax.php?action=nova_get_template&template=tv-program/broadcast&dt='+date;}
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;|&#038;/g,'&').replace(/&nbsp;/g,' ').trim();
export function parseNova(html,requestedDate){
 const stamp=html.match(/name="match-center-date"[^>]*value="(\d{2}-\d{2}-\d{4})"/)?.[1];
 const base=stamp?stamp.split('-').reverse().join('-'):requestedDate;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(base||'')||requestedDate&&stamp&&base!==requestedDate)throw Error('Λανθασμένη ημερομηνία Nova');
 const matches=[],sections=html.split(/<div class="channel-title[^"\n]*">/).slice(1);
 if(!sections.length)throw Error('Δεν αναγνωρίστηκε το πρόγραμμα Nova');
 for(const section of sections){const channel=clean(section.split('</div>')[0]);let day=base,previous=-1;
  for(const item of section.split(/<div class="tv-broadcast[^"\n]*">/).slice(1)){
   const field=cls=>clean(item.match(new RegExp('<div class="'+cls+'[^"\\n]*">([\\s\\S]*?)</div>'))?.[1]||'');
   const time=field('time');if(!/^\d{2}:\d{2}$/.test(time))continue;
   const minute=Number(time.slice(0,2))*60+Number(time.slice(3));if(previous>=0&&minute<previous){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);day=d.toISOString().slice(0,10);}previous=minute;
   const title=field('title'),subtitle=field('subtitle');if(!isExplicitLive(title,/class="[^"]*\blive-now\b/.test(item)))continue;
   const teams=title.replace(/\s*\([ΖZ]\)\s*$/,'').split(/\s+[–—-]\s+/);if(teams.length!==2||/στιγμιότυπα|magazine/i.test(title+subtitle))continue;
   matches.push({id:'nova-'+channel+'-'+day+'-'+time,home:teams[0],away:teams[1],date:day,time,round:'',...broadcastDetails(subtitle),channel,live:true,broadcastType:'Ζωντανή μετάδοση',source:novaURL(base)});
  }
 }
 return{date:base,matches,source:novaURL(base),retrievedAt:new Date().toISOString(),notice:'Μόνο ρητά δηλωμένες ζωντανές μεταδόσεις Novasports.'};
}
export async function loadNova(date){
 try{const r=await fetch(novaURL(date),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Nova HTTP '+r.status);const p=parseNova(await r.text(),date);try{localStorage.setItem('sh-tv-'+date,JSON.stringify(p));}catch{}return p;}
 catch(error){try{const r=await fetch('./snapshots/tv-'+date+'.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok){const p=await r.json();if(p.date===date&&Array.isArray(p.matches))return{...p,fallback:error.message};}}catch{}
  try{const p=JSON.parse(localStorage.getItem('sh-tv-'+date));if(p?.date===date&&Array.isArray(p.matches))return{...p,fallback:error.message};}catch{}throw error;
 }
}
