import{chromium}from'playwright';import{createServer}from'node:http';import{readFile}from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';
const root=path.resolve('docs'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const daily=JSON.parse(await readFile('docs/snapshots/daily-2026-27.json','utf8')),date=daily.retrievedAt.slice(0,10),expected=daily.matches.filter(m=>m.date===date).length;
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('outside');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),requests=[],errors=[];
 await page.clock.install({time:new Date(date+'T09:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async r=>{const url=r.request().url();if(url.startsWith(origin)){requests.push(new URL(url).pathname);return r.continue();}return r.abort();});
 await page.goto(origin);await page.locator('#refresh:not([disabled])').waitFor();
 const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});await session.send('Network.enable');await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:400*1024,uploadThroughput:200*1024});
 requests.length=0;const start=Date.now();await page.locator('#top-nav [data-tab="matches"]').click();await page.locator('#refresh:not([disabled])').waitFor();assert.equal(await page.locator('.compact-match').count(),expected);const elapsed=Date.now()-start;
 const scheduleRequests=requests.filter(p=>/^\/snapshots\/.*2026-27\.json$/.test(p)&&!p.includes('highlights'));assert.deepEqual(scheduleRequests,['/snapshots/daily-2026-27.json']);assert.ok(elapsed<5000,'Complete daily list within 5 seconds on 4x CPU / slow connection');
 await page.locator('#next-day').click();await page.locator('#refresh:not([disabled])').waitFor();assert.equal(await page.locator('.compact-match').count(),daily.matches.filter(m=>m.date===new Date(Date.parse(date)+86400000).toISOString().slice(0,10)).length);assert.equal(requests.filter(p=>p==='/snapshots/daily-2026-27.json').length,1,'Next day reuses the compact index');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log(JSON.stringify({width,matches:expected,elapsedMs:elapsed,scheduleRequests:scheduleRequests.length,feedBytes:Buffer.byteLength(JSON.stringify(daily))}));await context.close();
}}finally{await browser.close();await new Promise(r=>server.close(r));}
