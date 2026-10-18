import {meetingPDF} from '../packages/pdf/meeting-output.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const week='2026-W42',people=[{id:'main',name:'Main Publisher'},{id:'aux',name:'Auxiliary Publisher'},{id:'counselor',name:'Counselor Publisher'}],assignments={[week]:{Reading:{personId:'main'},ReadingAux:{personId:'aux'},AuxiliaryCounselor:{personId:'counselor'}}};
const program={reading:'Synthetic reading',parts:[{id:'Reading',title:'Bible reading',type:'BibleReading',minutes:4,assistant:false,section:'treasures'}]};
const loadFont=async name=>new Uint8Array(await readFile('assets/fonts/'+name));
await mkdir('work/refinement-pdf',{recursive:true});
for(const auxiliary of [false,true]){const file=`work/refinement-pdf/aux-${auxiliary}.pdf`;await writeFile(file,await meetingPDF({name:'Synthetic Congregation',week,program:{...program,auxiliary},assignments,people,loadFont}));const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});assert(text.includes('Main Publisher'));assert.equal(text.includes('Auxiliary Publisher'),auxiliary);assert.equal(text.includes('Counselor Publisher'),auxiliary);assert.equal(text.includes('Auxiliary classroom'),auxiliary);}
console.log('PASS S-140 auxiliary visibility and retained main assignment in both layouts');
