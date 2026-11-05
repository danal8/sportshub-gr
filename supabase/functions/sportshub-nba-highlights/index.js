import https from'node:https';
import{recapCandidates,completeGameRef,verifyRecap}from'./nba-recaps.js';
import{athensDay,shiftDay}from'./core.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
export function createNbaHighlightsHandler({fetchImpl=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map(),json=(p,status=200)=>new Response(JSON.stringify(p),{status,headers});
 const text=async url=>{
  // NBA's CDN rejects HTTP/2 and times out on the edge runtime's IPv6 route.
  // Node HTTPS selects IPv4 while retaining hostname/SNI and TLS verification.
  if(typeof Deno!=='undefined'&&fetchImpl===fetch)return new Promise((resolve,reject)=>{
   const req=https.get(url,{family:4,headers:{'User-Agent':'Mozilla/5.0 (compatible; SportsHub/1.0)'}},r=>{if(r.statusCode!==200){r.resume();reject(Error('NBA.com HTTP '+r.statusCode));return;}let body='';r.setEncoding('utf8');r.on('data',chunk=>{body+=chunk;if(body.length>8000000)req.destroy(Error('NBA response too large'));});r.on('end',()=>resolve(body));r.on('error',reject);});req.setTimeout(10000,()=>req.destroy(Error('NBA source timeout')));req.on('error',reject);
  });
  const r=await fetchImpl(url,{signal:AbortSignal.timeout(9000),cache:'no-store'});if(!r.ok)throw Error('NBA.com HTTP '+r.status);return r.text();
 };
 async function collect(date){
  const refs=[],errors=[],videos=[],verifiedAt=new Date(now()).toISOString();
  await Promise.all([date,shiftDay(date,-1)].map(async d=>{try{refs.push(...recapCandidates(await text('https://www.nba.com/games?date='+d),d).filter(r=>r.date===date));}catch(e){errors.push(d+': '+e.message);}}));
  const candidates=[...new Map(refs.map(r=>[r.nbaGameId,r])).values()];let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{while(cursor<candidates.length){let r=candidates[cursor++];try{if(!r.url)r=completeGameRef(await text(r.sourceURL),r);videos.push(verifyRecap(await text(r.url),r,verifiedAt));}catch(e){errors.push(r.nbaGameId+': '+e.message);}}}));
  if(!videos.length&&errors.length)throw Error(errors.slice(0,3).join('; '));
  return{season:'2026-27',date,retrievedAt:verifiedAt,videos,errors,finished:candidates.length};
 }
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='GET')return json({error:'Read only'},405);
  const date=new URL(req.url).searchParams.get('date'),today=athensDay(new Date(now()));
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<shiftDay(today,-14)||date>today)return json({error:'Unsupported NBA date'},400);
  const old=cache.get(date);if(old&&now()-old.at<120000)return json(old.payload);
  if(!pending.has(date))pending.set(date,collect(date).then(payload=>{if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(date,{at:now(),payload});return payload;}).finally(()=>pending.delete(date)));
  try{return json(await pending.get(date));}catch(error){return old?json({...old.payload,errors:['Source unavailable; retained original verification time']}):json({error:'NBA.com recap verification unavailable',sourceError:error.message},503);}
 };
}
if(typeof Deno!=='undefined')Deno.serve(createNbaHighlightsHandler());
