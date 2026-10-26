import{escapeHTML as e}from'./core.js?v=68';
const ball="<svg class=\"goal-ball\" viewBox=\"0 0 512 512\" aria-hidden=\"true\" fill=\"currentColor\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M417.3 360.1l-71.6-4.8c-5.2-.3-10.3 1.1-14.5 4.2s-7.2 7.4-8.4 12.5l-17.6 69.6C289.5 445.8 273 448 256 448s-33.5-2.2-49.2-6.4L189.2 372c-1.3-5-4.3-9.4-8.4-12.5s-9.3-4.5-14.5-4.2l-71.6 4.8c-17.6-27.2-28.5-59.2-30.4-93.6L125 228.3c4.4-2.8 7.6-7 9.2-11.9s1.4-10.2-.5-15l-26.7-66.6C128 109.2 155.3 89 186.7 76.9l55.2 46c4 3.3 9 5.1 14.1 5.1s10.2-1.8 14.1-5.1l55.2-46c31.3 12.1 58.7 32.3 79.6 57.9l-26.7 66.6c-1.9 4.8-2.1 10.1-.5 15s4.9 9.1 9.2 11.9l60.7 38.2c-1.9 34.4-12.8 66.4-30.4 93.6zM256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm14.1-325.7c-8.4-6.1-19.8-6.1-28.2 0L194 221c-8.4 6.1-11.9 16.9-8.7 26.8l18.3 56.3c3.2 9.9 12.4 16.6 22.8 16.6l59.2 0c10.4 0 19.6-6.7 22.8-16.6l18.3-56.3c3.2-9.9-.3-20.7-8.7-26.8l-47.9-34.8z\"/></svg>";
const icons={goal:ball,yellow:'▰',red:'▰',substitution:'⇄'};
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
