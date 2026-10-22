import{escapeHTML as e}from'./core.js?v=26';
const icons={goal:'⚽',yellow:'▰',red:'▰',substitution:'⇄'};
export function eventTimeline(events){
 const rows=events.filter(p=>icons[p.kind]).slice().sort((a,b)=>a.order-b.order);
 if(!rows.length)return '<p class="detail-empty">Δεν έχουν δημοσιευτεί γκολ, κάρτες ή αλλαγές.</p>';
 let period=null;
 return '<ol class="event-timeline" aria-label="Γκολ, κάρτες και αλλαγές">'+rows.map(p=>{
  const divider=p.period&&p.period!==period?'<li class="event-period">'+e(p.period===1?'1ο ημίχρονο':p.period===2?'2ο ημίχρονο':'Παράταση')+'</li>':'';period=p.period||period;
  const people=p.participants||[],incoming=people.find(x=>/^(replacement|in)$/i.test(x.role)),outgoing=people.find(x=>/^(replaced|out)$/i.test(x.role));
  const main=p.kind==='substitution'&&incoming?incoming.name:people.filter(x=>!/assist/i.test(x.role)).map(x=>x.name).join(' · ')||p.players||p.label;
  const secondary=p.kind==='substitution'&&outgoing?'↓ '+outgoing.name:people.filter(x=>/assist/i.test(x.role)).map(x=>'Ασίστ: '+x.name).join(' · ');
  const content='<span class="event-person"><span>'+e(main)+'</span>'+(secondary?'<small>'+e(secondary)+'</small>':'')+(p.label==='Αυτογκόλ'?'<small>Αυτογκόλ</small>':'')+'</span><span class="event-icon event-'+p.kind+'" role="img" aria-label="'+e(p.label)+'">'+icons[p.kind]+'</span>';
  return divider+'<li class="event-row event-side-'+e(p.side||'unknown')+'"><div class="event-home">'+(p.side==='home'?content:'')+'</div><time>'+e(p.clock||'—')+'</time><div class="event-away">'+(p.side!=='home'?content:'')+'</div></li>';
 }).join('')+'</ol>';
}
