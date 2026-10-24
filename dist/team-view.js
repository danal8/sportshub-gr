import{escapeHTML}from'./core.js?v=51';
export function teamMarkup(name,image={}){
 const [first,...rest]=String(name).trim().split(/\s+/),e=escapeHTML;
 const badge=image.src?'<img class="team-badge" src="'+e(image.src)+'" data-fallback="'+e(image.fallback||'')+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'';
 return '<span class="team-name"><span class="team-lead">'+badge+e(first)+'</span>'+(rest.length?' '+e(rest.join(' ')):'')+'</span>';
}
