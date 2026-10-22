import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
export async function qualityFingerprint(){
 const {stdout}=await run('git',['ls-files','--cached','--others','--exclude-standard','-z','--','package-lock.json','public-config.json','capabilities.json','apps/web/src','apps/web/index.html','apps/web/vite.config.ts','.github/workflows','packages/core','packages/ui','packages/pdf','scripts','assets/fonts','assets/pdf-templates'],{maxBuffer:8*1024*1024});
 const files=[...new Set(stdout.split('\0').filter(Boolean))].sort();
 const hash=createHash('sha256');for(const file of files){hash.update(file+'\0');hash.update(await readFile(file));hash.update('\0');}return hash.digest('hex');
}
