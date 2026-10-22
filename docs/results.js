export const validScore=s=>Array.isArray(s)&&s.length===2&&s.every(n=>Number.isInteger(n)&&n>=0);
export function sl2Score(g){
 const score=[g.home_score,g.away_score];
 const state=g.status==='finished'?'final':['live','in_progress','halftime'].includes(g.status)?'live':null;
 return {score:state&&validScore(score)?score:null,scoreState:state};
}
// A failed refresh, offline copy or old snapshot must never claim to be live.
export function safeResults(payload,now=Date.now()){
 const age=now-Date.parse(payload.retrievedAt),fresh=!payload.fallback&&Number.isFinite(age)&&age>=-60000&&age<120000;
 return {...payload,matches:payload.matches.map(m=>({...m,scoreState:m.scoreState==='live'&&!fresh?'current':m.scoreState,scoreCheckedAt:payload.retrievedAt}))};
}
export function resultLabel(m,now=Date.now()){
 if(!validScore(m.score))return '';
 if(m.scoreState==='final')return m.sportLabel==='Βόλεϊ'?'Τελικό · σετ':'Τελικό';
 const age=now-Date.parse(m.scoreCheckedAt);if(m.scoreState==='live'&&age>=-60000&&age<(m.scoreProvider?90000:120000))return '● LIVE'+(m.scoreClock?' · '+m.scoreClock:'');
 return 'Σκορ πηγής';
}
