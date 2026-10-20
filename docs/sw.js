const CACHE='sportshub-shell-v12';
const ASSETS=['./','./index.html','./styles.css','./styles.css?v=12','./app.js','./app.js?v=12','./tv.js','./tv-meta.js','./icons.js','./schedule.js','./gestures.js','./core.js','./feeds.js','./providers.js','./direct.js','./data.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sportshub-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;const relative=u.pathname.slice(new URL(self.registration.scope).pathname.length);if(relative&& !ASSETS.some(a=>a.split('?')[0]==='./'+relative))return;
 // No authentication responses, API results, or external pages enter the shell cache.
 event.respondWith(fetch(event.request).then(async r=>{if(r.ok&&r.type!=='opaqueredirect'&&!r.redirected){const type=r.headers.get('content-type')||'';if(event.request.mode!=='navigate'||type.includes('text/html')){const cache=await caches.open(CACHE);await cache.put(event.request,r.clone());}}return r;}).catch(async()=>await caches.match(event.request)|| (event.request.mode==='navigate'?await caches.match('./index.html'):Response.error())));
});
