const list=value=>Array.isArray(value)?value:[];
export function footballEvents(raw){
 const sources=[...list(raw.keyEvents),...list(raw.plays),...list(raw.header?.competitions?.[0]?.details),...list(raw.commentary).map(c=>({...c.play,text:c.play?.text||c.text}))],events=new Map();
 for(const p of sources){
  const type=String(p.type?.text||p.type?.name||p.type?.description||''),text=String(p.text||p.shortText||''),names=list(p.participants).map(x=>({name:x.athlete?.displayName||x.athlete?.fullName||'',role:x.type||x.role||''})).filter(x=>x.name);
  const kind=p.redCard===true||/red card|second yellow|yellow.*red/i.test(type)?'red':p.yellowCard===true||/yellow card|booking/i.test(type)?'yellow':/substitut/i.test(type)?'substitution':p.scoringPlay===true||/^(goal|own goal|penalty - scored)$/i.test(type)?'goal':null;
  if(!kind)continue;
  const clock=String(p.clock?.displayValue||p.displayClock||''),minute=clock.match(/(\d+)(?:\s*['′]?\s*\+\s*(\d+))?/),order=minute?Number(minute[1])*100+Number(minute[2]||0):0;
  const label=({red:'Κόκκινη κάρτα',yellow:'Κίτρινη κάρτα',substitution:'Αλλαγή',goal:/own goal/i.test(type)?'Αυτογκόλ':'Γκολ'})[kind];
  const players=names.map(n=>(/replaced|out/i.test(n.role)?'Βγήκε: ':/replacement|in/i.test(n.role)?'Μπήκε: ':'')+n.name).join(' · ');
  const key=p.id?kind+'|'+p.id:[kind,clock,players||text].join('|');
  const previous=events.get(key);if(previous&&previous.text.length>=text.length+players.length)continue;
  events.set(key,{kind,label,clock,order,period:p.period?.number||null,players,team:p.team?.displayName||p.team?.name||'',text:[players,text].filter(Boolean).join(' — ')});
 }
 return [...events.values()].sort((a,b)=>b.order-a.order);
}
