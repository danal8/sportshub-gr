import{chromium}from'playwright';import{createServer}from'node:http';import{readFile,mkdir}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const root=path.resolve('docs'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'},apiCalls=[];
const server=createServer(async(req,res)=>{if(req.url.startsWith('/api/'))apiCalls.push(req.url);try{const name=new URL(req.url,'http://local').pathname;const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('outside root');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 const tab=label=>page.locator('#top-nav').getByRole('button',{name:label,exact:true});const loaded=()=>page.locator('#refresh:not([disabled])').waitFor();
 await loaded();await tab('Βαθμολογίες').click();await loaded();await page.locator('[data-follow-team="ΠΑΝΙΩΝΙΟΣ"]').click();await page.locator('#follow-club').click();
 assert.equal(await page.locator('[data-follow-team="ΠΑΝΙΩΝΙΟΣ"]').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>localStorage.setItem('sh-my-teams-mode','true'));await page.reload();await loaded();await tab('Αγώνες').click();await loaded();assert.equal(await page.locator('#all-matches-mode').getAttribute('aria-pressed'),'true');await page.locator('#my-teams-mode').click();await loaded();await page.locator('#tv-date').fill('2026-10-21');await page.locator('#tv-date').dispatchEvent('change');await loaded();
 const rows=await page.locator('.match').allTextContents();assert.ok(rows.length>=3,JSON.stringify(rows));assert.ok(rows.every(t=>/πανιωνιοσ/i.test(t.normalize('NFD').replace(/\p{M}/gu,'').replace(/ς/g,'σ'))),JSON.stringify(rows));
 assert.match(await page.locator('#week-range').textContent(),/19.*25/);assert.equal(await page.locator('.match .team-follow').count(),0);
 assert.ok(await page.locator('.match').evaluateAll(es=>new Set(es.map(e=>e.innerText)).size===es.length));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 const layout=await page.evaluate(()=>{const controls=document.querySelector('#match-controls').getBoundingClientRect(),first=document.querySelector('.match').getBoundingClientRect(),filters=document.querySelector('.filters').getBoundingClientRect();return {gap:first.top-controls.top-['data-freshness','highlights-warning','integrity-warning'].reduce((sum,id)=>sum+(document.getElementById(id)?.getBoundingClientRect().height||0),0),filtersHeight:filters.height,seasonVisible:document.querySelector('#season').getClientRects().length>0};});
 assert.ok(layout.gap<240,JSON.stringify(layout));assert.ok(layout.filtersHeight<=42,JSON.stringify(layout));assert.equal(layout.seasonVisible,false);
 await mkdir('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/my-teams-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Επόμενη εβδομάδα',exact:true}).click();assert.equal(await page.locator('#tv-date').inputValue(),'2026-10-28');
 await page.getByRole('button',{name:'Προηγούμενη εβδομάδα',exact:true}).click();assert.equal(await page.locator('#tv-date').inputValue(),'2026-10-21');
 await page.setViewportSize({width:1280,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
 await page.screenshot({path:'test-artifacts/my-teams-desktop.png',fullPage:true});
 await tab('Βαθμολογίες').click();await loaded();await page.locator('#competition').selectOption('nba');await loaded();await page.locator('[data-follow-team="Boston Celtics"]').click();assert.ok(!await page.locator('#follow-club').isVisible());await page.locator('#follow-section').click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sh-followed-teams-v1')).length),2);
 await tab('Αγώνες').click();await loaded();assert.equal(await page.locator('#all-matches-mode').getAttribute('aria-pressed'),'true');await page.locator('#my-teams-mode').click();await loaded();await page.locator('#tv-date').fill('2026-10-21');await page.locator('#tv-date').dispatchEvent('change');await loaded();
 assert.ok((await page.locator('.match').allTextContents()).some(t=>t.includes('Boston')));
 await page.locator('#my-teams-settings summary').click();while(await page.locator('[data-remove-team]').count()){await page.locator('[data-remove-team]').first().click();await loaded();}
 assert.ok(await page.getByRole('heading',{name:'Διάλεξε τις ομάδες σου',exact:true}).isVisible());
 await page.reload();await loaded();await tab('Αγώνες').click();await loaded();assert.equal(await page.locator('#all-matches-mode').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);assert.deepEqual(apiCalls,[]);console.log('Mobile/desktop UI, persistence, club/section selection, NBA, week navigation, empty state and private-backend isolation passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
