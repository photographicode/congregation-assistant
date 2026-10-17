import {build,createLogger} from 'vite';
import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
async function walk(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat().sort();}
const fingerprint=createHash('sha256');for(const file of ['package-lock.json','public-config.json','capabilities.json','apps/web/index.html','apps/web/vite.config.ts','scripts/build-v2.mjs','scripts/build-trust-pages.mjs','scripts/build-hosting.mjs',...await walk('hosting'),...await walk('apps/web/src'),...await walk('packages/ui'),...await walk('packages/core'),...await walk('packages/pdf'),...await walk('apps/site'),...await walk('assets')])fingerprint.update(file).update(await readFile(file));
for(const file of ['NotoSans-Latin-Regular.woff2','NotoSans-Latin-Bold.woff2'])await readFile('apps/site/assets/fonts/'+file);
const hash=fingerprint.digest('hex');process.env.VITE_BUILD_HASH=hash;
const base=process.env.BASE_URL||'/';if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw Error('BASE_URL must be an absolute directory path ending in /');
const logger=createLogger(),cssWarnings=[];const originalWarn=logger.warn;logger.warn=(message,options)=>{if(/css-syntax-error|esbuild css minify/.test(message))cssWarnings.push(message);originalWarn.call(logger,message,options);};
await build({configFile:path.resolve('apps/web/vite.config.ts'),customLogger:logger});
if(cssWarnings.length)throw Error('Invalid application CSS: '+cssWarnings.join('\n'));
await mkdir('dist/assets/fonts',{recursive:true});
for(const file of (await readdir('assets/fonts')).filter(name=>!/^Nimbus|^NIMBUS/.test(name)).filter(name=>/\.(?:ttf|otf|woff2|txt|zip)$/.test(name)))await cp('assets/fonts/'+file,'dist/assets/fonts/'+file);
await cp('assets/pdf-templates','dist/assets/pdf-templates',{recursive:true});
for(const file of ['icon-192.png','icon-512.png'])await cp('assets/'+file,'dist/assets/'+file);
await cp('apps/site','dist/site',{recursive:true,filter:src=>!(/\.(ts|tsx)$/.test(src)||src.endsWith('README.md'))});
await cp('data','dist/data',{recursive:true});await cp('public-config.json','dist/public-config.json');await cp('capabilities.json','dist/capabilities.json');
await cp('public-config.json','dist/site/public-config.json');await cp('capabilities.json','dist/site/capabilities.json');
await writeFile('dist/site/tokens.css',(await readFile('packages/ui/tokens.css','utf8')).replaceAll('../../assets/','assets/').replaceAll('NotoSans-Regular.woff2','NotoSans-Latin-Regular.woff2').replaceAll('NotoSans-Bold.woff2','NotoSans-Latin-Bold.woff2'));
await cp('dist/assets/fonts','dist/site/assets/fonts',{recursive:true});
for(const file of ['themes.css','fonts.css','theme-bridge.css'])await writeFile('dist/site/'+file,(await readFile('packages/ui/'+file,'utf8')).replaceAll('../../assets/','assets/').replaceAll('NotoSans-Regular.woff2','NotoSans-Latin-Regular.woff2').replaceAll('NotoSans-Bold.woff2','NotoSans-Latin-Bold.woff2').replaceAll('newsreader-latin-variable.woff2','newsreader-latin-600.woff2').replaceAll('font-weight:200 800','font-weight:600')); 

await build({configFile:path.resolve('apps/site/vite.config.ts')});
await mkdir('dist/.well-known',{recursive:true});await writeFile('dist/.well-known/build-hash.txt',hash+'\n');
const entryManifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));const shellKeys=new Set();function shellVisit(key){if(shellKeys.has(key))return;shellKeys.add(key);for(const key2 of entryManifest[key]?.imports||[])shellVisit(key2);}for(const [key,item] of Object.entries(entryManifest))if(item.isEntry||['Workspace','OwnerConsole','PublicForm'].includes(item.name))shellVisit(key);const staticAssets=[...shellKeys].flatMap(key=>[entryManifest[key].file,...(entryManifest[key].css||[]),...(entryManifest[key].assets||[])]).map(file=>base+file);
await writeFile('dist/service-worker.js',`const CACHE='ca-v2-${hash.slice(0,16)}';const BASE=${JSON.stringify(base)};const SHELL=[BASE,...${JSON.stringify(staticAssets.filter(f=>!f.includes('crypto')&&!f.includes('fontkit')&&!/NotoSans(?:Devanagari|Bengali|Gurmukhi|Gujarati|Tamil|Telugu|Kannada|Malayalam)/.test(f)))}];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin)return;if(url.pathname.includes('/rest/')||url.pathname.includes('/auth/'))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(BASE)));return;}if(url.search||url.hash)return;if(!SHELL.includes(url.pathname)&&!url.pathname.startsWith(BASE+'assets/'))return;event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}));});
`);
const index=await readFile('dist/index.html','utf8');
await writeFile('dist/404.html',index);
await mkdir('dist/v2',{recursive:true});
await writeFile('dist/redirect.js',`const suffix=location.pathname.split('/v2/')[1]||'';location.replace(${JSON.stringify(base)}+suffix+location.search+location.hash);`);
await writeFile('dist/v2/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening Congregation Assistant</title><script src="${base}redirect.js" defer></script><a href="${base}">Open Congregation Assistant</a></html>`);
await writeFile('dist/_redirects',`/v2/* /:splat 301\n/* /index.html 200\n`);
await writeFile('dist/manifest.webmanifest',JSON.stringify({id:base,name:'Congregation Assistant',short_name:'Congregation',start_url:base,scope:base,display:'standalone',display_override:['standalone','minimal-ui'],lang:'en',categories:['productivity','utilities'],background_color:'#F6F2EA',theme_color:'#3E58A8',icons:[{src:base+'assets/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:base+'assets/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]},null,2));
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));const initialKeys=new Set();function visit(key){if(initialKeys.has(key))return;initialKeys.add(key);for(const imported of manifest[key]?.imports||[])visit(imported);}for(const [key,item] of Object.entries(manifest))if(item.isEntry)visit(key);
let total=0;for(const key of initialKeys){const file=manifest[key].file;if(file.endsWith('.js'))total+=gzipSync(await readFile('dist/'+file)).length;}
if(total>250*1024)throw Error('Initial application JS exceeds 250 KiB gzip: '+total);
await writeFile('dist/build-report.json',JSON.stringify({hash,jsGzipBytes:total,limit:250*1024},null,2));
await rm('dist-site',{force:true,recursive:true});await cp('dist/site','dist-site',{recursive:true});await writeFile('dist-site/robots.txt','User-agent: *\nAllow: /\nSitemap: https://congregationassistant.com/sitemap.xml\n');
await writeFile('dist-site/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://congregationassistant.com/</loc></url><url><loc>https://congregationassistant.com/how-to-use.html</loc></url><url><loc>https://congregationassistant.com/android/</loc></url></urlset>');
const {transform}=await import('esbuild');for(const file of ['site.css','tour.css']){const css=await transform(await readFile('dist-site/'+file,'utf8'),{loader:'css',minify:true});await writeFile('dist-site/'+file,css.code);await writeFile('dist/site/'+file,css.code);}
let siteBytes=0;for(const file of ['index.html','site.css','site.js','tour.js','tour.css','tokens.css','themes.css','fonts.css','theme-bridge.css','assets/fonts/inter-latin-variable.woff2','assets/fonts/newsreader-latin-600.woff2','capabilities.json','public-config.json','assets/fonts/NotoSans-Latin-Regular.woff2','assets/fonts/NotoSans-Latin-Bold.woff2'])siteBytes+=gzipSync(await readFile('dist-site/'+file)).length;
if(siteBytes>200*1024)throw Error('Initial website payload exceeds 200 KiB gzip: '+siteBytes);
await writeFile('dist-site/build-report.json',JSON.stringify({hash,initialGzipBytes:siteBytes,limit:200*1024},null,2));
console.log('Initial website gzip payload',siteBytes,'bytes');
console.log('Standalone V2 build',hash.slice(0,12),'JS gzip bytes',total);

await rm('dist-site/downloads',{recursive:true,force:true});await rm('dist/site/downloads',{recursive:true,force:true});await import('./build-trust-pages.mjs');await import('./build-hosting.mjs');
