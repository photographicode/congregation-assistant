import {readFile, readdir, stat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseHTML} from 'linkedom';
const root=path.resolve(process.env.SITE_AUDIT_ROOT||'dist/site');
const failures=[], pages=[], titles=new Set(), descriptions=new Set();
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(dir===root&&entry.name==='app')continue;await walk(file);}else if(file.endsWith('.html'))pages.push(file);}}
await walk(root);
const config=JSON.parse(await readFile('public-config.json','utf8'));
const base=new URL((process.env.SITE_AUDIT_URL||config.PUBLIC_SITE_URL).replace(/\/$/,'')+'/');
const locales=['en','hi','ta','ml','kn','te','or','as','mr','gu','bn','pa','ur'];
function check(ok,file,rule){if(!ok)failures.push({page:path.relative(root,file),rule});}
for(const file of pages){
 const html=await readFile(file,'utf8'), {document}=parseHTML(html), rel=path.relative(root,file), current=new URL(rel.replace(/index\.html$/,''),base);
 const title=document.querySelector('title')?.textContent||'', description=document.querySelector('meta[name="description"]')?.getAttribute('content')||'';
 // 404.html is the identical Pages fallback, not a separately indexed page.
 if(!['404.html','offline.html','maintenance.html'].includes(rel)){check(!titles.has(title),file,'unique title');titles.add(title);check(!descriptions.has(description),file,'unique description');descriptions.add(description);}
 check(title.length>0&&title.length<=60,file,'title length <=60');check(description.length>=70&&description.length<=160,file,'description length 70–160');
 check(document.querySelectorAll('h1').length===1,file,'one h1');
 for(const selector of ['meta[name="viewport"]','meta[name="theme-color"]','link[rel="canonical"]','meta[property="og:image"]','meta[name="twitter:card"]'])check(document.querySelector(selector),file,selector);
 for(const locale of locales)check(document.querySelector(`link[hreflang="${locale}"]`),file,'hreflang '+locale);
 check(html.includes('© '+new Date().getFullYear()),file,'current copyright');
 check(!/<select id="site-theme"|language-toggle|gmail\.com|href="\.\.\/http|\blorem\b|\bTODO\b|example\.com|\{\{[^}]+\}\}|your-[a-z]|coming soon/i.test(html),file,'no legacy/placeholder text');
 for(const button of document.querySelectorAll('button'))check(button.hasAttribute('type'),file,'explicit button type');
 for(const node of document.querySelectorAll('[href],[src]'))for(const attr of ['href','src']){
  const raw=node.getAttribute(attr);if(!raw)continue;check(raw!=='#',file,'nonempty action');if(/^(?:mailto:|tel:|data:)/.test(raw))continue;
  const url=new URL(raw,current);if(url.origin!==base.origin)continue;
  if(!url.pathname.startsWith(base.pathname)) {check(false,file,'link escapes Pages base: '+raw);continue;}
  const local=path.resolve(root,decodeURIComponent(url.pathname.slice(base.pathname.length)));
  if(!local.startsWith(root+path.sep)&&local!==root){check(false,file,'unsafe path');continue;}
  try{const info=await stat(local),target=info.isDirectory()?path.join(local,'index.html'):local;await stat(target);if(url.hash&&target.endsWith('.html')){const {document:linked}=parseHTML(await readFile(target,'utf8'));check(linked.getElementById(decodeURIComponent(url.hash.slice(1))),file,'anchor '+raw);}}
  catch{check(false,file,'broken internal link '+raw);}
 }
 for(const image of document.querySelectorAll('img'))for(const attr of ['width','height','alt','decoding'])check(image.getAttribute(attr),file,'image '+attr);
}
for(const name of ['favicon.svg','favicon-32.png','apple-touch-icon.png','favicon.ico','og.webp']){try{await stat(path.join(root,name));}catch{failures.push({page:name,rule:'required asset'});}}
const report={checkedAt:new Date().toISOString(),pages:pages.length,failures};await mkdir('work/quality',{recursive:true});await writeFile('work/quality/site-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pages:pages.length,failures:failures.length,examples:failures.slice(0,12)},null,2));if(failures.length)process.exitCode=1;
