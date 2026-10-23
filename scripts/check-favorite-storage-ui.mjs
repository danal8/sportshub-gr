import{chromium}from'playwright';import{createServer}from'node:http';import{readFile,mkdir}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const root=path.resolve('docs'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
try{
 const raw=JSON.parse(await readFile('tests/fixtures/details.json','utf8'))['soccer-summary'],g=raw.header.competitions[0];
 raw.plays=[{id:'away-sub',type:{text:'Substitution'},team:{id:'1010'},clock:{displayValue:"63'"},period:{number:2},participants:[{type:'replacement',athlete:{displayName:'Incoming Player'}},{type:'replaced',athlete:{displayName:'Outgoing Player'}}],text:'Long commentary must be omitted'}];
 const match={id:'compact-test',date:'2026-10-18',round:'1',time:'16:00',home:'Kalamata',away:'OFI Crete',score:[4,3],scoreState:'final'},payload={season:'2026-27',source:'https://www.espn.com/soccer/',retrievedAt:new Date().toISOString(),matches:[match]};
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const url=route.request().url(),u=new URL(url),json=p=>route.fulfill({json:p});
  if(url.startsWith(origin)){if(u.pathname==='/snapshots/sl-2026-27.json')return json(payload);if(u.pathname==='/snapshots/highlights-2026-27.json')return json({season:'2026-27',videos:[]});return route.continue();}
  if(u.pathname.includes('/soccer/gre.1/scoreboard'))return json({leagues:[{season:{year:2026}}],events:[{id:raw.header.id,date:g.date,competitions:[g]}]});
  if(u.pathname.includes('/soccer/gre.1/summary'))return json(raw);
  return route.abort();
 });
 await page.goto(origin);const loaded=()=>page.locator('#refresh:not([disabled])').waitFor();await loaded();

 const star=()=>page.locator('[data-fixture-favorite]').first();await star().waitFor();
 await page.evaluate(()=>{
  localStorage.setItem('sh-followed-teams-v1','[]');localStorage.setItem('sh-confirmed-results-2026-27','[]');localStorage.setItem('other-app-sentinel','keep');
  let value='';for(const step of [100000,10000,1000,100,10,1]){while(true){try{const next=value+'x'.repeat(step);localStorage.setItem('sh-provider-v5-quota-test',next);value=next;}catch(e){if(e.name!=='QuotaExceededError')throw e;break;}}}
 });
 await star().click();assert.equal(await star().getAttribute('aria-pressed'),'true','A full browser store must not block the star');assert.equal(await page.locator('#detail-dialog[open]').count(),0);
 const saved=await page.evaluate(()=>({favorites:JSON.parse(localStorage.getItem('sh-favorite-fixtures-v1')),sentinel:localStorage.getItem('other-app-sentinel'),teams:localStorage.getItem('sh-followed-teams-v1'),finals:localStorage.getItem('sh-confirmed-results-2026-27')}));assert.equal(saved.favorites.length,1);assert.equal(saved.sentinel,'keep');assert.equal(saved.teams,'[]');assert.equal(saved.finals,'[]');
 await page.reload();await loaded();assert.equal(await star().getAttribute('aria-pressed'),'true','Favorite survives reload after recovering storage');await page.setViewportSize({width:390,height:844});await star().click();assert.equal(await star().getAttribute('aria-pressed'),'false','Mobile tap removes the favorite');assert.deepEqual(errors,[]);console.log('Full localStorage recovered; TV stars save, survive reload and remove without deleting user preferences or confirmed results.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
