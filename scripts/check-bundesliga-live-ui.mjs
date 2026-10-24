import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('docs'),raw=JSON.parse(await readFile('tests/fixtures/bundesliga-20261024.json','utf8'));
const daily=JSON.parse(await readFile('docs/snapshots/daily-2026-27.json','utf8'));
daily.matches=daily.matches.filter(m=>m.competition==='bund'&&m.date==='2026-10-24').map(m=>({...m,score:null,scoreState:null}));
const server=createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/json');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-24T13:46:00Z')});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin){if(u.pathname==='/snapshots/daily-2026-27.json')return r.fulfill({json:daily});return r.continue();}if(u.pathname.includes('/soccer/ger.1/scoreboard'))return r.fulfill({json:raw});return r.abort();});
 await page.goto(origin);await page.locator('#refresh:not([disabled])').waitFor();await page.locator('#top-nav [data-tab="matches"]').click();await page.locator('#refresh:not([disabled])').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.compact-match.is-live').length===5);
 assert.equal(await page.locator('.compact-match').count(),6,'Six fixtures, with no duplicate ESPN cards');
 const check=async()=>{for(const name of ['RB Leipzig','1. FC Köln']){const card=page.locator('.compact-match').filter({hasText:name});assert.equal(await card.count(),1);assert.deepEqual(await card.locator('.team-score').allTextContents(),['0','0']);assert.match(await card.locator('.match-status').textContent(),/LIVE/);}};
 await check();await page.locator('#live-only').click();assert.equal(await page.locator('.compact-match').count(),5);await check();await page.locator('#live-only').click();assert.equal(await page.locator('.compact-match').count(),6);await check();
 assert.deepEqual(errors,[]);console.log('Bundesliga normal / LIVE / normal consistent',width);await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
