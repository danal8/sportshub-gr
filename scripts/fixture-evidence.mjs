import{athensDay}from'../dist/core.js';
// A changed calendar date requires the event's detail page to independently
// confirm its competition, season, oriented club IDs, final score and date.
export function verifyESPNFixture(raw,entry,league){
 const h=raw?.header,g=h?.competitions?.find(g=>String(g.id)===entry.eventIDs?.espn),home=g?.competitors?.find(c=>c.homeAway==='home'),away=g?.competitors?.find(c=>c.homeAway==='away');
 if(h?.league?.slug!==league||h.season?.year!==2026||String(h.id)!==entry.eventIDs?.espn||!g?.status?.type?.completed||String(home?.team?.id)!==entry.homeIDs?.espn||String(away?.team?.id)!==entry.awayIDs?.espn||athensDay(new Date(g.date))!==entry.date||Number(home.score)!==entry.score?.[0]||Number(away.score)!==entry.score?.[1])return null;
 return{provider:'ESPN',season:'2026-27',competition:entry.competition,eventID:String(h.id),date:entry.date,homeID:entry.homeIDs.espn,awayID:entry.awayIDs.espn,source:entry.source,verifiedAt:new Date().toISOString()};
}
