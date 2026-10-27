import{sectionStatus}from'../dist/source-status.js';
import{standingsCoverage}from'../dist/standings-health.js';
import{verifyESPNFixture}from'./fixture-evidence.mjs';
import{readFile,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';
import{competitions}from'../dist/data.js';
import{liveLeagues,parseLiveScoreboard,applyLiveScores}from'../dist/live-scores.js';
import{resultCoverage,sameResultMatch,reconcileFixtureDates}from'../dist/result-reconciliation.js';
import{athensDay,shiftDay}from'../dist/core.js';
const root=new URL('../dist/snapshots/',import.meta.url);
export async function refreshConfirmedResults({fetchJSON=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();},today=athensDay()}={}){
 const reports=[];
 await Promise.all(competitions.map(async c=>{
  let p;const file=new URL(c.id+'-2026-27.json',root);try{p=JSON.parse(await readFile(file));}catch{return;}
  const matches=p.matches.map(m=>({...m,competition:c.id}));let entries=[],error=null;
  if(liveLeagues[c.id])try{
   const [sport,league]=liveLeagues[c.id],dates=[...new Set([...Array.from({length:7},(_,i)=>shiftDay(today,-i)),...matches.filter(m=>m.date&&m.date<=today&&m.scoreState!=='final').map(m=>m.date)])].sort().reverse();
   const errors=[];let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<dates.length){const date=dates[cursor++];try{const raw=await fetchJSON('https://site.web.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?region=us&lang=en&contentorigin=espn&limit=1000&dates='+date.replaceAll('-',''));entries.push(...parseLiveScoreboard(raw,c.id).filter(e=>e.date<=today));}catch(e){errors.push(date+': '+e.message);}}}));if(errors.length)error=errors.join('; ');
   entries=[...new Map(entries.map(e=>[e.id,e])).values()];
   for(const x of entries.filter(x=>x.scoreState==='final'&&!matches.some(m=>sameResultMatch(m,x)))){
    const possible=matches.filter(m=>m.competition===x.competition&&sameResultMatch({...m,date:x.date},x));
    if(possible.length===1&&possible[0].homeIDs?.espn===x.homeIDs?.espn&&possible[0].awayIDs?.espn===x.awayIDs?.espn)try{x.fixtureEvidence=verifyESPNFixture(await fetchJSON('https://site.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/summary?event='+x.eventIDs.espn),x,league);}catch(e){error=[error,'Date verification failed: '+x.id+' '+e.message].filter(Boolean).join('; ');}
   }
   // Updates only existing, uniquely verified fixtures; never invents a final.
   p.matches=applyLiveScores(reconcileFixtureDates(matches,entries),entries);for(const x of entries)if(['final','live'].includes(x.scoreState)&&x.score&&p.partial===true&&!p.matches.some(m=>sameResultMatch(m,x)))p.matches.push({...x,scoreCheckedAt:x.checkedAt,scoreSource:x.source,scoreProvider:x.provider});p.resultSources=[...new Set([...(p.resultSources||[]),'ESPN'])];p.resultsCheckedAt=new Date().toISOString();
   p.sections={...p.sections,results:sectionStatus(p.sections?.results,{data:p.matches.filter(m=>m.scoreState==='final'),previousData:matches.filter(m=>m.scoreState==='final'),source:'https://www.espn.com/',error})};if(p.standings?.length){const coverage=standingsCoverage(p.matches,p.standings,{today});p.sections.standings={...p.sections.standings,source:p.standingsSource,coverage,status:p.sections.standings?.error?'failed':coverage.stale?'stale':p.sections.standings?.status||'unknown'};}await writeFile(file,JSON.stringify(p));
  }catch(e){error=e.message;}
  const coverage=resultCoverage(p.matches.map(m=>({...m,competition:c.id})),entries,today);
  reports.push({competition:c.id,...coverage,sourceError:error,finals:p.matches.filter(m=>m.scoreState==='final'&&m.score).length});
 }));
 const report={season:'2026-27',checkedAt:new Date().toISOString(),note:'Awaiting results includes scheduled, postponed and unsupported fixtures; it never asserts that a match has finished.',competitions:reports.sort((a,b)=>a.competition.localeCompare(b.competition))};
 await writeFile(new URL('results-coverage.json',root),JSON.stringify(report,null,2));
 console.log('RESULT COVERAGE',JSON.stringify(reports.map(r=>({id:r.competition,finals:r.finals,unmatched:r.unmatchedResults.length,awaiting:r.awaitingResults.length,error:r.sourceError}))));
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await refreshConfirmedResults();
