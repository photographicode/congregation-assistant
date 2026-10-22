import {qualityFingerprint} from './quality-fingerprint.mjs';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {existsSync,createReadStream} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(process.env.CA_TEST_DIST||'dist');
const server=createServer((request,response)=>{const url=new URL(request.url||'/','http://localhost'),candidate=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname)),file=candidate.startsWith(root+path.sep)&&existsSync(candidate)?candidate:path.join(root,'index.html');response.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');createReadStream(file).pipe(response);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}:{}),findings=[];
const style=element=>{const value=getComputedStyle(element);return {cursor:value.cursor,background:value.backgroundColor,border:value.borderColor,shadow:value.boxShadow,transform:value.transform,outline:value.outlineStyle,outlineWidth:value.outlineWidth,transition:value.transitionDuration,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height};};
try{
 for(const width of [390,1024])for(const screen of ['home','people','reports','schedule','settings']){
  const context=await browser.newContext({viewport:{width,height:844}});await context.addInitScript(()=>localStorage.setItem('ca-v2-appearance',JSON.stringify({theme:'aurora',style:'balanced',experienceChosen:true})));await context.route('**/*.supabase.co/**',route=>route.abort());const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/?demo=admin&screen=${screen}`);await page.locator('main').waitFor();
  const controls=page.locator('button:not(:disabled),a[href],[role=button]:not([aria-disabled=true]),.tab,.switch,.assignment-option');
  const total=await controls.count();for(let index=0;index<total;index++){const item=controls.nth(index);if(!await item.isVisible())continue;const label=(await item.getAttribute('aria-label'))||(await item.innerText()).trim().slice(0,80)||`${await item.evaluate(el=>el.tagName)} ${index}`;await item.scrollIntoViewIfNeeded();const base=await item.evaluate(style);await item.hover();const hover=await item.evaluate(style);await item.focus();const focus=await item.evaluate(style);const box=await item.boundingBox();if(!box)continue;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();const active=await item.evaluate(style);await page.mouse.move(0,0);await page.mouse.up();
   const changed=(a,b)=>['background','border','shadow','transform'].some(key=>a[key]!==b[key]);
   if(base.cursor!=='pointer')findings.push({severity:'HARD',screen,width,label,rule:'cursor'});
   if(!changed(base,hover))findings.push({severity:'HARD',screen,width,label,rule:'hover'});
   if(!changed(hover,active))findings.push({severity:'SOFT',screen,width,label,rule:'active'});
   if(focus.outline==='none'||parseFloat(focus.outlineWidth)<2)findings.push({severity:'HARD',screen,width,label,rule:'focus'});
   if(base.width<44||base.height<44)findings.push({severity:'HARD',screen,width,label,rule:'target',size:[base.width,base.height]});
   if(!base.transition.split(',').some(value=>parseFloat(value)>0))findings.push({severity:'SOFT',screen,width,label,rule:'transition'});
  }
  await context.close();
 }
}finally{await browser.close();server.close();}
const summary={fingerprint:await qualityFingerprint(),views:10,controlsChecked:'all visible operational controls',hard:findings.filter(f=>f.severity==='HARD').length,soft:findings.filter(f=>f.severity==='SOFT').length,findings};await writeFile('docs/qa/interaction-audit.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({views:summary.views,hard:summary.hard,soft:summary.soft}));assert.equal(summary.hard,0,'Interaction HARD findings remain');
