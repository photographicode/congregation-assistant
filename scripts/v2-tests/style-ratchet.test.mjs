import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
test('CSS gate rejects a new finding in changed CSS',async()=>{
 const file='packages/ui/ratchet-probe-'+randomUUID()+'.css';
 try{await writeFile(file,'.probe{color:#123456}\n',{flag:'wx'});const result=spawnSync(process.execPath,['scripts/check-style-ratchet.mjs'],{encoding:'utf8'});assert.equal(result.status,1,result.stderr);assert(result.stdout.includes(file));assert(result.stdout.includes('changed CSS must have zero findings'));assert(result.stdout.includes('new Stylelint finding'));}finally{await rm(file,{force:true});}
});
