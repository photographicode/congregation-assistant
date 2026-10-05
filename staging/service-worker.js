/* Only public application files are cached. No API responses or congregation records. */
const CACHE='ca-shell-public-privacy-6';
const names=['index.html','app.css','app-support.js','pdf-tools.js','app-config.js','public-links.js','app-install.js','app-reminders.js','app-guide.js','manifest.webmanifest'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ca-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const scope=new URL('./',self.location.href).pathname;const relative=url.pathname.slice(scope.length);
 if(!url.pathname.startsWith(scope)||(!names.includes(relative)&&relative!==''))return;
 const key=new URL(relative===''?'index.html':relative,self.location.href).href;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request,{cache:'no-cache'});if(response.ok)await cache.put(key,response.clone());return response;}catch(error){const cached=await cache.match(key);if(cached)return cached;throw error;}})());
});
self.addEventListener('push',event=>{
 let notice;try{notice=event.data?.json()||{};}catch{notice={body:event.data?.text()||''};}
 event.waitUntil(self.registration.showNotification(String(notice.title||'Congregation Assistant'),{body:String(notice.body||notice.message||'A new update is available.'),icon:'assets/icon-192.png',tag:notice.tag||'ca-system-notice',data:{url:new URL('./',self.registration.scope).href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const url=new URL('./',self.registration.scope).href;const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});const tab=tabs.find(c=>c.url.startsWith(self.registration.scope));if(tab)return tab.focus();return self.clients.openWindow(url);})());
});
