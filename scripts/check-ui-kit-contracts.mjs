import {build} from 'esbuild';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inspectLayout} from './layout-detector.ts';
const root=path.resolve('work/ui-kit-contracts');await mkdir(root,{recursive:true});
await build({entryPoints:['tests/v3/ui-kit-browser-fixture.tsx'],bundle:true,outfile:root+'/bundle.js',loader:{'.woff2':'file','.ttf':'file','.otf':'file'},assetNames:'assets/[name]-[hash]',logLevel:'silent'});
const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname;if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en" data-theme="paper"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script src="/bundle.js"></script></html>');return;}const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']});
const failures=[],errors=[],external=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:900},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))external.push(r.url());});
 await page.goto(origin);await page.getByRole('heading',{name:'Component contracts'}).waitFor();
 await page.getByRole('button',{name:'Icon action',exact:true}).click();assert.equal(await page.getByLabel('Action result').textContent(),'Icon worked');
 const toggle=page.getByRole('switch',{name:'Reminders'});await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'true');
 await page.getByRole('combobox',{name:'Fixture option'}).click();await page.getByRole('option',{name:'Second',exact:true}).click();assert((await page.getByRole('combobox',{name:'Fixture option'}).textContent()).includes('Second'));
 const increase=page.getByRole('button',{name:'Increase Hours'});await increase.click();assert.equal(await page.getByRole('spinbutton',{name:'Hours'}).inputValue(),'0.25');await page.getByRole('button',{name:'Decrease Hours'}).click();assert(await page.getByRole('button',{name:'Decrease Hours'}).isDisabled());
 await page.getByLabel('Week beginning').fill('2026-10-22');await page.getByLabel('Week beginning').blur();assert.equal(await page.getByLabel('Week beginning').inputValue(),'2026-10-19');
 const wizard=page.locator('[data-contract="wizard"]');await wizard.getByRole('button',{name:'Next',exact:true}).click();assert(await wizard.getByText('Reports step').isVisible());assert(await wizard.getByRole('button',{name:'Next',exact:true}).isDisabled());
 await page.getByRole('tab',{name:'First tab',exact:true}).focus();await page.keyboard.press('End');assert.equal(await page.getByRole('tab',{name:'Second tab'}).getAttribute('aria-selected'),'true');
 await page.getByRole('button',{name:'Publisher',exact:true}).click();assert((await page.getByRole('table',{name:'Fixture publishers'}).locator('tbody tr').first().textContent()).includes('Ana Example'));
 for(const name of ['dialog','sheet']){const opener=page.getByRole('button',{name:'Open '+name,exact:true});await opener.click();await page.getByRole('dialog',{name:'Fixture '+name}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(label=>document.activeElement?.getAttribute('aria-label')===label||document.activeElement?.textContent===label,'Open '+name);assert(await opener.evaluate(el=>el===document.activeElement));}
 await page.getByRole('button',{name:'Show toast',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.getByLabel('Action result').textContent(),'Undo worked');
 await page.getByRole('img',{name:'Report QR',exact:true}).waitFor();assert((await page.getByRole('img',{name:'Report QR'}).getAttribute('src')).startsWith('data:image/'));
 assert.equal(await page.getByRole('progressbar',{name:'Received'}).getAttribute('aria-valuenow'),'50');
 assert.equal(await page.getByLabel('Fixture name').getAttribute('aria-describedby')!==null,true);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));const findings=await page.evaluate(inspectLayout);failures.push(...findings.map(rule=>({width,rule})));}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
await writeFile('work/quality/ui-kit-contracts.json',JSON.stringify({errors,external,failures},null,2)+'\n');console.log(JSON.stringify({errors,externalRequests:external.length,failures},null,2));if(failures.length)process.exitCode=1;
