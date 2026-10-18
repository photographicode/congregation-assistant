import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const geometry=JSON.parse(await readFile('docs/qa/r1-pdf-geometry.json','utf8')),parity=JSON.parse(await readFile('docs/qa/r1-pdf-parity.json','utf8')),forms=JSON.parse(await readFile('docs/qa/refinement-behavior.json','utf8'));
assert(geometry.fixtures>=49&&geometry.hard===0,'R1 PDF geometry must pass all base/stress fixtures');assert(parity.passed===17&&parity.dpi===150&&parity.pixelTolerance<=.002,'Reviewed Noto PDF golden gate');assert(forms.publicForm.offlineDraftAndManualRetry&&forms.publicForm.noAutoSendOnReconnect,'Safe manual offline retry evidence');
const result=spawnSync(process.execPath,['scripts/check-no-legacy.mjs','--bundle'],{stdio:'inherit'});if(result.status)process.exit(result.status);
console.log('R1 evidence passes. Workflow separately requires current unit/browser, database/RLS, PDF and HARD matrix jobs. R2 parity/pricing/domain gates remain separate.');
