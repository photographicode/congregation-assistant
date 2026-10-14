import {readFile,writeFile} from 'node:fs/promises';
if(process.env.GITHUB_ACTIONS!=='true'){console.log('Trust badges omitted: no verified CI run');process.exit(0);}
const read=async file=>{try{return JSON.parse(await readFile(file,'utf8'));}catch{return null;}};
const build=await read('dist/build-report.json'),layout=await read(process.env.CA_LAYOUT_REPORT||'work/cutover-browser/results.json'),pdf=await read('work/pdf-parity-report.json'),scan=await read('work/security/semgrep.json'),secrets=await read('work/security/gitleaks.json');
const metrics={verifiedAt:new Date().toISOString(),build:build?{commit:process.env.GITHUB_SHA,hash:build.hash}:undefined};
if(layout?.complete&&layout.failures.length===0)metrics.accessibility={passed:layout.results.length,total:layout.results.length};
if(pdf?.passed===pdf?.total&&pdf?.total>0)metrics.pdf={passed:pdf.passed,total:pdf.total};
if(scan&&Array.isArray(scan.results)&&scan.results.length===0&&Array.isArray(secrets)&&secrets.length===0)metrics.securityScans={clean:true,date:metrics.verifiedAt};
// An exhaustive table/RPC/role/tenant isolation matrix is required before advertising its count.
for(const root of ['dist-site','dist/site'])await writeFile(root+'/trust-metrics.json',JSON.stringify(metrics,null,2)+'\n');
console.log('Published only available verified CI metrics');
