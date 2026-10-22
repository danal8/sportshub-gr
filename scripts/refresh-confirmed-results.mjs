import{readFile,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';
import{competitions}from'../dist/data.js';
import{liveLeagues,parseLiveScoreboard,applyLiveScores}from'../dist/live-scores.js';
import{resultCoverage,sameResultMatch}from'../dist/result-reconciliation.js';
import{athensDay,shiftDay}from'../dist/core.js';
const root=new URL('../dist/snapshots/',import.meta.url);
export async function refreshConfirmedResults({fetchJSON=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();},today=athensDay()}={}){
 const reports=[];
 await Promise.all(competitions.map(async c=>{
  let p;const file=new URL(c.id+'-2026-27.json',root);try{p=JSON.parse(await readFile(file));}catch{return;}
  const matches=p.matches.map(m=>({...m,competition:c.id}));let entries=[],error=null;
  if(liveLeagues[c.id])try{
   const [sport,league]=liveLeagues[c.id],dates=[...new Set([today,shiftDay(today,-1),...matches.filter(m=>m.date&&m.date<=today&&m.scoreState!=='final').map(m=>m.date)])].sort().reverse();
   const errors=[];for(const date of dates){try{const raw=await fetchJSON('https://site.web.api.espn.com/apis/site/v2/sports/'+sport+'/'+league+'/scoreboard?region=us&lang=en&contentorigin=espn&limit=1000&dates='+date.replaceAll('-',''));entries.push(...parseLiveScoreboard(raw,c.id).filter(e=>e.date<=today));}catch(e){errors.push(date+': '+e.message);}}if(errors.length)error=errors.join('; ');
   entries=[...new Map(entries.map(e=>[e.id,e])).values()];
   // Updates only existing, uniquely verified fixtures; never invents a final.
   p.matches=applyLiveScores(matches,entries);for(const x of entries)if(['final','live'].includes(x.scoreState)&&x.score&&(!matches.some(m=>m.date===x.date)||p.partial===true)&&!p.matches.some(m=>sameResultMatch(m,x)))p.matches.push({...x,scoreCheckedAt:x.checkedAt,scoreSource:x.source,scoreProvider:x.provider});p.resultSources=[...new Set([...(p.resultSources||[]),'ESPN'])];p.resultsCheckedAt=new Date().toISOString();
   await writeFile(file,JSON.stringify(p));
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
