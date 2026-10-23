import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'work/pages'),failures=[];
const config=JSON.parse(await readFile('public-config.json','utf8'));
const publicKeys=new Set(Object.entries(config).filter(([key])=>/anon|publishable/i.test(key)).map(([,value])=>value));
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name),relative=path.relative(root,file);
 if(entry.isSymbolicLink()){failures.push({file:relative,rule:'symlink'});continue;}
 if(entry.isDirectory()){if(/^(?:docs|supabase|tests|node_modules)$/.test(entry.name)||entry.name.startsWith('.git'))failures.push({file:relative,rule:'private directory'});else await walk(file);continue;}
 if(/(?:\.map|\.sql|\.md|\.bak|\.zip)$/i.test(entry.name)||/^(?:\.env|\.git)/.test(entry.name))failures.push({file:relative,rule:'private extension'});
 if((await stat(file)).size>5*1024*1024)failures.push({file:relative,rule:'over 5MB'});
 if(!/\.(?:html|js|css|json|txt|xml|webmanifest)$/.test(file))continue;
 const source=await readFile(file,'utf8');
 if(/sb_secret_[A-Za-z0-9_-]{12,}|rzp_live_[A-Za-z0-9]{12,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source))failures.push({file:relative,rule:'credential pattern'});
 for(const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){if(publicKeys.has(match[0]))continue;failures.push({file:relative,rule:'non-public JWT'});}
 // Literal service_role is used in key-rejection code; fail credential values, not that protective check.
 if(/(?:service_role|serviceRoleKey)["']?\s*[:=]\s*["'][A-Za-z0-9_.-]{32,}/.test(source))failures.push({file:relative,rule:'service credential value'});
}}
await walk(root);console.log(JSON.stringify({root:path.basename(root),failures},null,2));if(failures.length)process.exitCode=1;
