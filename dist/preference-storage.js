// Preferences take priority over large, replaceable schedule snapshots.
const quota=error=>error?.name==='QuotaExceededError'||error?.name==='NS_ERROR_DOM_QUOTA_REACHED'||error?.code===22||error?.code===1014;
const replaceable=key=>/^sh-(?:static-|provider-v\d+-|data-|tv-)/.test(key);
export function savePreference(key,value,storage){
 let json;try{storage??=globalThis.localStorage;json=JSON.stringify(value);storage.setItem(key,json);return true;}catch(error){if(!quota(error))return false;}
 let caches;try{caches=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k!==key&&replaceable(k)).map(k=>({key:k,size:(storage.getItem(k)||'').length})).sort((a,b)=>b.size-a.size);}catch{return false;}
 for(const cache of caches){try{storage.removeItem(cache.key);storage.setItem(key,json);return true;}catch(error){if(!quota(error))return false;}}
 return false;
}
