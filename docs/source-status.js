// Observed fetch/content times; never infer a publisher's modification time.
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).filter(k=>!['scoreCheckedAt','checkedAt','retrievedAt','lastAttemptAt','lastSuccessAt'].includes(k)).sort().map(k=>[k,v[k]])):v);
export function contentFingerprint(value){let h=2166136261;for(const c of stable(value??null))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16);}
export function sectionStatus(previous,{data,previousData,source,now=new Date().toISOString(),error=null,sourceUpdatedAt=null,coverage=null}={}){
 const old=previous||{},fingerprint=contentFingerprint(data),changed=previousData!==undefined&&contentFingerprint(previousData)!==fingerprint;
 return{source:source||old.source||null,lastAttemptAt:now,lastSuccessAt:error?old.lastSuccessAt||null:now,contentChangedAt:error?old.contentChangedAt||null:changed?now:old.contentChangedAt||null,sourceUpdatedAt:sourceUpdatedAt||old.sourceUpdatedAt||null,fingerprint:error?old.fingerprint||null:fingerprint,status:error?'failed':coverage?.stale?'stale':'ok',error,retained:!!error,retainedCount:error&&Array.isArray(data)?data.length:0,...(coverage?{coverage}:{})};
}
export function updatePayloadSections(next,old,{now=new Date().toISOString()}={}){
 const sections={...old?.sections,...next.sections};
 sections.matches=sectionStatus(old?.sections?.matches,{data:next.matches,previousData:old?.matches,source:next.source,now});
 const failed=next.sections?.standings?.error;
 if(failed)next={...next,standings:old?.standings||[],standingsSource:next.standingsSource||old?.standingsSource};
 if(next.standingsSource)sections.standings=sectionStatus(old?.sections?.standings,{data:next.standings||[],previousData:old?.standings,source:next.standingsSource,now,error:failed||null,coverage:next.sections?.standings?.coverage});
 return{...next,sections};
}
export function formatSourceTime(value){if(!value||!Number.isFinite(Date.parse(value)))return 'δεν είναι γνωστή';return new Intl.DateTimeFormat('el-GR',{timeZone:'Europe/Athens',dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
export function sourceStatusText(status,label,{now=Date.now()}={}){
 if(!status)return label+': δεν υπάρχουν διακριτά στοιχεία επιτυχούς ανάκτησης.';
 let host=status.source||'άγνωστη πηγή';try{host=new URL(host).hostname;}catch{}
 const age=status.lastSuccessAt?Math.max(0,Math.floor((now-Date.parse(status.lastSuccessAt))/60000)):null;
 return label+' · '+host+' · Απόπειρα: '+formatSourceTime(status.lastAttemptAt)+' · Επιτυχής ανάκτηση: '+formatSourceTime(status.lastSuccessAt)+(Number.isFinite(age)?' (πριν '+age+' λεπτά)':'')+' · Παρατηρήθηκε αλλαγή περιεχομένου: '+(status.contentChangedAt?formatSourceTime(status.contentChangedAt):'δεν τεκμηριώνεται')+(status.sourceUpdatedAt?' · Ενημέρωση πηγής: '+formatSourceTime(status.sourceUpdatedAt):'')+(status.error?' · ΑΠΟΤΥΧΙΑ: '+status.error+' · Διατηρήθηκαν προηγούμενα δεδομένα.':status.coverage?.stale?' · ΚΑΘΥΣΤΕΡΗΜΕΝΗ ΒΑΘΜΟΛΟΓΙΑ: '+status.coverage.lagging.map(r=>r.team+' '+r.played+'/'+r.confirmedFinals+' αγώνες').join(', '):'');
}
