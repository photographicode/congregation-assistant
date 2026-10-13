import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const parity=await readFile('docs/PARITY.md','utf8');
if(parity.includes('- [ ]')){console.error('Release blocked: native parity has unchecked capabilities. See docs/PARITY.md.');process.exit(1);}
const result=spawnSync(process.execPath,['scripts/check-no-legacy.mjs'],{stdio:'inherit'});if(result.status)process.exit(result.status);
if(JSON.parse(await readFile('capabilities.json','utf8')).flags.V2_DEFAULT!==true){console.error('Release blocked: V2_DEFAULT is off.');process.exit(1);}
console.log('Source cutover release gates passed. Browser, database, physical-device and production verification remain separate required gates.');
