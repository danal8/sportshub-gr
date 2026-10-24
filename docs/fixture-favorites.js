import{sameResultMatch}from'./result-reconciliation.js?v=60';
export const FAVORITES_KEY='sh-favorite-fixtures-v1';
const safeBadge=url=>typeof url==='string'&&!url.startsWith('data:')&&url.length<2048;
export function sanitizeFavorites(value){return Array.isArray(value)?value.filter(m=>m&&typeof m.home==='string'&&typeof m.away==='string'&&typeof m.competition==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)).map(m=>Object.fromEntries(['id','competition','date','time','home','away','homeBadge','awayBadge','competitionLabel','sportLabel','channel','streamURL','homeIDs','awayIDs','eventIDs'].filter(k=>m[k]!==undefined&&(!['homeBadge','awayBadge'].includes(k)||safeBadge(m[k]))).map(k=>[k,m[k]]))):[];}
export function isFavorite(match,favorites){return favorites.some(f=>sameResultMatch(match,f));}
export function toggleFavorite(match,favorites){return isFavorite(match,favorites)?favorites.filter(f=>!sameResultMatch(match,f)):sanitizeFavorites([...favorites,match]);}
// Keep the current schedule's result; saved TV records only fill missing fixtures.
export function favoriteMatches(matches,favorites){return [...matches.filter(m=>isFavorite(m,favorites)),...favorites.filter(f=>!matches.some(m=>sameResultMatch(m,f)))];}
