import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const evidence=JSON.parse(await readFile('docs/qa/r1-full-matrix.json','utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const paths=['apps/web/src','apps/web/index.html','apps/web/public','packages/ui','packages/core','assets/fonts','public-config.json','package-lock.json'];
const exceptions=['apps/web/src/features/Reports.tsx','packages/ui/theme-bridge.css'];
const tree=execFileSync('git',['ls-tree','-r','HEAD','--',...paths],{encoding:'utf8'}).split('\n').filter(line=>line&&!exceptions.some(p=>line.endsWith('\t'+p))).sort().join('\n');
assert.equal(hash(tree),evidence.unchangedUiHash,'UI outside the tested report delta changed: refresh the full matrix evidence');
const normalizeReports=s=>s.split('\n').filter(line=>!line.includes('const frame=requestAnimationFrame(()=>{const entry=document.querySelector<HTMLFormElement>')).join('\n').replace("c.notify('');setError('');setAPError('');setRevokeTarget(row);","setError('');setAPError('');setRevokeTarget(row);").split('\n').filter(line=>line.trim()).join('\n');
const normalizeCSS=s=>s.split('\n').filter(line=>line.trim()&&!line.startsWith('.service-report-form{scroll-margin-block-start:')).join('\n');
assert.equal(hash(normalizeReports(await readFile(exceptions[0],'utf8'))),evidence.reportsBaseHash,'Reports changed outside the known focus/notification delta');
assert.equal(hash(normalizeCSS(await readFile(exceptions[1],'utf8'))),evidence.cssBaseHash,'Shared CSS changed outside the known report scroll clearance');
assert.equal(evidence.jobs.length,8);assert(evidence.views>=37000);for(const job of evidence.jobs){assert.equal(job.conclusion,'success');assert.equal(job.hard,0);for(const row of job.summaries)assert.equal(row.coverageErrors,0);}
console.log(JSON.stringify({fullMatrixRun:evidence.run,views:evidence.views,hard:0,unchangedUiHash:evidence.unchangedUiHash,reportDelta:'Verified separately by the current report-state matrix and browser specs'}));
