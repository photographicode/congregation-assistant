/* Delayed visual inspection captures, fictional public demos only. */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/visual-review');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
const results=[];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{for(const profile of [{name:'desktop',width:1440,height:1000},{name:'phone',width:390,height:844},{name:'large-phone',width:320,height:900,large:true}])for(const role of ['publisher','admin']){
 const c=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.width<600,hasTouch:profile.width<600,serviceWorkers:'block'});let apiCalls=0;const errors=[];
 await c.route('**/*.supabase.co/**',r=>{apiCalls++;return r.abort();});await c.route('**/npm/@supabase/supabase-js@2',r=>r.fulfill({contentType:'application/javascript',body:'/* fictional demo; no backend */'}));await c.route('**/pdf-lib.min.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(require.resolve('pdf-lib/dist/pdf-lib.min.js'),'utf8')}));await c.route('**/fonts.googleapis.com/**',r=>r.fulfill({body:''}));await c.addInitScript(()=>{window.__CA_DEMO_CAPTURE=true;});
 const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/?demo=${role}`);await page.locator('#demo-entry-form input[name=password]').fill('TryCA2026');await page.locator('#demo-entry-form button').click();await page.locator('#demo-session-banner').waitFor();if(role==='admin'){await page.locator('#demo-tour [data-skip]').click();await page.waitForFunction(()=>window.db.publishers.length===12);}else await page.getByRole('heading',{name:'My Home',exact:true}).waitFor();
 if(profile.large)await page.evaluate(()=>window.CAReadability.set(true));
 const tabs=role==='admin'?['dashboard','publishers','groups','analytics','attendance','oclm','av','attendant','cleaning']:['home','assignments','schedule','report','settings'];
 for(const tab of tabs){if(role==='admin')await page.evaluate(t=>window.ui.switchTab(t),tab);else if(tab==='settings')await page.locator('#personal-settings').click();else await page.locator(`[data-personal-view=${tab}]`).click();
  if(role==='publisher'&&tab==='report'&&await page.locator('#personal-report-correct').count())await page.locator('#personal-report-correct').click();
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo({top:0,behavior:'instant'});const main=document.querySelector('.main-content');if(main)main.scrollTop=0;});
  // Capture immediately and again after transitions/reminders have had time to settle.
  if(tab===tabs[0])await page.screenshot({path:path.join(out,`${profile.name}-${role}-${tab}-initial.png`)});
  await page.waitForTimeout(2500);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${profile.name}/${role}/${tab} overflows`);
  await page.screenshot({path:path.join(out,`${profile.name}-${role}-${tab}-viewport.png`)});await page.screenshot({path:path.join(out,`${profile.name}-${role}-${tab}-settled.png`),fullPage:true});results.push({profile:profile.name,role,tab,settleMs:2500});
 }
 assert.equal(apiCalls,0,'Visual review must not access production');assert.deepEqual(errors,[]);await c.close();console.log('PASS',profile.name,role,'delayed screenshots and no production calls');
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));server.close();});
