import{loadTVGuide}from'./tv-guide.js?v=60';
import{loadDailySchedule}from'./daily-schedule.js?v=60';
import{savePreference}from'./preference-storage.js?v=60';
import{FAVORITES_KEY,sanitizeFavorites,isFavorite,toggleFavorite,favoriteMatches}from'./fixture-favorites.js?v=60';
import{loadHighlightsIndex,selectHighlights,highlightMatch}from'./highlights.js?v=60';
import{displayTeamName}from'./team-display.js?v=60';
import{loadLiveScores,applyLiveScores,mergeLiveMatches,isFreshLive,LIVE_INTERVAL}from'./live-scores.js?v=60';
import{makeSelection,sanitizeSelections,selectionForTeam,addSelection,weekRange,weeklyMatches,selectedCompetitions,teamIdentity}from'./my-teams.js?v=60';
import{teamMarkup}from'./team-view.js?v=60';
import{loadTVDetails,applyTVDetails}from'./tv-details.js?v=60';
import{defaultCompetition,orderedCompetitions}from'./competition-order.js?v=60';
import{badgeSources,loadBadgeCatalog,rememberBadges}from'./badges.js?v=60';
import{resultLabel}from'./results.js?v=60';
import{directIDs}from'./direct.js?v=60';
import{swipeDirection}from'./gestures.js?v=60';
import{navIcon}from'./icons.js?v=60';
import{scheduleEntries,daySchedule}from'./schedule.js?v=60';
import{loadNova}from'./tv.js?v=60';
import {loadProvider,isConnected,rememberConfirmedResults} from './providers.js?v=60';
import {competitions,checkedAt,eliteSchedule,eliteTV,eliteMatches,broadcasts,currentTV,gblStandings} from './data.js?v=60';
import {escapeHTML as e,normalizeFootball,calculateTable,athensDay,chooseRound,filterMatches,shiftDay} from './core.js?v=60';
const $=id=>document.getElementById(id);
const shortLabels={volleyball:'Βόλεϊ',football:'Ποδ.',basketball:'Μπασκ.',tv:'TV',matches:'Αγώνες',standings:'Βαθμοί'};
const nav=[['football','⚽','Ποδόσφαιρο'],['basketball','◉','Μπάσκετ'],['volleyball','','Βόλεϊ'],['tv','▣','Τηλεόραση'],['matches','▦','Αγώνες'],['standings','≡','Βαθμολογίες']];
const state={tab:'tv',id:'all-tv',season:'2026-27',matches:[],round:'',search:'',request:0,meta:null,tvDate:athensDay(),archive:false,myTeams:false,favoritesOnly:false,liveOnly:false};

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
let followedTeams=sanitizeSelections(read('sh-followed-teams-v1',[]));
let favoriteFixtures=sanitizeFavorites(read(FAVORITES_KEY,[]));
let pendingTeam=null;
let liveEntries=[],liveReport=null,liveGeneration=0,livePending=false,liveQueued=false;
const tvCache=new Map(),scheduleCache=new Map(),tvDetailsCache=new Map();
const allMatches={id:'all-matches',name:'Όλες οι διοργανώσεις',sport:'all'};
const allTV={id:'all-tv',name:'Όλες οι διοργανώσεις',sport:'all',url:'https://www.novasports.gr/tv-program/'};
function current(){return state.id==='all-matches'?allMatches:state.id==='all-tv'?allTV:competitions.find(c=>c.id===state.id);}
function dateLabel(d){return new Intl.DateTimeFormat('el-GR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Athens'}).format(new Date(d+'T12:00:00+03:00'));}
function timestamp(d){return new Intl.DateTimeFormat('el-GR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Athens'}).format(new Date(d));}
function team(name,badge,id=state.id,sport){const visual=teamMarkup(displayTeamName(name),badgeSources(name,badge,id,sport));return competitions.some(c=>c.id===id)?'<button type="button" class="team-open" data-open-team="'+e(name)+'" data-open-competition="'+e(id)+'" aria-label="'+e('Λεπτομέρειες ομάδας '+displayTeamName(name))+'">'+visual+'</button>':visual;}

loadBadgeCatalog().then(()=>{if(!state.loading)render();});
document.addEventListener('error',event=>{const img=event.target;if(!img?.classList?.contains('team-badge'))return;const fallback=img.dataset.fallback;if(fallback&&img.src!==fallback){img.dataset.fallback='';img.src=fallback;}else img.hidden=true;},true);
function link(url,text){return `<a href="${e(url)}" target="_blank" rel="noopener">${e(text)} ↗</a>`;}
let renderedTab,renderedMatches=[];
let detailPromise,cardHighlights=null,cardHighlightsPending=false,cardHighlightsCheckedAt=0;
function fixtureStar(m,matchIndex){return `<button type="button" class="fixture-favorite" data-fixture-favorite="${matchIndex}" aria-pressed="${isFavorite(m,favoriteFixtures)}" aria-label="${e((isFavorite(m,favoriteFixtures)?'Αφαίρεση από αγαπημένα: ':'Προσθήκη στα αγαπημένα: ')+m.home+' – '+m.away)}">${isFavorite(m,favoriteFixtures)?'★':'☆'}</button>`;}
function cardHighlight(m){
 const h=cardHighlights&&selectHighlights(cardHighlights,highlightMatch(m));return h?'<a class="match-highlights" href="'+e(h.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+e((h.label||'Highlights')+': '+m.home+' – '+m.away+' · '+h.provider)+'" title="'+e(h.provider)+'">▶ '+e(h.label||'Highlights')+'</a>':'';
}
async function refreshCardHighlights(force=false){
 if(cardHighlightsPending||!renderedMatches.some(m=>highlightMatch(m).scoreState==='final')||!force&&Date.now()-cardHighlightsCheckedAt<120000)return;
 cardHighlightsPending=true;cardHighlightsCheckedAt=Date.now();
 try{cardHighlights=await loadHighlightsIndex({force});if(!state.loading&&state.tab!=='standings')render();}catch{}finally{cardHighlightsPending=false;}
}
function details(){return detailPromise??=import('./detail-panels.js?v=60').then(m=>m.createDetailPanels({getSeed:()=>{const records=competitions.map(c=>({competition:c,payload:scheduleCache.get(state.season+'-'+c.id)})).filter(r=>r.payload);if(state.meta?.matches&&competitions.some(c=>c.id===state.id))records.push({competition:current(),payload:{...state.meta,matches:state.matches}});return records;}})).catch(error=>{detailPromise=null;notify('Δεν άνοιξαν τα στοιχεία. Δοκίμασε ξανά.');throw error;});}
document.addEventListener('click',async event=>{const t=event.target.closest('[data-open-team]');if(t){const name=t.dataset.openTeam,id=t.dataset.openCompetition;try{(await details()).openTeam(name,id);}catch{}return;}const target=event.target.closest('[data-open-match-index]');if(!target||target.tagName==='ARTICLE'&&event.target.closest('a,button,input,select,summary'))return;const match=renderedMatches[Number(target.dataset.openMatchIndex)];if(match)try{(await details()).openMatch({...match});}catch{}});
function renderNav(){if(renderedTab===state.tab)return;renderedTab=state.tab;for(const id of ['side-nav','top-nav','bottom-nav']){$(id).innerHTML=nav.map(([key,icon,label])=>`<button type="button" data-tab="${key}" aria-label="${label}" class="${state.tab===key?'active':''}" ${state.tab===key?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${navIcon(key)}</span><span class="full-label">${label}</span><span class="short-label" aria-hidden="true">${shortLabels[key]}</span></button>`).join('');}}
function choices(){const allowed=state.tab==='matches'?[allMatches,...orderedCompetitions(competitions,state.tab)]:state.tab==='tv'?[allTV,...orderedCompetitions(competitions,state.tab)]:orderedCompetitions(competitions,state.tab);if(!allowed.some(c=>c.id===state.id))state.id=allowed[0].id;$('competition').innerHTML=allowed.map(c=>`<option value="${c.id}" ${c.id===state.id?'selected':''}>${c.name}</option>`).join('');}
function notify(text){const partial=/Ορισμένοι αγώνες|Ορισμένες μεταδόσεις/.test(text);$('source-warning').textContent=partial?text:'';$('source-warning').hidden=!partial;$('status').textContent=partial?'':text;$('status').hidden=partial||!text;}
function empty(title,text,url){return `<div class="empty"><div class="empty-symbol" aria-hidden="true">▦</div><h3>${e(title)}</h3><p>${e(text)}</p>${url?link(url,'Άνοιγμα επίσημης πηγής'):''}</div>`;}
function setRounds(){const rounds=[...new Set(state.matches.map(m=>m.round))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));state.round=chooseRound(state.matches,athensDay());$('round').innerHTML='<option value="">'+(state.id==='nba'?'Όλες οι ημερομηνίες':'Όλες οι αγωνιστικές')+'</option>'+rounds.map(r=>`<option value="${e(r)}">${state.id==='nba'?e(dateLabel(r)):e(r)+'η αγωνιστική'}</option>`).join('');$('round').value=state.round;}
async function loadDaily(request,force){
 const season=state.season,selected=state.id;state.dailySources=[];state.dailyErrors=[];let pending=0;
 const available=state.myTeams?selectedCompetitions(followedTeams,competitions):competitions;
 const list=available.filter(c=>selected==='all-matches'||c.id===selected).sort((a,b)=>Number(directIDs.includes(b.id))-Number(directIDs.includes(a.id)));
 state.dailyIndex=null;
 try{const p=await loadDailySchedule({season,date:state.tvDate,competitionIDs:list.map(c=>c.id),weekly:state.myTeams},{force});if(request!==state.request)return;
  if(p){state.dailyIndex=p;state.dailyPending=0;state.dailySources=p.sources;const finals=read('sh-confirmed-results-2026-27',[]);state.matches=applyLiveScores(p.matches,Array.isArray(finals)?finals:[]);notify('');return;}
 }catch{}
 const show=()=>{if(request!==state.request)return;state.dailySources=list.map(c=>scheduleCache.get(season+'-'+c.id)).filter(Boolean);state.matches=state.dailySources.flatMap(p=>p.entries);if(!pending)render();notify(pending?'Ενημέρωση…':state.dailyErrors.length?'Ορισμένοι αγώνες δεν μπόρεσαν να ενημερωθούν.':'');};
 let cursor=0;pending=list.length;state.dailyPending=pending;show();
 async function reader(){while(cursor<list.length){const c=list[cursor++];try{let p;if(isConnected(c.id))p=await loadProvider(c.id,season,{force});else{const source=`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${c.file}.json`,r=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);p={matches:normalizeFootball(await r.json(),c.id),source,retrievedAt:new Date().toISOString()};}if(request!==state.request)return;if(p.fallback)state.dailyErrors.push(c.name);scheduleCache.set(season+'-'+c.id,{...p,entries:scheduleEntries(p,c)});}catch(error){if(request!==state.request)return;state.dailyErrors.push(c.name);}pending--;state.dailyPending=pending;show();}}
 await Promise.all([reader(),reader(),reader(),reader()]);
}
async function load(force=false){const request=++state.request,c=current(),season=state.season,tvDate=state.tvDate,tvKey=id=>season+'-'+id+(id==='nova'?'-'+tvDate:'');state.matches=[];state.meta=null;state.loading=true;renderHeader();$('view').innerHTML=empty('Φόρτωση δεδομένων','Ελέγχεται η επιλεγμένη πηγή.');$('refresh').disabled=true;let message='';
 try{
 if(state.tab==='matches'){await loadDaily(request,force);message=$('source-warning').textContent||$('status').textContent;}else if(isConnected(c.id)&&state.tab!=='tv'){
 const payload=await loadProvider(c.id,season,{force});if(request!==state.request)return;state.matches=payload.matches;state.meta=payload;message=payload.fallback?'Προβάλλονται αποθηκευμένα στοιχεία.':payload.partial?'Μερικό πρόγραμμα.':'';
 }else if(c.file&&state.tab!=='tv'){
  const url=`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${c.file}.json`,key=`sh-data-${c.id}-${season}`;let cached=read(key,null),payload;
  try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();const matches=normalizeFootball(data,c.id);payload={data,retrievedAt:new Date().toISOString(),source:url};if(request!==state.request)return;save(key,payload);state.matches=matches;message='';}
  catch(error){if(!cached){try{const r=await fetch(`./snapshots/${season}-${c.file}.json`);if(r.ok)cached=await r.json();}catch{}}if(!cached)throw error;state.matches=normalizeFootball(cached.data,c.id);payload=cached;message=`Δεν έγινε νέα ανάκτηση (${error.name==='TimeoutError'?'λήξη χρόνου':error.message}). Εμφανίζεται αποθηκευμένο αντίγραφο.`;}
  if(request!==state.request)return;state.meta=payload;
 }else if(season==='2026-27'){
  if(state.tab==='tv'){
   let guide;try{guide=await loadTVGuide(tvDate,{competition:c.id,force});}catch{}
   if(request!==state.request)return;
   if(guide){state.tvErrors=[];state.tvSources=guide.sources;state.matches=guide.matches;}
   else{
   state.tvErrors=[];const feeds=['elite','gbl','sl2','volley-w','volley-m','nova'].filter(id=>c.id==='all-tv'||id===c.id||id==='nova');
   const show=()=>{if(request!==state.request)return;state.tvSources=feeds.map(id=>tvCache.get(tvKey(id))).filter(Boolean);state.matches=applyTVDetails(state.tvSources.flatMap(p=>p.matches).filter(m=>m.live&&m.date&&m.time&&m.channel&&(c.id==='all-tv'||m.competition===c.id)),tvDetailsCache.get(tvDate)?.entries||[]);};
   show();notify('Ενημέρωση…');
   const tasks=feeds.map(async id=>{try{const p=await(id==='nova'?loadNova(tvDate):loadProvider(id,season,{force}));if(request!==state.request)return;
    const competition=competitions.find(x=>x.id===id);const matches=id==='nova'?p.matches:p.matches.filter(m=>m.date&&m.time&&m.channel).map(m=>({...m,id:'tv-'+m.id,competition:id,competitionLabel:competition.name,sportLabel:competition.sport==='football'?'Ποδόσφαιρο':competition.sport==='volleyball'?'Βόλεϊ':'Μπάσκετ',live:true,source:m.source||p.source}));
    rememberBadges(p,id);tvCache.set(tvKey(id),{...p,matches});show();
   }catch(error){if(request===state.request){state.tvErrors.push(id+': '+error.message);const old=tvCache.get(tvKey(id));if(old)tvCache.set(tvKey(id),{...old,fallback:error.message});}}});
   await Promise.allSettled(tasks);
   if(request!==state.request)return;
   }
  }
  else if(c.id==='elite')state.matches=eliteMatches;
  state.meta={retrievedAt:checkedAt,source:state.tab==='tv'?(c.id==='elite'?eliteTV:c.url):c.id==='elite'?eliteSchedule:c.ranking||c.url};
  if(state.tab==='tv'){state.meta=null;message='';if(state.tvErrors?.length)message='Ορισμένες μεταδόσεις δεν μπόρεσαν να ενημερωθούν.';}else message='Δεν υπάρχει αυτόματη κάλυψη για αυτή την επιλογή.';
 }else{message='Δεν υπάρχει αποθηκευμένη κάλυψη για την επιλεγμένη σεζόν.';}
 }catch(error){if(request!==state.request)return;message=`Η πηγή δεν είναι διαθέσιμη (${error.message}). Δεν εμφανίζονται επινοημένα δεδομένα.`;}
 finally{if(request===state.request){state.loading=false;setRounds();render();notify((navigator.onLine?'':'Εκτός σύνδεσης · ')+message);$('refresh').disabled=false;if(state.tab==='tv')void refreshTVExtras(request,tvDate,c.id,force);else void refreshLive(force);}}
}
// Enrichment never holds the broadcast list or date controls behind external APIs.
async function refreshTVExtras(request,date,competition,force){
 const competitionIDs=[...new Set(state.matches.filter(m=>m.date===date).map(m=>m.competition))];if(!competitionIDs.length)return;
 try{const p=await loadTVDetails(date,{competition,competitionIDs,force});if(request!==state.request||state.tab!=='tv'||date!==state.tvDate||competition!==state.id)return;tvDetailsCache.set(date,p);state.matches=applyTVDetails(state.matches,p.entries);if(!state.loading)render();}catch{}
}
function oddsLine(m){const o=m.odds,age=Date.now()-Date.parse(o?.checkedAt);if(!Number.isFinite(age)||!Number.isFinite(Date.parse(o?.startsAt))||!o||o.bookmaker!=='DraftKings'||age< -60000||age>=600000||Date.now()>=Date.parse(o.startsAt)||![o.home,o.away,...(o.draw===undefined?[]:[o.draw])].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>1))return '';return '<div class="odds-line"><span class="odds-prices">'+(o.market==='Νικητής αγώνα'?'Νικητής · ':'')+'1 <b>'+o.home.toFixed(2)+'</b>'+(o.draw===undefined?'':' · Χ <b>'+o.draw.toFixed(2)+'</b>')+' · 2 <b>'+o.away.toFixed(2)+'</b></span><span class="odds-source">'+link(o.url,'DraftKings')+' · μέσω ESPN · Έλεγχος '+e(new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit'}).format(new Date(o.checkedAt)))+'</span></div>';}
function renderHeader(){const c=current();$('favorites-only').hidden=state.tab!=='matches';$('favorites-only').setAttribute('aria-pressed',String(state.favoritesOnly));const headingFilters=state.tab==='matches'&&matchMedia('(min-width:701px)').matches;$('match-quick-filters').hidden=!headingFilters;(headingFilters?$('match-quick-filters'):['matches','tv'].includes(state.tab)?$('tv-day'):document.querySelector('.filters')).append($('live-only'));$('live-only').before($('favorites-only'));$('live-only').hidden=!['matches','football','basketball','volleyball'].includes(state.tab);$('live-only').setAttribute('aria-pressed',String(state.liveOnly));document.body.dataset.tab=state.tab;renderMyTeamsControls();$('season').closest('label').hidden=state.tab==='tv';renderNav();$('page-title').textContent=state.tab==='standings'?'Βαθμολογίες διοργανώσεων':state.tab==='tv'?'Τηλεοπτικό πρόγραμμα':state.tab==='football'?'Πρόγραμμα ποδοσφαίρου':state.tab==='basketball'?'Πρόγραμμα μπάσκετ':state.tab==='volleyball'?'Πρόγραμμα βόλεϊ':(state.myTeams?'Οι ομάδες μου · Εβδομάδα':'Όλοι οι αγώνες της ημέρας');$('section-title').textContent=c.name;$('sport-label').textContent=c.sport==='all'?(state.tab==='matches'?'ΟΛΑ ΤΑ ΑΘΛΗΜΑΤΑ':'ΑΘΛΗΤΙΚΗ ΤΗΛΕΟΡΑΣΗ'):c.sport==='football'?'ΠΟΔΟΣΦΑΙΡΟ':c.sport==='volleyball'?'ΒΟΛΕΪ':'ΜΠΑΣΚΕΤ';$('round-label').querySelector('.filter-label').textContent=state.id==='nba'?'Ημερομηνία αγώνων':'Αγωνιστική';$('round-label').hidden=['standings','tv','matches'].includes(state.tab);$('tv-day').hidden=!['tv','matches'].includes(state.tab);$('day-label').textContent=state.tab==='matches'?(state.myTeams?'Εβδομάδα ημερομηνίας':'Ημερήσιο πρόγραμμα'):'Ζωντανές μεταδόσεις';$('tv-archive').closest('label').hidden=true;$('tv-date').value=state.tvDate;$('week-range').hidden=!(state.tab==='matches'&&state.myTeams);if(!$('week-range').hidden){const w=weekRange(state.tvDate);$('week-range').textContent=shortDate(w.start)+' – '+shortDate(w.end);}$('prev-day').setAttribute('aria-label',state.tab==='matches'&&state.myTeams?'Προηγούμενη εβδομάδα':'Προηγούμενη ημέρα');$('next-day').setAttribute('aria-label',state.tab==='matches'&&state.myTeams?'Επόμενη εβδομάδα':'Επόμενη ημέρα');$('coverage').textContent=state.meta?.partial?'Μερική κάλυψη · TheSportsDB':c.id==='sl'?'':' ';
 $('coverage').hidden=!state.meta?.partial&&!['matches','tv'].includes(state.tab);
 if(state.tab==='matches')$('coverage').textContent=state.myTeams?'Δευτέρα – Κυριακή':'Όλα τα αθλήματα · Ανά ημέρα';else if(state.tab==='tv')$('coverage').textContent='Μόνο ζωντανές';}
function render(){renderedMatches=[];const c=current();if(!['tv','standings'].includes(state.tab))state.matches=applyLiveScores(state.matches.map(m=>({...m,competition:m.competition||state.id})),liveEntries);renderHeader();
 const meta=state.meta;$('source-note').innerHTML=meta?`Σεζόν 2026–27 · Ανάκτηση / έλεγχος: ${e(timestamp(meta.retrievedAt))} (Ελλάδα).<br>${link(meta.source,'Πρωτογενής πηγή')}<br>${c.file||c.id==='sl'?'Τα ωράρια της κοινοτικής πηγής παραλείπονται επειδή δεν δηλώνουν αξιόπιστα ζώνη ώρας. Τα σκορ εμφανίζονται μόνο όταν τα επιστρέφει η πηγή.':'Το στιγμιότυπο μπορεί να έχει αλλάξει. Επιβεβαίωσε στην επίσημη πηγή πριν τον αγώνα.'}`:'Δεν έχει ανακτηθεί σύνολο δεδομένων για αυτή την επιλογή.';
 if(state.tab==='tv')$('source-note').innerHTML=(state.tvSources||[]).map(p=>`Έλεγχος: ${e(timestamp(p.retrievedAt))} · ${link(p.source,'Πηγή μεταδόσεων')}${p.fallback?' · Αποθηκευμένο αντίγραφο':''}<br>${e(p.copyright||'')}`).join('<br>')||'Δεν ανακτήθηκε πηγή μεταδόσεων.';
 if(state.tab==='matches')$('source-note').innerHTML=(state.dailySources||[]).map(p=>`${link(p.source,'Πηγή προγράμματος')} · ${e(timestamp(p.retrievedAt))}${p.fallback?' · Αποθηκευμένο αντίγραφο':''}<br>${e(p.copyright||'')}${p.terms?' · '+link(p.terms,'Άδεια / όροι'):''}`).join('<br>')||'Αναζητούνται διαθέσιμες πηγές.';
 if(liveReport&&!['tv','standings'].includes(state.tab))$('source-note').innerHTML+='<br>LiveScore: '+e(liveReport.sources.join(' · ')||'Δεν ανακτήθηκε ζωντανή πηγή')+' · Έλεγχος '+e(timestamp(liveReport.checkedAt))+' · Ανανέωση κάθε 30″ όσο η σελίδα είναι ορατή.'+(liveReport.errors.length?' Κάποιες ζωντανές πηγές δεν απάντησαν.':'')+' Κάλυψη: ESPN για ποδόσφαιρο/NBA, επίσημο Euroleague Basketball για EuroLeague/EuroCup. Α2, GBL, SL2 και βόλεϊ εμφανίζουν διαθέσιμα αποτελέσματα πηγών, χωρίς εγγυημένο ζωντανό χρονόμετρο.';
 if(meta?.copyright)$('source-note').innerHTML+=`<br>${e(meta.copyright)} ${meta.terms?link(meta.terms,'Όροι προσωπικής χρήσης'):''}`;
 if(state.tab==='standings'){renderTable(c);return;}
 const favoriteMode=state.tab==='matches'&&state.favoritesOnly;
 const candidates=favoriteMode?applyLiveScores(favoriteMatches(state.matches,favoriteFixtures).filter(m=>state.id==='all-matches'||m.competition===state.id),liveEntries):state.matches;
 let matches=filterMatches(candidates,{round:['tv','matches'].includes(state.tab)?'':state.round,search:state.search,favoritesOnly:false,date:state.tab==='matches'&&!state.myTeams||state.tab==='tv'&&!state.archive?state.tvDate:''});
 if(state.liveOnly&&state.tab!=='tv'&&state.tab!=='standings')matches=matches.filter(m=>isFreshLive(m));
 matches.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'').localeCompare(b.time||''));
 if(state.tab==='matches')matches=state.myTeams?weeklyMatches(matches,followedTeams,state.tvDate,Object.fromEntries(competitions.map(c=>[c.id,c.sport]))):daySchedule(matches,state.tvDate);
 if(state.tab==='matches'&&state.myTeams&&!followedTeams.length){$('view').innerHTML=empty('Διάλεξε τις ομάδες σου','Πάτησε ☆ δίπλα σε μία ή περισσότερες ομάδες στις βαθμολογίες. Εδώ θα βλέπεις το εβδομαδιαίο πρόγραμμά τους.')+'<div class="my-teams-empty"><button type="button" data-open-standings>Επιλογή από τις βαθμολογίες</button></div>';return;}
 if(!matches.length&&favoriteMode){$('view').innerHTML=empty(state.liveOnly?'Δεν υπάρχουν αγαπημένοι αγώνες LIVE':'Δεν υπάρχουν αγαπημένοι αγώνες για αυτή την ημέρα','Πρόσθεσε αγώνες με το ☆ στο TV ή στους Αγώνες.');return;}
 if(!matches.length&&state.liveOnly&&!['tv','standings'].includes(state.tab)){$('view').innerHTML=empty('Δεν υπάρχουν επιβεβαιωμένοι LIVE αγώνες','Ο έλεγχος συνεχίζεται αυτόματα όσο η σελίδα είναι ανοιχτή.');return;}
 if(!matches.length){const hasData=state.matches.length>0;if(state.tab==='matches'){if(state.dailyPending&&!state.dailySources?.length){$('view').innerHTML=empty('Φόρτωση ημερήσιου προγράμματος','Συγκεντρώνονται τα διαθέσιμα προγράμματα.');return;}$('view').innerHTML=empty(state.myTeams?'Δεν βρέθηκαν αγώνες αυτή την εβδομάδα':'Δεν βρέθηκαν αγώνες για αυτή την ημέρα',state.myTeams?'Δοκίμασε άλλη εβδομάδα ή διοργάνωση. Εμφανίζονται μόνο διαθέσιμα προγράμματα με ορισμένη ημερομηνία.':'Επίλεξε άλλη ημερομηνία ή διοργάνωση. Αγώνες χωρίς ορισμένη ημερομηνία δεν εμφανίζονται στην ημερήσια λίστα.');return;}if(state.tab==='tv'){$('view').innerHTML=empty(state.loading?'Φόρτωση…':'Δεν βρέθηκαν ζωντανές μεταδόσεις',state.loading?'':dateLabel(state.tvDate));return;}$('view').innerHTML=empty(hasData?'Δεν βρέθηκαν αγώνες':'Δεν υπάρχουν διαθέσιμα στοιχεία',hasData?'Άλλαξε αγωνιστική ή αναζήτηση.':state.tab==='tv'?'Δεν υπάρχει επιβεβαιωμένη λίστα μεταδόσεων για αυτή τη διοργάνωση και σεζόν. Δες τα επίσημα προγράμματα καναλιών δεξιά.':c.note||'Η επιλεγμένη πηγή δεν επέστρεψε πρόγραμμα.',c.url);return;}
 let day='';let html=state.tab==='matches'?`<div class="daily-summary${state.myTeams?'':' single-day-summary'}"><strong>${matches.length} αγώνες</strong>${state.myTeams?`<span>${new Set(matches.map(m=>m.competition)).size} διοργανώσεις · ${e(state.myTeams?shortDate(weekRange(state.tvDate).start)+' – '+shortDate(weekRange(state.tvDate).end):dateLabel(state.tvDate))}</span>`:`<strong class="daily-summary-date">${e(dateLabel(state.tvDate))}</strong>`}</div>`:state.meta?.partial?`<div class="notice">${e(state.meta.notice)} ${link('https://www.thesportsdb.com/','Πηγή: TheSportsDB')}</div>`:'';
 renderedMatches=matches;for(const [matchIndex,m] of matches.entries()){
 if(day!==m.date){day=m.date;if(state.tab!=='matches'||state.myTeams)html+=`<div class="match-date">${e(day?dateLabel(day):'Ημερομηνία υπό ορισμό')}</div>`;}
 const id=m.competition||c.id,sport=m.sportLabel==='Μπάσκετ'?'basketball':m.sportLabel==='Βόλεϊ'?'volleyball':m.sportLabel==='Ποδόσφαιρο'?'football':c.sport,scored=Array.isArray(m.score),label=scored?resultLabel({...m,sportLabel:m.sportLabel||(c.sport==='volleyball'?'Βόλεϊ':'')}):'',live=isFreshLive(m);
 if(state.tab==='tv'){html+=`<article class="match tv-favorite-match" data-open-match-index="${matchIndex}">${fixtureStar(m,matchIndex)}<button type="button" class="match-time match-open" data-open-match-index="${matchIndex}" aria-label="${e('Στοιχεία αγώνα '+m.home+' – '+m.away)}">${e(m.time||'—')}</button><div class="match-info"><div class="fixture-title">${team(m.home,m.homeBadge,m.competition||c.id,m.sportLabel==='Μπάσκετ'?'basketball':m.sportLabel==='Βόλεϊ'?'volleyball':m.sportLabel==='Ποδόσφαιρο'?'football':c.sport)} <span class="fixture-dash">–</span> ${team(m.away,m.awayBadge,m.competition||c.id,m.sportLabel==='Μπάσκετ'?'basketball':m.sportLabel==='Βόλεϊ'?'volleyball':m.sportLabel==='Ποδόσφαιρο'?'football':c.sport)}</div>${['tv','matches'].includes(state.tab)?`<div class="broadcast-meta">${e([m.sportLabel,m.competitionLabel].filter(Boolean).join(' · '))}</div>`:''}${m.channel?`<div class="broadcast-channel"><strong>${e(m.channel)}</strong>${m.streamURL?' '+link(m.streamURL,'Δες'):''}</div>`:''}${state.tab==='tv'?oddsLine(m):''}</div></article>`;continue;}
 html+=`<article class="match compact-match ${live?'is-live':''}" data-open-match-index="${matchIndex}"><div class="match-card-heading">${fixtureStar({...m,competition:id},matchIndex)}<button type="button" class="match-time match-open" data-open-match-index="${matchIndex}" aria-label="${e('Λεπτομέρειες αγώνα '+m.home+' – '+m.away)}"><span>${e(m.time||'—')}</span>${scored?'<small class="match-status">'+e(label)+'</small>':''}</button></div><div class="match-info"><div class="fixture-title"><div class="fixture-team-row">${team(m.home,m.homeBadge,id,sport)}<strong class="team-score">${scored?e(m.score[0]):'–'}</strong></div><div class="fixture-team-row">${team(m.away,m.awayBadge,id,sport)}<strong class="team-score">${scored?e(m.score[1]):'–'}</strong></div></div>${['tv','matches'].includes(state.tab)?'<div class="broadcast-meta">'+e([m.sportLabel,m.competitionLabel].filter(Boolean).join(' · '))+'</div>':''}${scored?'<div class="match-score '+(live?'is-live':'')+'">'+cardHighlight({...m,competition:id})+'</div>':''}${m.channel?'<div class="broadcast-channel"><strong>'+e(m.channel)+'</strong>'+(m.streamURL?' '+link(m.streamURL,'Δες'):'')+'</div>':''}${state.tab==='tv'?oddsLine(m):''}</div></article>`;
 }
 $('view').innerHTML=html;void refreshCardHighlights();
}
function renderTable(c){
 const meta=state.meta,football=c.sport==='football';let rows=meta?.standings||[],computed=false;
 if(!rows.length&&(c.file||c.id==='sl')&&state.matches.length){rows=calculateTable(state.matches,athensDay());computed=true;}
 if(!rows.length){$('view').innerHTML=empty('Δεν υπάρχει διαθέσιμη βαθμολογία',c.note||'Δεν έχει συνδεθεί πηγή για αυτή τη σεζόν.',c.ranking||c.url);return;}
 if(meta?.standingsSource)$('source-note').innerHTML+=`<br>${link(meta.standingsSource,'Πηγή κατάταξης')}`;
 const q=state.search.toLocaleLowerCase('el');rows=rows.filter(r=>r.team.toLocaleLowerCase('el').includes(q));
 const percent=['el','eurocup','nba'].includes(c.id);
 const notice='';
 $('view').innerHTML=`${notice?`<div class="notice">${e(notice)}</div>`:''}<div class="table-scroll"><table><caption class="fine">${e(c.name)} · 2026–27</caption><thead><tr><th scope="col">#</th><th scope="col">Ομάδα</th><th scope="col">Αγ.</th><th scope="col">Ν</th>${football?'<th scope="col">Ι</th>':''}<th scope="col">Η</th><th scope="col">${percent?'% Ν':'Βαθ.'}</th></tr></thead><tbody>${rows.map((r,i)=>`${r.group&&r.group!==rows[i-1]?.group?`<tr><th colspan="${football?7:6}" scope="rowgroup">${e(r.group)}</th></tr>`:''}<tr><td>${r.rank}</td><td><span class="standing-team"><button type="button" class="team-follow${selectionForTeam(followedTeams,r.team,c.id,c.sport)?' selected':''}" data-follow-team="${e(r.team)}" aria-pressed="${!!selectionForTeam(followedTeams,r.team,c.id,c.sport)}" aria-label="${e('Οι ομάδες μου: '+r.team)}">${selectionForTeam(followedTeams,r.team,c.id,c.sport)?'★':'☆'}</button><span>${team(r.team,r.badge||state.matches.find(m=>m.home===r.team)?.homeBadge||state.matches.find(m=>m.away===r.team)?.awayBadge)}</span></span></td><td>${r.played}</td><td>${r.wins}</td>${football?`<td>${r.draws}</td>`:''}<td>${r.losses}</td><td>${percent?e(r.winRate||'—'):r.points}</td></tr>`).join('')}</tbody></table></div>`;
}
function showHelp(){const cards=competitions.map(c=>`<div><b>${e(c.name)}</b><p>${e(c.file?'Δωρεάν openfootball / CC0. Δοκιμάστηκε HTTP 200 και CORS *. Αυτόματη ανάκτηση όταν ανοίγεις τη διοργάνωση, με αποθηκευμένο αντίγραφο αν αποτύχει. Κοινοτικά στοιχεία, όχι επίσημη πιστοποίηση.':c.note)}</p>${link(c.url,'Επίσημη ιστοσελίδα')}</div>`).join('');$('help-content').innerHTML=`<h3>Εγκατάσταση σε Android</h3><p>Άνοιξε τον σύνδεσμο GitHub Pages με Chrome. Δεν απαιτείται σύνδεση. Πάτησε «Εγκατάσταση εφαρμογής» ή μενού ⋮ → «Προσθήκη στην αρχική οθόνη» → «Εγκατάσταση». Η επιλογή εξαρτάται από τον browser. Δεν απαιτείται app store.</p><h3>Εγκατάσταση σε PC</h3><p>Σε Chrome ή Edge, άνοιξε τον ίδιο σύνδεσμο και πάτησε το εικονίδιο εγκατάστασης στη γραμμή διευθύνσεων ή την επιλογή εγκατάστασης από το μενού. Τοπικά εκκινείται και από localhost μέσω του παρεχόμενου οδηγού.</p><h3>Offline & ιδιωτικότητα</h3><p>Μετά την πρώτη επιτυχή φόρτωση, το κέλυφος και τα αποθηκευμένα δεδομένα παραμένουν στη συσκευή.  Οι εξωτερικές πηγές και η αρχική σύνδεση χρειάζονται internet. Οι πηγές ελέγχονται όταν ανοίγεις ή ανανεώνεις τη διοργάνωση. Χωρίς διαφημίσεις ή analytics στην εφαρμογή.</p><h3>Τι έχει ελεγχθεί</h3><p>Έλεγχος πηγών: 20/10/2026. Δεν χρησιμοποιούνται placeholders αγώνων, βαθμολογιών ή μεταδόσεων. Τα σήματα ομάδων προέρχονται από τις πηγές όπου παρέχονται. Το αρχικό screenshot δεν ήταν προσβάσιμο στη μεταφερμένη συνομιλία· η διάταξη ακολουθεί τη γραπτή περιγραφή.</p><div class="help-grid">${cards}</div><h3>Τηλεόραση</h3><p>Η ημερήσια λίστα ανανεώνεται από τις ρητές αναφορές μετάδοσης ΕΟΚ, ΕΣΑΚΕ και SL2, και από το δημοσιευμένο ημερήσιο πρόγραμμα Novasports που διαβάζεται απευθείας στον browser. Στη λίστα εμφανίζονται μόνο ρητά δηλωμένες ζωντανές μεταδόσεις. Οι επαναλήψεις και οι καταχωρίσεις χωρίς ένδειξη ζωντανής μετάδοσης αποκλείονται. Οι πηγές φορτώνονται παράλληλα και η λίστα εμφανίζεται σταδιακά, χωρίς να περιμένει την πιο αργή. Διατίθεται επαληθευμένο αντίγραφο ζωντανών μεταδόσεων ανά ημερομηνία για περίπτωση αποτυχίας της πηγής. Οι υπόλοιπες μεταδόσεις ελέγχονται στα επίσημα προγράμματα καναλιών. Δεν υπάρχει πλήρης δωρεάν ελληνικός EPG συνδεδεμένος. Δεν συμπεραίνουμε κανάλι από τα δικαιώματα μιας διοργάνωσης. Οι δοκιμές λανθασμένων URL COSMOTE / Nova επέστρεψαν 404 και αντικαταστάθηκαν με τους επίσημους συνδέσμους των προγραμμάτων.</p><p>${link('https://github.com/openfootball/football.json/blob/master/LICENSE.md','Άδεια openfootball CC0')} · ${link('https://www.football-data.org/coverage','Κάλυψη football-data.org')}</p>`;$('help-dialog').showModal();}
function selectTab(key){if(state.tab===key&&!(key==='matches'&&state.myTeams))return;state.tab=key;if(key==='matches')state.myTeams=false;state.id=defaultCompetition[key];choices();load();}
for(const id of ['side-nav','top-nav','bottom-nav'])$(id).addEventListener('click',event=>{const b=event.target.closest('[data-tab]');if(b)selectTab(b.dataset.tab);});
$('competition').addEventListener('change',()=>{state.id=$('competition').value;load();});$('round').addEventListener('change',()=>{state.round=$('round').value;render();});$('search').addEventListener('input',()=>{state.search=$('search').value;render();});
$('favorites-only').onclick=()=>{state.favoritesOnly=!state.favoritesOnly;if(state.favoritesOnly)state.myTeams=false;render();void refreshLive(true);};
document.addEventListener('click',event=>{const button=event.target.closest('[data-fixture-favorite]');if(!button)return;const match=renderedMatches[Number(button.dataset.fixtureFavorite)];if(!match)return;const next=toggleFavorite(match,favoriteFixtures);if(!savePreference(FAVORITES_KEY,next)){notify('Δεν αποθηκεύτηκαν τα αγαπημένα. Ελέγξτε τον χώρο αποθήκευσης.');return;}favoriteFixtures=next;render();});
window.addEventListener('storage',event=>{if(event.key===FAVORITES_KEY||event.key===null){favoriteFixtures=sanitizeFavorites(read(FAVORITES_KEY,[]));render();}});
$('live-only').onclick=()=>{
 state.liveOnly=!state.liveOnly;const previousDate=state.tvDate;
 if(state.liveOnly){state.tvDate=athensDay();state.round='';$('round').value='';}
 if(state.tab==='matches'&&previousDate!==state.tvDate){void load();return;}
 render();
 // Filtering uses the scores already on screen. Reuse a recent check and let
 // the normal 30-second poll update scores without an extra forced redraw.
 if(state.liveOnly&&(!liveReport||liveReport.date!==state.tvDate||Date.now()-Date.parse(liveReport.checkedAt)>=LIVE_INTERVAL))void refreshLive();
};
$('refresh').addEventListener('click',()=>{void refreshCardHighlights(true);load(true);});$('help').onclick=showHelp;$('data-help').onclick=showHelp;$('close-help').onclick=()=>$('help-dialog').close();
let installPrompt;
const standaloneMode=window.matchMedia('(display-mode: standalone)');
function updateInstallButton(){ $('install').hidden=standaloneMode.matches||navigator.standalone===true||read('sh-installed',false)===true; }
updateInstallButton();standaloneMode.addEventListener('change',updateInstallButton);
window.addEventListener('storage',event=>{if(event.key==='sh-installed')updateInstallButton();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;save('sh-installed',false);updateInstallButton();});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else showHelp();};
window.addEventListener('appinstalled',()=>{installPrompt=null;save('sh-installed',true);$('install').hidden=true;});

window.addEventListener('offline',()=>notify('Εκτός σύνδεσης · τα δεδομένα είναι αποθηκευμένα στιγμιότυπα. Οι εξωτερικές πηγές χρειάζονται internet.'));window.addEventListener('online',()=>load());
$('today').textContent=new Intl.DateTimeFormat('el-GR',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Athens'}).format(new Date());
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notify('Δεν ενεργοποιήθηκε η offline λειτουργία. Άνοιξε την εφαρμογή μέσω HTTPS ή localhost.'));
function changeDay(delta){state.tvDate=shiftDay(state.tvDate,delta*(state.tab==='matches'&&state.myTeams?7:1));state.archive=false;$('tv-archive').checked=false;if(state.tab==='tv'||state.tab==='matches'&&state.dailyIndex)load();else{render();void refreshLive();}}
$('tv-date').onchange=()=>{if($('tv-date').value){state.tvDate=$('tv-date').value;state.archive=false;if(state.tab==='tv'||state.tab==='matches'&&state.dailyIndex)load();else{render();void refreshLive();}}};
$('prev-day').onclick=()=>changeDay(-1);$('next-day').onclick=()=>changeDay(1);
$('today-button').onclick=()=>{state.tvDate=athensDay();state.archive=false;if(state.tab==='tv')load();else{render();void refreshLive();}};
function installSwipe(element,onSwipe){let start; element.addEventListener('touchstart',event=>{if(event.touches.length!==1||event.target.closest('input,select,a,button,summary,.table-scroll')){start=null;return;}start={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});element.addEventListener('touchend',event=>{if(!start||!event.changedTouches.length)return;const end={x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY};const direction=swipeDirection(start,end);start=null;if(direction)onSwipe(direction);},{passive:true});element.addEventListener('touchcancel',()=>{start=null;},{passive:true});}
installSwipe($('view'),direction=>{if(['tv','matches'].includes(state.tab))changeDay(direction);else{const i=nav.findIndex(n=>n[0]===state.tab),next=nav[i+direction];if(next)selectTab(next[0]);}});
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]')||!['tv','matches'].includes(state.tab)||event.target.closest('input,select,textarea,button,a,summary')||event.altKey||event.ctrlKey||event.metaKey)return;if(event.key==='ArrowLeft')changeDay(-1);if(event.key==='ArrowRight')changeDay(1);});
// Poll live scoreboards separately: never reload the full season or reset the selected round.
async function refreshLive(force=false){
 if(document.hidden||state.loading||['tv','standings'].includes(state.tab))return;
 if(livePending){if(force)liveQueued=true;return;}
 const today=athensDay(),selected=['matches','tv'].includes(state.tab)?state.tvDate:today;
 const date=state.tab==='matches'&&state.myTeams?(weekRange(selected).start===weekRange(today).start?today:null):selected;
 if(!date)return;let matches=state.matches.map(m=>({...m,competition:m.competition||state.id}));
 if(state.tab==='matches'&&state.myTeams)matches=weeklyMatches(matches,followedTeams,date,Object.fromEntries(competitions.map(c=>[c.id,c.sport])));
 const request=state.request,generation=++liveGeneration,context=state.tab+'|'+state.id+'|'+state.tvDate;livePending=true;
 try{const competitionIDs=state.tab==='matches'?(state.id==='all-matches'?competitions.map(c=>c.id):[state.id]):state.tab==='tv'?[...new Set(matches.map(m=>m.competition))]:[state.id];const report=await loadLiveScores(matches,date,{force,competitionIDs});if(generation!==liveGeneration||request!==state.request||context!==state.tab+'|'+state.id+'|'+state.tvDate)return;
  const ids=new Set(report.succeeded.filter(id=>!/^e(?:l|urocup)-/.test(id)));
  const keys=new Set(report.entries.map(x=>x.competition+'|'+x.id));
  liveEntries=liveEntries.filter(x=>x.scoreState==='final'||!(x.date===date&&(ids.has(x.competition)||keys.has(x.competition+'|'+x.id))));
  rememberConfirmedResults(report.entries);for(const x of report.entries){if(x.scoreState!=='final'&&liveEntries.some(old=>old.id===x.id&&old.competition===x.competition&&old.scoreState==='final'))continue;liveEntries=liveEntries.filter(old=>!(old.id===x.id&&old.competition===x.competition&&old.date===x.date));liveEntries.push(x);}
  liveReport=report;state.matches=(state.tab==='tv'?applyLiveScores(state.matches,liveEntries):mergeLiveMatches(state.matches,liveEntries,{date,competitionIDs})).map(m=>{const c=competitions.find(c=>c.id===m.competition);return c?{...m,competitionLabel:c.name,sportLabel:c.sport==='football'?'Ποδόσφαιρο':c.sport==='basketball'?'Μπάσκετ':'Βόλεϊ'}:m;});if(detailPromise)void detailPromise.then(p=>p.updateMatches?.(state.matches));render();
 }catch{}finally{livePending=false;const queued=liveQueued;liveQueued=false;if(queued||request!==state.request||context!==state.tab+'|'+state.id+'|'+state.tvDate)void refreshLive(queued||request!==state.request);}
}
setInterval(()=>{if(document.hidden||state.loading)return;const today=athensDay();if(['tv','matches'].includes(state.tab)&&!(state.tab==='matches'&&state.myTeams)&&state.tvDate!==today)return;void refreshLive(true);},LIVE_INTERVAL);

function shortDate(day){return new Intl.DateTimeFormat('el-GR',{day:'numeric',month:'short',timeZone:'Europe/Athens'}).format(new Date(day+'T12:00:00Z'));}
function renderMyTeamsControls(){
 const active=state.tab==='matches';$('match-controls').hidden=!active;$('match-mode').hidden=!active;$('my-teams-settings').hidden=!active||!state.myTeams;
 $('all-matches-mode').setAttribute('aria-pressed',String(!state.myTeams));$('my-teams-mode').setAttribute('aria-pressed',String(state.myTeams));
 $('my-teams-mode').textContent='Οι ομάδες μου'+(followedTeams.length?' · '+followedTeams.length:'');
 const html=followedTeams.map(s=>'<div class="followed-item"><span>'+e(displayTeamName(s.scope==='club'?s.clubLabel:s.team))+'<small>'+e(s.scope==='club'?'Όλα τα διαθέσιμα τμήματα':(competitions.find(c=>c.id===s.competition)?.name||s.sport))+'</small></span><button type="button" class="outline" data-remove-team="'+e(s.key)+'" aria-label="'+e('Αφαίρεση '+s.team)+'">×</button></div>').join('')+'<button type="button" class="outline" data-open-standings>Προσθήκη από τις βαθμολογίες</button>';
 if($('followed-list').innerHTML!==html)$('followed-list').innerHTML=html;
}
function persistTeams(next){
 followedTeams=next;const saved=save('sh-followed-teams-v1',next);render();
 if(!saved)notify('Οι επιλογές ισχύουν για αυτή την επίσκεψη. Η αποθήκευση στη συσκευή δεν είναι διαθέσιμη.');
 return saved;
}
function openTeamPicker(name){
 const c=current(),single=makeSelection(name,c.id,c.sport);if(!single)return;pendingTeam=single;
 const selected=selectionForTeam(followedTeams,name,c.id,c.sport);
 $('team-picker-title').textContent=displayTeamName(name);
 $('team-picker-section').textContent=c.name;
 $('follow-club').hidden=!single.club;
 $('follow-club').textContent='Όλα τα τμήματα · '+single.clubLabel;
 $('remove-followed').hidden=!selected;
 $('team-picker-note').textContent=single.club?'Τα διαθέσιμα προγράμματα ποδοσφαίρου, μπάσκετ και βόλεϊ, ανδρών και γυναικών.':'Το διαθέσιμο πρόγραμμα αυτού του τμήματος σε όλες τις διοργανώσεις που καλύπτονται.';
 $('team-picker').showModal();
}
function commitTeam(scope){
 if(!pendingTeam)return;const selection=makeSelection(pendingTeam.team,pendingTeam.competition,pendingTeam.sport,scope);
 persistTeams(addSelection(followedTeams,selection));$('team-picker').close();pendingTeam=null;
}
$('follow-section').onclick=()=>commitTeam('unit');$('follow-club').onclick=()=>commitTeam('club');
$('close-team-picker').onclick=()=>{$('team-picker').close();pendingTeam=null;};
$('team-picker').addEventListener('close',()=>{pendingTeam=null;});
$('remove-followed').onclick=()=>{
 if(!pendingTeam)return;const selected=selectionForTeam(followedTeams,pendingTeam.team,pendingTeam.competition,pendingTeam.sport);
 if(selected)persistTeams(followedTeams.filter(s=>s.key!==selected.key));$('team-picker').close();pendingTeam=null;
};
function switchMatchMode(value){
 if(state.myTeams===value)return;state.myTeams=value;load();
}
$('all-matches-mode').onclick=()=>switchMatchMode(false);$('my-teams-mode').onclick=()=>switchMatchMode(true);
document.addEventListener('click',event=>{
 const follow=event.target.closest('[data-follow-team]');if(follow&&state.tab==='standings'){openTeamPicker(follow.dataset.followTeam);return;}
 const remove=event.target.closest('[data-remove-team]');if(remove){persistTeams(followedTeams.filter(s=>s.key!==remove.dataset.removeTeam));if(state.tab==='matches')load();return;}
 if(event.target.closest('[data-open-standings]'))selectTab('standings');
});
window.addEventListener('storage',event=>{if(event.key==='sh-followed-teams-v1'){followedTeams=sanitizeSelections(read('sh-followed-teams-v1',[]));if(state.tab==='matches'&&state.myTeams)load();else render();}});


let lastPublishedCheck=0,lastOddsCheck=0;
async function refreshOtherResults(){
 if(document.hidden||state.loading||state.tab==='standings'||Date.now()-lastPublishedCheck<120000)return;lastPublishedCheck=Date.now();
 const request=state.request,today=athensDay(),ids=[...new Set(state.matches.filter(m=>m.date===today).map(m=>m.competition||state.id))].filter(id=>['sl2','gbl','elite','volley-w','volley-m'].includes(id));
 await Promise.all(ids.map(async id=>{try{const p=await loadProvider(id,state.season,{force:false});if(request!==state.request)return;const c=competitions.find(c=>c.id===id);if(!c)return;const entries=scheduleEntries(p,c);scheduleCache.set(state.season+'-'+id,{...p,entries});state.matches=state.matches.map(m=>{if((m.competition||state.id)!==id)return m;const next=entries.find(x=>x.id===m.id||'tv-'+x.id===m.id);return next?{...m,score:next.score,scoreState:next.scoreState,scoreCheckedAt:next.scoreCheckedAt}:m;});}catch{}}));if(request===state.request)render();
}
async function refreshOdds(){
 if(document.hidden||state.loading||state.tab!=='tv'||state.tvDate!==athensDay()||Date.now()-lastOddsCheck<90000)return;lastOddsCheck=Date.now();const request=state.request,date=state.tvDate;
 try{const p=await loadTVDetails(date,{competition:state.id,force:true});if(request!==state.request||date!==state.tvDate)return;tvDetailsCache.set(date,p);state.matches=applyTVDetails(state.matches,p.entries);render();}catch{}
}
setInterval(()=>{void refreshOtherResults();void refreshOdds();},30000);

choices();renderNav();load();

// Expire a LIVE label even when the next network request fails.
setInterval(()=>{if(!document.hidden&&state.matches.some(m=>m.scoreState==='live'||m.odds))render();},30000);

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state.loading){render();void refreshLive(true);}});

matchMedia('(min-width:701px)').addEventListener('change',()=>renderHeader());
