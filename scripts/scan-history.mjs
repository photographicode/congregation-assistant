import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
// TruffleHog JSON includes raw credentials. Persist counts only, never raw results.
const result=spawnSync(process.argv[2]||'work/security/trufflehog',['git','file://.','--only-verified','--fail','--json'],{encoding:'utf8',maxBuffer:50*1024*1024});
let verified=0,invalid=0;
for(const line of (result.stdout||'').split('\n').filter(Boolean)){try{const row=JSON.parse(line);if(row.Verified===true)verified++;}catch{invalid++;}}
const report={scanner:'trufflehog',exitCode:result.status,verified,invalidOutputLines:invalid,executionError:!!result.error};
await mkdir('work/security',{recursive:true});await writeFile('work/security/trufflehog-summary.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(result.status!==0||verified||invalid||result.error)process.exitCode=1;
