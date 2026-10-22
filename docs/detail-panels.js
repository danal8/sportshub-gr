import{loadMatchHighlights}from'./highlights.js?v=32';
import{escapeHTML as e,athensDay}from'./core.js?v=26';
import{competitions}from'./data.js?v=26';
import{displayTeamName}from'./team-display.js?v=32';
import{teamMarkup}from'./team-view.js?v=26';
import{badgeSources}from'./badges.js?v=26';
import{loadTeamOverview,loadTeamRoster,loadMatchDetails}from'./detail-data.js?v=32';
const $=id=>document.getElementById(id);
const day=d=>d?new Intl.DateTimeFormat('el-GR',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Athens'}).format(new Date(d+'T12:00:00Z')):'Δεν έχει οριστεί';
const stamp=d=>{try{return new Intl.DateTimeFormat('el-GR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Athens'}).format(new Date(d));}catch{return '—';}};
function sourceLink(url,label='Πηγή'){try{const u=new URL(url);if(u.protocol!=='https:'||u.hostname.endsWith('.pvt')||u.username||u.password)return e(label);return '<a target="_blank" rel="noopener" href="'+e(u.href)+'">'+e(label)+' ↗</a>';}catch{return e(label);}}
const blank=text=>'<p class="detail-empty">'+e(text)+'</p>';
const value=v=>v===null||v===undefined||v===''?'—':e(v);
const name=n=>displayTeamName(n);
const visual=(n,c,badge)=>teamMarkup(name(n),badgeSources(n,badge,c.id,c.sport));
function playerAvatar(player){
 const photos=[...new Set([player.photo,...player.photos||[]].filter(Boolean))];
 const initials=String(player.name).replace(/,/g,' ').trim().split(/\s+/).filter(Boolean).slice(0,2).map(s=>[...s][0]).join('').toLocaleUpperCase('el');
 return '<span class="player-avatar" aria-hidden="true"><span class="player-initials">'+e(initials)+'</span>'+(photos.length?'<img class="player-photo" data-photo-fallbacks="'+e(JSON.stringify(photos.slice(1)))+'" src="'+e(photos[0])+'" alt="" width="36" height="36" loading="lazy" decoding="async" referrerpolicy="no-referrer">':'')+'</span>';
}
const position=(p,sport)=>({Goalkeeper:'Τερματοφύλακας',Defender:'Αμυντικός',Midfielder:'Μέσος',Forward:sport==='football'?'Επιθετικός':'Φόργουορντ',Guard:'Γκαρντ',Center:'Σέντερ','Guard-Forward':'Γκαρντ / Φόργουορντ','Forward-Center':'Φόργουορντ / Σέντερ'})[p]||p;
export function createDetailPanels({getSeed=()=>[]}={}){
 const dialog=$('detail-dialog'),body=$('detail-body');
 dialog.addEventListener('error',event=>{const img=event.target;if(!img?.classList?.contains('player-photo'))return;let next=[];try{next=JSON.parse(img.dataset.photoFallbacks||'[]');}catch{}const url=next.shift();img.dataset.photoFallbacks=JSON.stringify(next);if(url)img.src=url;else img.hidden=true;},true);let current=null,history=[],generation=0,games=[];
 // One browser entry for the whole modal, including nested team/match navigation.
 let browserToken=null,backPending=false;
 const ownsEntry=()=>browserToken&&window.history.state?.sportshubDetail===browserToken;
 function closeDetails(){
  if(!dialog.open||backPending)return;
  if(ownsEntry()){backPending=true;window.history.back();}
  else{resetCard();dialog.close();}
 }
 function openDialog(){
  if(!dialog.open){
   browserToken=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
   window.history.pushState({...window.history.state,sportshubDetail:browserToken},'',window.location.href);
   backPending=false;dialog.showModal();
  }
  document.body.classList.add('detail-open');
 }
 window.addEventListener('popstate',()=>{
  if(!dialog.open||ownsEntry())return;
  browserToken=null;backPending=false;resetCard();dialog.close();
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetails();});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!dialog.open)return;
  event.preventDefault();event.stopImmediatePropagation();closeDetails();
 },true);
 function headers(){
 $('detail-back').hidden=!history.length;$('detail-refresh').disabled=!!current?.loading||!!current?.rosterLoading;
 if(current?.type==='team')$('detail-title').innerHTML=visual(current.team,current.competition);else $('detail-title').textContent=name(current?.match.home||'')+' – '+name(current?.match.away||'');
 const tabs=current?.type==='team'?[['overview','Σύνοψη'],['roster','Ρόστερ'],['games','Αγώνες']]:[['overview','Στατιστικά'],['players',current?.competition.sport==='football'?'Συνθέσεις':'Παίκτες'],['events','Εξέλιξη']];
 $('detail-tabs').innerHTML=tabs.map(([key,label])=>'<button type="button" data-detail-tab="'+key+'" aria-pressed="'+(current.tab===key)+'">'+label+'</button>').join('');
 }
 function footer(){
 if(current?.type==='team'){const sources=current.overview?.sources||[];$('detail-source').innerHTML='<details><summary>Πηγές και ενημέρωση</summary>'+sources.map(s=>'<p>'+sourceLink(s.url,s.competition)+' · '+e(stamp(s.checkedAt))+'</p>').join('')+'</details>';}
 else{const d=current?.data;$('detail-source').innerHTML=d?sourceLink(d.source,d.provider)+' · Έλεγχος '+e(stamp(d.checkedAt))+(d.scoreState==='live'?' · Ανανέωση ανά 30″':''):sourceLink(current?.competition.url,'Επίσημη ιστοσελίδα');}
 }
 function gameList(matches,title){
 if(!matches.length)return '<section><h3>'+e(title)+'</h3>'+blank('Δεν υπάρχουν διαθέσιμοι αγώνες σε αυτή τη λίστα.')+'</section>';
 return '<section><h3>'+e(title)+'</h3><div class="detail-games">'+matches.map(m=>{const index=games.push(m)-1;return '<button type="button" class="detail-game" data-detail-game="'+index+'"><span class="detail-game-date">'+e(day(m.date))+' · '+e(m.time||'Ώρα μη ορισμένη')+'</span><span>'+e(name(m.home))+' <span class="muted">–</span> '+e(name(m.away))+'</span><span class="detail-game-meta">'+e(m.competitionLabel||'')+(m.channel?' · '+e(m.channel):'')+'</span>'+(Array.isArray(m.score)?'<strong>'+e(m.score.join(' – '))+(m.scoreState==='final'?' · Τελικό':'')+'</strong>':'')+'</button>';}).join('')+'</div></section>';
 }
 function teamBody(card){
 const d=card.overview;if(!d)return blank(card.loading?'Φόρτωση προγράμματος και αποτελεσμάτων…':card.error||'Δεν ανακτήθηκαν διαθέσιμα στοιχεία.')+(!card.loading?'<button type="button" class="outline" data-detail-retry>Δοκίμασε ξανά</button>':'');
 const c=card.competition;
 if(card.tab==='roster'){
 if(card.rosterLoading)return blank('Φόρτωση επαληθευμένου ρόστερ…');
 if(card.rosterError)return blank(card.rosterError)+'<button type="button" class="outline" data-detail-retry>Δοκίμασε ξανά</button>';
 const roster=card.roster;if(!roster)return blank('Άνοιξε ξανά το ρόστερ για ενημέρωση.');
 return '<p class="detail-meta">'+e(roster.season)+' · '+e(roster.provider)+' · '+e(stamp(roster.checkedAt))+'</p>'+(roster.staff.length?'<p class="detail-meta">'+roster.staff.map(p=>e(name(p.name))+' <span class="muted">('+e(p.role)+')</span>').join(' · ')+'</p>':'')+(roster.players.length?'<div class="detail-roster"><table><caption>'+e(name(card.team))+' · Ρόστερ πηγής</caption><thead><tr><th>#</th><th>Παίκτης</th><th>Θέση</th><th>Ηλικία</th></tr></thead><tbody>'+roster.players.map(p=>'<tr><td>'+value(p.jersey)+'</td><td><div class="roster-person">'+playerAvatar(p)+'<div class="roster-name">'+e(name(p.name))+(p.country?'<small>'+e(p.country)+'</small>':'')+'</div></div></td><td>'+e(position(p.position,c.sport))+'</td><td>'+value(p.age)+'</td></tr>').join('')+'</tbody></table></div>':blank('Η πηγή δεν επέστρεψε παίκτες.'))+'<p class="detail-meta">'+sourceLink(roster.source,roster.provider)+'</p>';
 }
 if(card.tab==='games')return gameList(d.recent.slice(0,15),'Πρόσφατα αποτελέσματα')+gameList(d.upcoming.slice(0,15),'Επόμενοι αγώνες')+(d.undated?blank(d.undated+' αγώνες δεν έχουν ακόμα ορισμένη ημερομηνία.'):'');
 const form=d.form.length?'<div class="team-form" aria-label="Φόρμα τελευταίων αγώνων">'+d.form.map(m=>'<span class="form-'+m.outcome+'" title="'+e(day(m.date)+' · '+m.home+' – '+m.away+' '+m.score.join('–'))+'">'+({W:'Ν',D:'Ι',L:'Η'})[m.outcome]+'</span>').join('')+'</div><p class="detail-meta">Τελευταίοι 5 διαθέσιμοι τελικοί αγώνες · Πιο πρόσφατος πρώτος.</p>':blank('Δεν υπάρχουν ακόμα επιβεβαιωμένα τελικά αποτελέσματα για φόρμα.');
 const standings=d.standings.length?'<div class="detail-ranks">'+d.standings.map(r=>'<div><span>'+e(r.competitionLabel)+(r.group?' · '+e(r.group):'')+'</span><strong>'+value(r.rank)+'η</strong><small>'+value(r.played)+' αγ. · '+value(r.wins)+' νίκες'+(r.points!==null&&r.points!==undefined?' · '+value(r.points)+' βαθ.':'')+'</small></div>').join('')+'</div>':'';
 return '<p class="detail-meta">'+e(c.name)+' · '+(c.id==='volley-w'?'Γυναικών':c.sport==='volleyball'?'Ανδρών':'2026–27')+'</p>'+standings+'<section><h3>Φόρμα</h3>'+form+'</section>'+gameList(d.upcoming.slice(0,3),'Επόμενοι αγώνες')+gameList(d.recent.slice(0,3),'Τελευταία αποτελέσματα')+(d.errors.length?'<p class="detail-meta">Μερική κάλυψη: δεν ανακτήθηκαν όλα τα προγράμματα του τμήματος.</p>':'');
 }
 function playerTables(d){
 if(d.lineups.length)return d.lineups.map(t=>'<section><h3>'+e(name(t.team))+(t.formation?' · '+e(t.formation):'')+'</h3><div class="detail-lineups">'+t.rows.map(p=>'<div><span class="detail-jersey">'+value(p.jersey)+'</span><span>'+e(name(p.name))+'<small>'+e(position(p.position,'football'))+' · '+(p.starter?'Βασικός':p.subbedIn?'Αλλαγή':'Πάγκος')+(p.subbedOut?' · Αντικαταστάθηκε':'')+'</small>'+(p.stats.length?'<small>'+p.stats.map(s=>e(s.label)+': '+value(s.value)).join(' · ')+'</small>':'')+'</span></div>').join('')+'</div></section>').join('');
 if(d.players.length)return d.players.map(t=>'<section><h3>'+e(name(t.team))+'</h3><div class="detail-boxscroll" tabindex="0" aria-label="Στατιστικά παικτών '+e(name(t.team))+'"><table class="detail-box"><thead><tr><th>Παίκτης</th>'+t.labels.map(l=>'<th>'+e(l)+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(p=>'<tr><td>'+e(name(p.name))+(p.starter?' <small>Βασικός</small>':'')+'</td>'+p.values.map(v=>'<td>'+value(p.dnp?null:v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>').join('');
 return blank('Δεν έχουν δημοσιευτεί διαθέσιμες συνθέσεις ή στατιστικά παικτών από την πηγή.');
 }
 function highlightLink(card){
 const final=card.data?card.data.scoreState==='final':card.match.scoreState==='final',h=card.highlight;
 if(!final||!h)return '';
 return '<div class="detail-highlight"><a href="'+e(h.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+e('Highlights: '+name(card.match.home)+' – '+name(card.match.away)+' · '+h.provider)+'">▶ Highlights <span aria-hidden="true">↗</span></a><small>'+e(h.provider)+(h.chapter!==null?' · Στο σημείο του συγκεκριμένου αγώνα':'')+'</small></div>';
 }
 async function highlights(card,force=false){
 if(card.hlPending||card.hlLoaded&&!force)return;
 const m={...card.match,...(card.data?{scoreState:card.data.scoreState,score:card.data.score}:{})};
 if(m.scoreState!=='final')return;
 card.hlPending=true;card.hlLoaded=true;const gen=generation;
 try{card.highlight=await loadMatchHighlights(m,{force});}finally{card.hlPending=false;if(current===card&&generation===gen)render();}
 }
 function matchBody(card){
 const m=card.match,d=card.data,c=card.competition;
 const teams='<div class="detail-match-teams"><button type="button" data-detail-team="'+e(m.home)+'" data-detail-competition="'+e(c.id)+'">'+visual(m.home,c,m.homeBadge)+'</button><span>–</span><button type="button" data-detail-team="'+e(m.away)+'" data-detail-competition="'+e(c.id)+'">'+visual(m.away,c,m.awayBadge)+'</button></div>';
 if(!d)return teams+highlightLink(card)+'<p class="detail-meta">'+e(day(m.date))+' · '+e(m.time||'Ώρα μη ορισμένη')+' · '+e(c.name)+'</p>'+blank(card.loading?'Φόρτωση αναλυτικών στατιστικών…':card.error||'Δεν υπάρχουν διαθέσιμα στοιχεία.')+(!card.loading?'<button type="button" class="outline" data-detail-retry>Δοκίμασε ξανά</button>':'');
 const age=Date.now()-Date.parse(d.checkedAt),live=d.scoreState==='live'&&age>=-60000&&age<90000;
 const score=d.score?'<div class="detail-score"><strong>'+e(d.score.join(' – '))+'</strong><span>'+(d.scoreState==='final'?'Τελικό':live?'● LIVE'+(d.clock?' · '+e(d.clock):''):'Σκορ πηγής · αναμονή ενημέρωσης')+'</span></div>':'';
 const head=(card.error?'<p class="detail-empty" role="status">'+e(card.error)+' Τα προηγούμενα στοιχεία παραμένουν ορατά.</p>':'')+teams+score+highlightLink(card)+'<p class="detail-meta">'+e(day(m.date))+' · '+e(m.time||'Ώρα μη ορισμένη')+' · '+e(c.name)+(d.venue?' · '+e(d.venue):'')+'</p>';
 if(card.tab==='players')return head+playerTables(d);
 if(card.tab==='events')return head+(d.events.length?'<ol class="detail-events">'+d.events.slice(0,card.eventCount||40).map(p=>'<li><span>'+e([p.period?p.period+'η περ.':'',p.clock].filter(Boolean).join(' · '))+'</span><p>'+e(p.text)+'</p></li>').join('')+'</ol>'+(d.events.length>(card.eventCount||40)?'<button type="button" class="outline" data-more-events>Περισσότερες φάσεις</button>':''):blank('Δεν έχει δημοσιευτεί διαθέσιμη εξέλιξη φάσεων.'));
 const periods=d.periods.length?'<section><h3>Ανά περίοδο</h3><div class="detail-periods">'+d.periods.map(p=>'<div><span>'+e(p.label)+'</span><strong>'+value(p.home)+' – '+value(p.away)+'</strong></div>').join('')+'</div></section>':'';
 return head+periods+(d.stats.length?'<section><h3>Ομαδικά στατιστικά</h3><table class="detail-compare"><thead><tr><th>'+e(name(m.home))+'</th><th>Στατιστικό</th><th>'+e(name(m.away))+'</th></tr></thead><tbody>'+d.stats.map(s=>'<tr><td>'+value(s.home)+'</td><th scope="row">'+e(s.label)+'</th><td>'+value(s.away)+'</td></tr>').join('')+'</tbody></table></section>':blank(d.scoreState?'Δεν έχουν δημοσιευτεί επιπλέον ομαδικά στατιστικά.':'Τα στατιστικά και οι συνθέσεις θα εμφανιστούν όταν δημοσιευτούν από την πηγή.'));
 }
 function render(){if(!current||!dialog.open)return;const y=body.scrollTop;games=[];headers();body.innerHTML=current.type==='team'?teamBody(current):matchBody(current);body.scrollTop=y;footer();}
 async function roster(card,force=false){
 if(card.rosterLoading||!card.overview)return;card.rosterLoading=true;card.rosterError='';render();const gen=generation;
 try{card.roster=await loadTeamRoster(card.team,card.competition,card.overview,{force});}catch(err){card.rosterError=err.message.startsWith('Δεν ')?err.message:'Η πηγή ρόστερ δεν είναι διαθέσιμη αυτή τη στιγμή.';}finally{card.rosterLoading=false;if(current===card&&generation===gen)render();}
 }
 async function fetchCard(card,force=false){
 const gen=generation;card.loading=true;card.error='';render();if(card.type==='match')void highlights(card,force);
 try{if(card.type==='team')card.overview=await loadTeamOverview(card.team,card.competition,{seed:getSeed(),force});else card.data=await loadMatchDetails(card.match,{force});}
 catch(err){card.error=err.message.startsWith('Δεν ')||err.message.startsWith('Τα ')?err.message:'Η πηγή δεν είναι διαθέσιμη αυτή τη στιγμή.';}
 finally{card.loading=false;if(current===card&&generation===gen){render();if(card.type==='team'&&card.tab==='roster')void roster(card,force);if(card.type==='match')void highlights(card);}}
 }
 function show(card,push=true){if(current&&push)history.push(current);current=card;generation++;openDialog();body.scrollTop=0;render();if(!card.overview&&!card.data)void fetchCard(card);}
 function openTeam(team,competition){const c=competitions.find(c=>c.id===competition);if(!c)return;show({type:'team',team,competition:c,tab:'overview'});}
 function openMatch(match){const c=competitions.find(c=>c.id===match.competition)||{id:match.competition,name:match.competitionLabel||'Αγώνας',sport:match.sportLabel==='Μπάσκετ'?'basketball':match.sportLabel==='Ποδόσφαιρο'?'football':'other',url:match.source||''};show({type:'match',match,competition:c,tab:'overview'});}
 $('detail-close').onclick=closeDetails;$('detail-back').onclick=()=>{const prior=history.pop();if(prior)show(prior,false);};
 $('detail-refresh').onclick=()=>{if(!current)return;if(current.type==='team'&&current.tab==='roster')void roster(current,true);else void fetchCard(current,true);};
 function resetCard(){generation++;current=null;history=[];document.body.classList.remove('detail-open');}
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;
  resetCard();
  // Also consume our entry if another caller closes the native dialog.
  if(ownsEntry()&&!backPending){backPending=true;window.history.back();}
  browserToken=null;
 });
 dialog.addEventListener('click',event=>{
 const target=event.target.closest('button');if(!target)return;
 if(target.dataset.detailTab){current.tab=target.dataset.detailTab;render();if(current.type==='team'&&current.tab==='roster'&&!current.roster&&!current.rosterError)void roster(current);return;}
 if(target.dataset.detailGame!==undefined){const m=games[Number(target.dataset.detailGame)];if(m)openMatch(m);return;}
 if(target.dataset.detailTeam){openTeam(target.dataset.detailTeam,target.dataset.detailCompetition);return;}
 if(target.hasAttribute('data-detail-retry')){if(current.type==='team'&&current.tab==='roster')void roster(current,true);else void fetchCard(current,true);}
 if(target.hasAttribute('data-more-events')){current.eventCount=(current.eventCount||40)+40;render();}
 });
 setInterval(()=>{if(document.hidden||!dialog.open||!current||current.type!=='match'||current.loading||current.data?.scoreState!=='live')return;void fetchCard(current,true);},30000);
 return{openTeam,openMatch};
}
