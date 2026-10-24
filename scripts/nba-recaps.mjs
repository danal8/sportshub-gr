import{athensDay,shiftDay}from'../dist/core.js';
import{sameResultMatch}from'../dist/result-reconciliation.js';
import{highlightTeamsMentioned}from'../dist/highlights.js';
const usDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}),athensTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function nextPage(html){const raw=String(html).match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];if(!raw)throw Error('NBA page data unavailable');return JSON.parse(raw).props?.pageProps;}
const nbaURL=(url,path)=>{try{const u=new URL(url);return u.origin==='https://www.nba.com'&&path.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}};
export function recapCandidates(html,date){
 const p=nextPage(html);if(p?.hasError||p?.selectedDate!==date||!Array.isArray(p.gameCardFeed?.modules))throw Error('Wrong NBA games date');
 const out=[];for(const card of p.gameCardFeed.modules.flatMap(m=>m.cards||[])){const g=card.cardData,r=g?.heroConfiguration?.gameRecap,d=new Date(g?.gameTimeUtc);
  if(g?.seasonYear!=='2026-27'||g.leagueId!=='00'||g.gameStatus!==3||!/^\d{10}$/.test(g.gameId)||!Number.isFinite(+d)||usDate.format(d)!==date)continue;
  if(!nbaURL(g.shareUrl,new RegExp('^/game/[a-z]{2,3}-vs-[a-z]{2,3}-'+g.gameId+'$'))||r&&(!r.taxonomy?.games?.[g.gameId]||!nbaURL(r.shareUrl,/^\/watch\/video\/[a-z0-9-]+$/)))continue;
  const home=r?.taxonomy.teams?.[g.homeTeam.teamId]||g.homeTeam.teamName,away=r?.taxonomy.teams?.[g.awayTeam.teamId]||g.awayTeam.teamName;if(!home||!away)continue;
  out.push({competition:'nba',nbaGameId:g.gameId,nativeVideoId:r?String(r.videoId):null,home,away,homeIDs:{nba:String(g.homeTeam.teamId)},awayIDs:{nba:String(g.awayTeam.teamId)},date:athensDay(d),time:athensTime.format(d),gameDate:date,score:[g.homeTeam.score,g.awayTeam.score],url:r?.shareUrl,sourceURL:g.shareUrl});
 }return out;
}
export function completeGameRef(html,ref){const g=nextPage(html)?.game,r=g?.gameRecap;if(g?.gameId!==ref.nbaGameId||g.gameStatus!==3||String(g.homeTeam?.teamId)!==ref.homeIDs.nba||String(g.awayTeam?.teamId)!==ref.awayIDs.nba||athensDay(new Date(g.gameTimeUTC))!==ref.date||r?.gameId!==ref.nbaGameId||!nbaURL(r.permalink,/^\/watch\/video\/[a-z0-9-]+$/))throw Error('NBA game recap not yet published');return{...ref,home:g.homeTeam.teamCity+' '+g.homeTeam.teamName,away:g.awayTeam.teamCity+' '+g.awayTeam.teamName,nativeVideoId:String(r.id),url:r.permalink};}
export function verifyRecap(html,ref,verifiedAt=new Date().toISOString()){
 const v=nextPage(html)?.video;if(v?.type!=='video'||v.status!=='publish'||!['free',''].includes(v.entitlements)||v.isMemberGated||String(v.id)!==ref.nativeVideoId||v.permalink!==ref.url||!v.taxonomy?.games?.[ref.nbaGameId]||!v.taxonomy?.teams?.[ref.homeIDs.nba]||!v.taxonomy?.teams?.[ref.awayIDs.nba]||!highlightTeamsMentioned(v.title,ref))throw Error('Unverified free NBA recap');
 const publishedAt=v.date||new Date(v.timestamp).toISOString();if(!Number.isFinite(Date.parse(publishedAt))||Date.parse(publishedAt)>Date.parse(verifiedAt)+300000||athensDay(new Date(publishedAt))<ref.date||athensDay(new Date(publishedAt))>shiftDay(ref.date,1))throw Error('Wrong recap publication date');
 return{publisher:'nba-com',competition:'nba',kind:'game',format:'recap',entitlement:v.entitlements||'public',videoId:'nba-com-'+v.id,nativeVideoId:String(v.id),nbaGameId:ref.nbaGameId,url:v.permalink,sourceURL:ref.sourceURL,title:v.title,gameDate:ref.gameDate,publishedAt,verifiedAt,durationSeconds:v.videoDurationSeconds};
}
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();}
export async function loadNBARecaps(matches,{known=new Set(),now=Date.now()}={}){
 const eligible=matches.filter(m=>m.competition==='nba'&&m.scoreState==='final'&&m.date>=shiftDay(athensDay(new Date(now)),-14)&&m.date<=athensDay(new Date(now))),dates=new Set();
 for(const m of eligible){dates.add(m.date);dates.add(shiftDay(m.date,-1));}
 const candidates=[],videos=[],errors=[];await Promise.all([...dates].map(async date=>{try{candidates.push(...recapCandidates(await get('https://www.nba.com/games?date='+date),date));}catch(e){errors.push(date+': '+e.message);}}));
 const short=n=>n.endsWith('Trail Blazers')?'Trail Blazers':n.split(' ').at(-1),pending=[...new Map(candidates.map(c=>[c.nbaGameId,c])).values()].filter(c=>{const hits=eligible.filter(m=>sameResultMatch({...m,homeAliases:[...(m.homeAliases||[]),short(m.home)],awayAliases:[...(m.awayAliases||[]),short(m.away)]},c));return hits.length===1&&hits[0].score?.every((s,i)=>s===c.score[i])&&!known.has('nba-com|nba-com-'+c.nativeVideoId);});let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.length){let c=pending[cursor++];try{if(!c.url)c=completeGameRef(await get(c.sourceURL),c);videos.push(verifyRecap(await get(c.url),c,new Date(now).toISOString()));}catch(e){errors.push(c.nbaGameId+': '+e.message);}}}));
 return{videos,errors,scanned:candidates.length};
}
