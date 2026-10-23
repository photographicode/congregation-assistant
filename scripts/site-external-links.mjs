import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
const config=JSON.parse(await readFile('public-config.json','utf8')),origin=new URL(config.PUBLIC_SITE_URL).origin,urls=new Set();
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(file.endsWith('.html')){const {document}=parseHTML(await readFile(file,'utf8'));for(const el of document.querySelectorAll('[href],[src]'))for(const attr of ['href','src']){const raw=el.getAttribute(attr);if(!/^https?:\/\//.test(raw||''))continue;const url=new URL(raw);if(url.origin!==origin){url.hash='';urls.add(url.href);}}}}}
await walk('dist/site');const results=[];
for(const url of [...urls].sort()){try{const response=await fetch(url,{method:'HEAD',redirect:'follow',signal:AbortSignal.timeout(15000)});results.push({url,status:response.status,ok:response.ok});}catch{results.push({url,status:null,ok:false});}}
await mkdir('work/quality',{recursive:true});await writeFile('work/quality/site-external-links.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');console.log(JSON.stringify({links:results.length,failures:results.filter(row=>!row.ok).length}));if(results.some(row=>!row.ok))process.exitCode=1;
