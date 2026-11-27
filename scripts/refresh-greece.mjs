import {readFile, writeFile} from 'node:fs/promises';

const ert = 'https://program.ert.gr/widget/boxes/tvsports_homepage.asp';
const archive = 'https://www.basket.gr/nat-teams/ethniki-andron-gia-tin-niki-sto-telekom-center-athens-me-t/196621/';
const tz = {timeZone:'Europe/Athens'};
const formatDay = new Intl.DateTimeFormat('sv-SE', tz);
const formatTime = new Intl.DateTimeFormat('en-GB', {...tz,hour:'2-digit',minute:'2-digit'});
const names = new Map();
const english = new Intl.DisplayNames('en',{type:'region',fallback:'none'});
const greek = new Intl.DisplayNames('el',{type:'region'});
for (let x=65;x<=90;x++) for(let y=65;y<=90;y++){
  const code=String.fromCharCode(x,y);
  if(english.of(code)) names.set(english.of(code),greek.of(code));
}
const norm = s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
async function request(url){
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!r.ok) throw Error(url+' HTTP '+r.status);
  return r;
}
let listings='';
try { listings=await (await request(ert)).text(); } catch(e){console.warn(e.message);}
function ertChannel(match,sport){
  const [year,month,day]=match.date.split('-').map(Number);
  const title=sport===1?'Ποδόσφαιρο':'Μπάσκετ';
  for(const row of listings.split(/<tr class=/i)){
    const slot=row.match(/(\d{1,2})\s*&nbsp;([^<]+)<br>\s*(\d\d:\d\d)/i);
    if(!slot || +slot[1]!==day || slot[3]!==match.time) continue;
    const entity={Alpha:'Α',Beta:'Β',Gamma:'Γ',Delta:'Δ',Epsilon:'Ε',Zeta:'Ζ',Eta:'Η',Theta:'Θ',Iota:'Ι',Kappa:'Κ',Lambda:'Λ',Mu:'Μ',Nu:'Ν',Xi:'Ξ',Omicron:'Ο',Pi:'Π',Rho:'Ρ',Sigma:'Σ',Tau:'Τ',Upsilon:'Υ',Phi:'Φ',Chi:'Χ',Psi:'Ψ',Omega:'Ω'};
    const monthText=slot[2].replace(/&([a-z]+);/gi,(all,key)=>entity[key[0].toUpperCase()+key.slice(1)]||all);
    const expected=new Intl.DateTimeFormat('el',{month:'long'}).format(new Date(year,month-1,15));
    if(norm(monthText).slice(0,3)!==norm(expected).slice(0,3))continue;
    const plain=norm(row.replace(/<[^>]+>/g,' '));
    if(!plain.includes(norm(title))||!plain.includes(norm(match.home))||!plain.includes(norm(match.away))||!/[（(][ΖZ][)）]/i.test(row))continue;
    const channel=row.match(/<font color="#1b518e">([^<]+)/i)?.[1];
    if(channel)return channel.trim();
  }
}
for(const [id,team,sport] of [['greece-basket',2401,2],['greece-football',5030,1]]){
 try{
  const file=new URL('../dist/snapshots/'+id+'-2026-27.json',import.meta.url);
  let old={matches:[]};try{old=JSON.parse(await readFile(file,'utf8'));}catch{}
  if(Date.now()-Date.parse(old.retrievedAt)<3600000)continue;
  const source='https://www.365scores.com/'+(sport===1?'football':'basketball')+'/team/greece-'+team;
  const sources=['results','fixtures'].map(type=>'https://webws.365scores.com/web/games/'+type+'/?appTypeId=5&langId=1&userCountryId=13&competitors='+team);
  const pages=await Promise.all(sources.map(async url=>(await request(url)).json()));
  const matches=new Map(old.matches.filter(m=>m.scoreState==='final').map(m=>[m.id,m]));
  for(const game of pages.flatMap(p=>p.games)){
   const h=game.homeCompetitor,a=game.awayCompetitor;
   if(game.sportId!==sport||![h.id,a.id].includes(team))continue;
   const start=new Date(game.startTime),date=formatDay.format(start);
   if(date<'2026-07-01'||date>='2027-07-01')continue;
   const m={id:'365-'+game.id,competition:id,home:names.get(h.name)||h.name,away:names.get(a.name)||a.name,date,time:formatTime.format(start),round:game.competitionDisplayName,source,provider:'365Scores'};
   if(game.statusGroup===4&&h.score>=0&&a.score>=0){m.score=[h.score,a.score];m.scoreState='final';}
   const previous=old.matches.find(p=>p.id===m.id&&p.date===date&&p.time===m.time);
   const channel=ertChannel(m,sport);
   if(channel){m.channel=channel;m.broadcastSource=ert;}
   else if(game.id===4761758){m.channel='ΕΡΤ2 ΣΠΟΡ';m.broadcastSource=archive;}
   else if(previous?.channel){m.channel=previous.channel;m.broadcastSource=previous.broadcastSource;}
   matches.set(m.id,m);
  }
  if(!matches.size)throw Error('Empty Greece schedule');
  await writeFile(file,JSON.stringify({season:'2026-27',matches:[...matches.values()].sort((a,b)=>a.date.localeCompare(b.date)),standings:[],source,retrievedAt:new Date().toISOString()}));
 }catch(e){console.error(id,e.message);process.exitCode=1;}
}
