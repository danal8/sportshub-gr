import{chromium}from'playwright';import{createServer}from'node:http';import{readFile,mkdir}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const root=path.resolve('docs'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'},apiCalls=[];
const server=createServer(async(req,res)=>{if(req.url.startsWith('/api/'))apiCalls.push(req.url);try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('outside');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
try{
 // Browser-side requests prove CORS, rather than merely testing Node access.
 const sourcePage=await browser.newPage();sourcePage.on('requestfailed',r=>console.log('CORS REQUEST FAILURE',r.url(),r.failure()?.errorText));sourcePage.on('console',m=>{if(m.type()==='error')console.log('BROWSER SOURCE ERROR',m.text());});await sourcePage.route('https://danal8.github.io/sportshub-gr/live-source-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>SportsHub source check</title>'}));await sourcePage.goto('https://danal8.github.io/sportshub-gr/live-source-check');
 const cors=await sourcePage.evaluate(async()=>{
 const urls=[
 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/gre.1/scoreboard?region=us&lang=en&contentorigin=espn&dates=20261018',
 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard?region=us&lang=en&contentorigin=espn&dates=20261022',
 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?region=us&lang=en&contentorigin=espn&dates=20261021',
 'https://live.euroleague.net/api/Header?gamecode=1&seasoncode=E2026'
 ];
 return Promise.all(urls.map(async url=>{try{const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});const p=await r.json();return{url,status:r.status,valid:!!(p.events||p.CompetitionReducedName),season:p.leagues?.[0]?.season?.year||p.CompetitionReducedName?.trim()};}catch(e){return{url,error:e.message};}}));
 });
 console.log('REAL BROWSER CORS',JSON.stringify(cors));assert.ok(cors.every(p=>p.status===200&&p.valid&&p.season===(p.url.includes('/nba/')?2027:p.url.includes('euroleague')?'E2026':2026)),JSON.stringify(cors));await sourcePage.close();
 const payload=JSON.parse(await readFile('docs/snapshots/europa-2026-27.json','utf8')),fixture=payload.matches.find(m=>m.date==='2026-10-22');assert.ok(fixture,'Published Europa fixture on test date');
 const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 await page.clock.install({time:new Date('2026-10-22T18:00:00Z')});
 let step=0,fail=false,scoreCalls=0;
 await context.route('**/*',async route=>{
 const url=route.request().url();if(url.startsWith(origin)){if(new URL(url).pathname==='/snapshots/europa-2026-27.json')return route.fulfill({json:{...payload,matches:payload.matches.map(m=>m.date==='2026-10-22'?{...m,score:null,scoreState:null,scoreCheckedAt:null,eventIDs:{},homeIDs:{},awayIDs:{}}:m)}});return route.continue();}
 if(url.startsWith('https://site.api.espn.com/apis/site/v2/sports/')||url.startsWith('https://site.web.api.espn.com/apis/site/v2/sports/')){
  if(fail)return route.abort();const target=url.includes('/soccer/uefa.europa/scoreboard')&&url.includes('dates=20261022');if(target)scoreCalls++;
  return route.fulfill({json:{leagues:[{season:{year:url.includes('/basketball/nba/')?2027:2026}}],events:target?[{id:'ui-live',date:'2026-10-22T16:45:00Z',status:{displayClock:step?"68'":"67'",period:2,type:{state:'in',completed:false,name:'STATUS_IN_PROGRESS'}},competitions:[{competitors:[{homeAway:'home',team:{displayName:fixture.home},score:step?'2':'1'},{homeAway:'away',team:{displayName:fixture.away},score:'0'}]}]}]:[]}});
 }
 return route.abort();
 });
 page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);const loaded=()=>page.locator('#refresh:not([disabled])').waitFor();
 await loaded();await page.locator('#top-nav').getByRole('button',{name:'Ποδόσφαιρο',exact:true}).click();await loaded();await page.locator('#competition').selectOption('europa');await loaded();
 await page.getByText('● LIVE · 67′',{exact:true}).waitFor();const card=page.locator('.match').filter({has:page.getByText('● LIVE · 67′',{exact:true})});assert.deepEqual(await card.locator('.team-score').allTextContents(),['1','0']);
 const before=await page.locator('#round').inputValue();const font=await card.locator('.fixture-title').evaluate(e=>({size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight}));assert.deepEqual(font,{size:'16px',weight:'600'});
 await mkdir('test-artifacts',{recursive:true});await page.screenshot({path:'test-artifacts/live-desktop.png',fullPage:true});
 step=1;await page.clock.fastForward(30000);await page.getByText('● LIVE · 68′',{exact:true}).waitFor();assert.ok(scoreCalls>=2);assert.deepEqual(await page.locator('.match').filter({has:page.getByText('● LIVE · 68′',{exact:true})}).locator('.team-score').allTextContents(),['2','0']);assert.equal(await page.locator('#round').inputValue(),before);
 await page.locator('#live-only').click();assert.equal(await page.locator('#live-only').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.match').count(),1);
 const aligned=await page.locator('.match').first().evaluate(el=>{const rows=[...el.querySelectorAll('.fixture-team-row')].map(e=>e.getBoundingClientRect()),scores=[...el.querySelectorAll('.team-score')].map(e=>e.getBoundingClientRect());return rows[0].bottom<=rows[1].top&&Math.abs(scores[0].right-scores[1].right)<2;});assert.ok(aligned,'Team rows stack and their scores align');
 assert.equal(await page.locator('.intro #live-only').count(),0);assert.equal(await page.locator('.filters #live-only').count(),1);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await page.screenshot({path:'test-artifacts/live-mobile.png',fullPage:true});await page.locator('#live-only').click();
 await page.setViewportSize({width:320,height:720});await page.locator('#top-nav [data-tab="matches"]').click();await loaded();assert.equal(await page.locator('#tv-day #live-only').count(),1);assert.ok(await page.locator('#live-only').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));await page.locator('#top-nav [data-tab="football"]').click();await loaded();await page.locator('#competition').selectOption('europa');await loaded();
 fail=true;await page.clock.fastForward(120000);await page.getByText('Σκορ πηγής',{exact:true}).first().waitFor();assert.equal(await page.getByText('● LIVE · 68′',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(apiCalls,[]);console.log('Live score/clock 30-second updates, failure expiry, unchanged round, softer desktop fonts, mobile overflow and private-backend isolation passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
