import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
test('strict gate rejects a new diagnostic in an untracked changed source file',async()=>{
 const file='packages/core/ratchet-probe-'+randomUUID()+'.ts';
 try{
  await writeFile(file,'export const value: string = 1;\n',{flag:'wx'});
  const result=spawnSync(process.execPath,['scripts/check-types-ratchet.mjs'],{encoding:'utf8'});
  assert.equal(result.status,1,result.stderr);assert(result.stdout.includes(file));assert(result.stdout.includes('changed file must have zero diagnostics'));assert(result.stdout.includes('new diagnostic'));
 }finally{await rm(file,{force:true});}
});
