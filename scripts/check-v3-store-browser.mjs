import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['tests/v3/store-browser-fixture.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const server=createServer((request,response)=>{if(request.url==='/fixture.js'){response.setHeader('Content-Type','application/javascript');response.end(bundle.outputFiles[0].text);}else response.end('<!doctype html><html lang="en"><title>Synthetic Store acceptance</title><pre id="result"></pre><script type="module" src="/fixture.js"></script></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('result').textContent.length>0);const result=JSON.parse(await page.locator('#result').textContent());assert.deepEqual(errors,[]);assert.deepEqual(result,{offlineReload:true,parallelSyncOnce:true,abandonedLeaseRecovered:true,synced:true,conflict:true,reviewed:true});writeFileSync('docs/qa/v3-store-browser.json',JSON.stringify({syntheticDataOnly:true,realIndexedDB:true,webLocks:true,...result,browserErrors:errors},null,2)+'\n');console.log(JSON.stringify(result));}finally{await browser.close();server.close();}
