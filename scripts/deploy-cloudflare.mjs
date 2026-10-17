import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
const kind=process.argv[2];if(!['app','site'].includes(kind))throw Error('Expected app or site');
const missing=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID'].filter(name=>!process.env[name]);
if(missing.length){for(const name of missing)console.log('::notice::deploy skipped — add secret '+name);process.exit(0);}
const preview=process.env.GITHUB_EVENT_NAME==='pull_request';
if(!preview){const gate=spawnSync('npm',['run','check:release'],{stdio:'inherit',env:process.env});if(gate.status!==0)process.exit(gate.status||1);}
const args=['--no-install','wrangler',...(preview?['versions','upload','--preview-alias','pr-'+process.env.PR_NUMBER]:['deploy']),'--config',`hosting/wrangler-${kind}.jsonc`];
const result=spawnSync('npx',args,{encoding:'utf8',env:process.env});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.status!==0)process.exit(result.status||1);
const urls=(result.stdout||'').match(/https:\/\/[\w.-]+\.workers\.dev/g)||[];
if(process.env.GITHUB_OUTPUT&&urls.length)appendFileSync(process.env.GITHUB_OUTPUT,`url=${urls.at(-1)}\n`);
