import {cp,mkdir,rm,symlink,readFile,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';
const root=process.cwd(),scratch=path.join(root,'work/standalone-proof');await rm(scratch,{recursive:true,force:true});await mkdir(scratch,{recursive:true});
for(const dir of ['apps','packages','assets'])await cp(path.join(root,dir),path.join(scratch,dir),{recursive:true});
for(const file of ['package.json','package-lock.json','public-config.json','capabilities.json'])await cp(path.join(root,file),path.join(scratch,file));
await mkdir(path.join(scratch,'scripts'),{recursive:true});await cp('scripts/build-v2.mjs',path.join(scratch,'scripts/build-v2.mjs'));await symlink(path.join(root,'node_modules'),path.join(scratch,'node_modules'),'dir');
const result=spawnSync(process.execPath,['scripts/build-v2.mjs'],{cwd:scratch,env:{...process.env,BASE_URL:'/'},encoding:'utf8'});
await writeFile('work/standalone-build.log',result.stdout+result.stderr);if(result.status){console.error(result.stdout+result.stderr);process.exit(result.status||1);}
console.log('V2 app/site build passed in a checkout containing no V1 root entry, scripts, v2 build, archive, staging, public-site-preview or experiments. This proves build independence, not complete capability parity.');
