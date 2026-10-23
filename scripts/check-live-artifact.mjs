import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const expected=path.resolve(process.env.CA_EXPECTED_ROOT||'work/live-expected');
const root=path.resolve('work/live-published');
const base=new URL(process.env.CA_LIVE_URL||'https://photographicode.github.io/congregation-assistant/');
const files=[],failures=[],controls=new Set(['.nojekyll','_headers','_redirects','CNAME']);
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink(),'Unexpected symlink');const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else files.push(path.relative(expected,file));}}
await walk(expected);const deployment=JSON.parse(await readFile(path.join(expected,'deployment.json'),'utf8'));
assert.equal(deployment.sourceCommit,process.env.CA_EXPECTED_COMMIT,'Artifact source must match this release');
await mkdir(root,{recursive:true});let checked=0,index=0;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await Promise.all(Array.from({length:6},async()=>{while(index<files.length){const relative=files[index++];if(controls.has(relative))continue;try{const url=new URL(relative,base);url.searchParams.set('ca_audit',deployment.sourceCommit);const response=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'error',headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,'HTTP '+response.status);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(hash(bytes),hash(await readFile(path.join(expected,relative))),'Published bytes differ');const target=path.join(root,relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);checked++;}catch(error){failures.push({file:relative,error:error.message});}}}));
await mkdir('work/quality',{recursive:true});const report={sourceCommit:deployment.sourceCommit,base:base.href,checked,hostControlFiles:files.filter(file=>controls.has(file)),failures};await writeFile('work/quality/live-artifact.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sourceCommit:deployment.sourceCommit,checked,failures:failures.length,examples:failures.slice(0,10)}));assert.equal(failures.length,0,'Live artifact differs from the approved artifact');
