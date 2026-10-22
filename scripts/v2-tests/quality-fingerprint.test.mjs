import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const moduleUrl=new URL('../quality-fingerprint.mjs',import.meta.url).href;
test('quality proof fingerprints change with source and policy but ignore generated caches',async()=>{
 const cwd=await mkdtemp(path.join(tmpdir(),'ca-quality-'));
 const fingerprint=()=>execFileSync(process.execPath,['--input-type=module','-e',`const {qualityFingerprint}=await import(${JSON.stringify(moduleUrl)});console.log(await qualityFingerprint());`],{cwd,encoding:'utf8'}).trim();
 try{
  execFileSync('git',['init','--quiet'],{cwd});
  await mkdir(path.join(cwd,'packages/core'),{recursive:true});
  await mkdir(path.join(cwd,'.github/workflows'),{recursive:true});
  await mkdir(path.join(cwd,'scripts/__pycache__'),{recursive:true});
  await writeFile(path.join(cwd,'.gitignore'),'__pycache__/\n');
  await writeFile(path.join(cwd,'packages/core/example.ts'),'export const value=1;');
  const original=fingerprint();assert.equal(fingerprint(),original);
  await writeFile(path.join(cwd,'scripts/__pycache__/test.pyc'),'cache');assert.equal(fingerprint(),original);
  await writeFile(path.join(cwd,'packages/core/example.ts'),'export const value=2;');const changed=fingerprint();assert.notEqual(changed,original);
  await writeFile(path.join(cwd,'.github/workflows/ci.yml'),'permissions: contents: read');assert.notEqual(fingerprint(),changed);
 }finally{await rm(cwd,{recursive:true,force:true});}
});
