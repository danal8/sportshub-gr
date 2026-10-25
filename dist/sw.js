const CACHE='sportshub-shell-v63';
const ASSETS=['./volley-scores.js','./volley-scores.js?v=63','./gbl-scores.js','./gbl-scores.js?v=63','./tv-guide.js','./daily-schedule.js','./preference-storage.js','./fixture-favorites.js','./fixture-favorites.js?v=63','./result-reconciliation.js','./result-reconciliation.js?v=63','./event-timeline.js','./event-timeline.js?v=63','./football-events.js','./football-events.js?v=63','./','./index.html','./styles.css','./styles.css?v=55','./app.js','./app.js?v=63','./tv.js','./tv-meta.js','./icons.js','./schedule.js','./gestures.js','./core.js','./feeds.js','./providers.js','./direct.js','./data.js','./badges.js','./team-aliases.js','./results.js','./nba.js','./scoreboard.js','./competition-order.js','./football-leagues.js','./team-view.js','./tv-details.js','./my-teams.js','./team-display.js','./live-scores.js','./detail-data.js','./detail-data.js?v=63','./highlights.js','./highlights.js?v=63','./detail-panels.js','./detail-panels.js?v=63','./badges/catalog.json','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
ASSETS.push(...ASSETS.filter(a=>a.endsWith('.js')).map(a=>a+'?v=63'));
ASSETS.splice(0,ASSETS.length,...new Set(ASSETS));
const ASSET_URLS=new Set(ASSETS);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sportshub-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;const relative=u.pathname.slice(new URL(self.registration.scope).pathname.length);if(/^badges\/[a-f0-9]{24}\.(png|jpg|svg|webp|gif)$/.test(relative)){event.respondWith(caches.match(event.request).then(old=>old||fetch(event.request).then(async r=>{if(r.ok){const cache=await caches.open(CACHE);await cache.put(event.request,r.clone());}return r;})));return;}
 if(relative&& !ASSETS.some(a=>a.split('?')[0]==='./'+relative))return;
 // Versioned shell assets are immutable for this release. Data and HTML still refresh.
 if(u.searchParams.has('v')&&ASSET_URLS.has('./'+relative+u.search)){event.respondWith(caches.match(event.request).then(old=>old||fetch(event.request)));return;}
 // No authentication responses, API results, or external pages enter the shell cache.
 event.respondWith(fetch(event.request).then(async r=>{if(r.ok&&r.type!=='opaqueredirect'&&!r.redirected){const type=r.headers.get('content-type')||'';if(event.request.mode!=='navigate'||type.includes('text/html')){const cache=await caches.open(CACHE);await cache.put(event.request,r.clone());}}return r;}).catch(async()=>await caches.match(event.request)|| (event.request.mode==='navigate'?await caches.match('./index.html'):Response.error())));
});


