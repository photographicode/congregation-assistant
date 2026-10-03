/* Only public application files are cached. No API responses or congregation records. */
const CACHE='ca-shell-live-links-1';
const names=['index.html','app.css','app-support.js','pdf-tools.js','app-config.js','public-links.js','app-install.js','manifest.webmanifest'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ca-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const scope=new URL('./',self.location.href).pathname;const relative=url.pathname.slice(scope.length);
 if(!url.pathname.startsWith(scope)||(!names.includes(relative)&&relative!==''))return;
 const key=new URL(relative===''?'index.html':relative,self.location.href).href;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request,{cache:'no-cache'});if(response.ok)await cache.put(key,response.clone());return response;}catch(error){const cached=await cache.match(key);if(cached)return cached;throw error;}})());
});
