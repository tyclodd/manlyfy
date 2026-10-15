const VERSION='manlyfy-1.0.0';
const SHELL=['./','index.html','styles.css','src/app.js','src/core.js','src/designs.js','src/tracker.js','src/face-worker.js','assets/icons/icon.svg','assets/crew.svg','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('manlyfy-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location.href).pathname))return;
// Never cache user media: it only exists in memory as blobs, never HTTP requests.
if(url.pathname.includes('/qa/')||url.pathname.includes('/tests/'))return;
event.respondWith((async()=>{const cache=await caches.open(VERSION);if(event.request.mode==='navigate'){try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch{return await cache.match(event.request)||await cache.match('./');}}
const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok&&response.type!=='opaque')await cache.put(event.request,response.clone());return response;})());});
