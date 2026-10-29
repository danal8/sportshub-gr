export const defaultCompetition={football:'sl2',basketball:'elite',volleyball:'volley-w',standings:'sl2',tv:'all-tv',matches:'all-matches'};
export function orderedCompetitions(competitions,tab){
 const list=competitions.filter(c=>(tab!=='standings'||!c.noStandings)&&(!['football','basketball','volleyball'].includes(tab)||c.sport===tab));
 const first=defaultCompetition[tab];
 return [...list].sort((a,b)=>Number(b.id===first)-Number(a.id===first)||a.name.localeCompare(b.name,'el',{sensitivity:'base',numeric:true}));
}
