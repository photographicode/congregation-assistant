/* Exercise cached public fonts during an offline worker update; never contact a real service. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{const href='https://fixture.invalid/app/service-worker.js',handlers=new Map(),stores=new Map(),requests=[];let offline=false;
const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{if(!stores.has(key))stores.set(key,new Map());const data=stores.get(key);return {match:async key=>data.get(String(key))?.clone(),put:async(key,response)=>data.set(String(key),response.clone())};}};
const self={location:{href,origin:new URL(href).origin},registration:{scope:'https://fixture.invalid/app/'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>handlers.set(name,handler)};
const fetch=async url=>{requests.push(String(url));if(offline)throw Error('Offline');return new Response('FICTIONAL PUBLIC FONT',{status:200});};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),{self,caches,fetch,URL,console});
const run=async name=>{let pending;handlers.get(name)({waitUntil:p=>pending=p});await pending;};
await run('install');await run('activate');assert.equal(requests.length,3);assert(requests.every(x=>x.includes('/assets/')),'Only public assets may be warmed');
const current=[...stores.keys()][0];stores.set('ca-shell-test-previous',stores.get(current));stores.delete(current);offline=true;await run('install');await run('activate');assert(!stores.has('ca-shell-test-previous'));
for(const file of ['assets/fonts/NotoSans-Regular.ttf','assets/fonts/NotoSans-Bold.ttf','assets/vendor/fontkit-1.1.1.min.js']){let response;handlers.get('fetch')({request:new Request(new URL(file,href)),respondWith:p=>response=p});assert.equal(await (await response).text(),'FICTIONAL PUBLIC FONT');}
let intercepted=false;handlers.get('fetch')({request:new Request('https://fixture.invalid/app/rest/v1/publishers'),respondWith:()=>intercepted=true});assert(!intercepted,'Record APIs must not be intercepted or cached');console.log('PASS cached PDF fonts survive offline service-worker updates; private record APIs are not cached');})().catch(e=>{console.error(e);process.exitCode=1});
