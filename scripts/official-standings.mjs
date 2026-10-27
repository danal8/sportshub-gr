import{parseEliteTable}from'../dist/feeds.js';
import{parseGBLTable}from'../worker/runtime.mjs';
import{validateOfficialStandings,standingsCoverage}from'../dist/standings-health.js';
import{sectionStatus}from'../dist/source-status.js';
export async function refreshOfficialTable(next,old,id,{fetchText,now=new Date().toISOString()}={}){
 const source=id==='elite'?'https://www.eliteleague.gr/standings/':'https://www.esake.gr/el/action/EsakeRanking';let standings=old.standings||[],error=null;
 try{const html=await fetchText(source);if(next.season!=='2026-27'&&old.season!=='2026-27')throw Error('Λανθασμένη σεζόν');if(id==='gbl'&&!/184645B9[^>]*selected[\s\S]{0,100}2026-2027|selected[^>]*[^<]*2026-2027/.test(html))throw Error('Η επιλεγμένη σεζόν ΕΣΑΚΕ δεν επαληθεύτηκε');standings=validateOfficialStandings((id==='elite'?parseEliteTable:parseGBLTable)(html),{expected:id==='elite'?16:14,matches:next.matches});}catch(e){error=e.message;}
 const coverage=standingsCoverage(next.matches,standings);return{...next,standings,standingsSource:source,sections:{...next.sections,standings:sectionStatus(old.sections?.standings,{data:standings,previousData:old.standings,source,now,error,coverage})}};
}
