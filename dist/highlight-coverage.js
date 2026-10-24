import{selectHighlights}from'./highlights.js?v=51';
import{athensDay,shiftDay}from'./core.js?v=51';
// Missing links are observable; a source failure never means no video exists.
export function highlightCoverage(matches,videos,{now=Date.now(),days=3}={}){
 const end=athensDay(new Date(now)),start=shiftDay(end,1-days),competitions={};
 for(const id of ['europa','conference','nba']){const finished=matches.filter(m=>m.competition===id&&m.date>=start&&m.date<=end&&m.scoreState==='final'),known=videos.filter(v=>v.competition===id&&v.gameDate>=shiftDay(start,id==='nba'?-1:0)&&v.gameDate<=end),uncoveredMatches=finished.filter(m=>!selectHighlights(videos,m,{now})).map(({home,away,date,time})=>({home,away,date,time})),unmatchedVideos=known.filter(v=>!finished.some(m=>selectHighlights([v],m,{now}))).map(({videoId,title,gameDate})=>({videoId,title,gameDate}));competitions[id]={finished:finished.length,covered:finished.length-uncoveredMatches.length,uncoveredMatches,unmatchedVideos};}
 return{start,end,competitions};
}
