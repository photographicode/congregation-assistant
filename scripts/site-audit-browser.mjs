import http from 'node:http';
import {existsSync} from 'node:fs';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(process.env.SITE_AUDIT_ROOT||'dist/site'),config=JSON.parse(await readFile('public-config.json','utf8')),canonical=new URL(process.env.SITE_AUDIT_URL||config.PUBLIC_SITE_URL);
const base=canonical.pathname.replace(/\/$/,'')+'/', failures=[], widths=[320,390,768,1440];
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.json':'application/json','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{try{let name=new URL(req.url,'http://localhost').pathname;if(!name.startsWith(base)){res.writeHead(404).end();return;}let file=path.resolve(root,name.slice(base.length)||'index.html');if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');await stat(file);}catch{res.statusCode=404;file=path.join(root,'404.html');}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(500).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox']});let views=0;
try{
 const sitemap=await readFile(path.join(root,'sitemap.xml'),'utf8');const routes=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);routes.push(base+'404/');
 const page=await browser.newPage();await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===canonical.origin)return route.continue({url:origin+url.pathname+url.search});return route.continue();});
 for(const route of routes)for(const width of widths)for(const scale of [1,2]){
  await page.setViewportSize({width,height:900});await page.goto(origin+route);await page.evaluate(async scale=>{document.documentElement.style.fontSize=16*scale+'px';await document.fonts.ready;},scale);
  const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,wide:[...document.querySelectorAll('body *')].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.position!=='absolute'&&s.position!=='fixed'&&s.visibility!=='hidden'&&r.width>innerWidth+1;}).slice(0,5).map(el=>el.tagName+'.'+el.className)}));views++;
  if(result.scroll!==result.client||result.wide.length)failures.push({route,width,scale,...result});
 }
 await page.setViewportSize({width:390,height:844});await page.goto(origin+base);const menu=page.locator('.mobile-menu-toggle');await menu.click();if(await menu.getAttribute('aria-expanded')!=='true')failures.push({rule:'menu opens'});await page.keyboard.press('Escape');if(await menu.getAttribute('aria-expanded')!=='false'||!await menu.evaluate(el=>el===document.activeElement))failures.push({rule:'menu Escape/focus'});
 const missing=await page.goto(origin+base+'missing-launch-page');if(missing.status()!==404)failures.push({rule:'unknown path HTTP404'});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
await mkdir('work/quality',{recursive:true});await writeFile('work/quality/site-browser.json',JSON.stringify({checkedAt:new Date().toISOString(),views,failures},null,2)+'\n');console.log(JSON.stringify({views,failures:failures.length,examples:failures.slice(0,15)},null,2));if(failures.length)process.exitCode=1;
