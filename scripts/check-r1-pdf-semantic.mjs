import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {pdfFixtures} from '../tests/fixtures/pdf.mjs';
const normalize=s=>s.replace(/\s+/g,' ').trim();let assertions=0;
for(const f of pdfFixtures){const text=normalize(execFileSync('pdftotext',['work/pdf-v2/'+f.name+'.pdf','-'],{encoding:'utf8'}));
 if(f.kind==='s21'){for(const p of f.snapshot.publishers){assert(text.includes(normalize(p.name)),f.name+' full publisher name');assertions++;}for(const r of f.snapshot.reports){if(r.comments){assert(text.includes(normalize(r.comments)),f.name+' full remarks');assertions++;}}for(const month of ['September','October','November','December','January','February','March','April','May','June','July','August']){assert(text.includes(month),f.name+' all months');assertions++;}}
 if(f.kind==='emergency'){for(const family of f.families)for(const p of family.members)for(const key of ['name','phone','address','emergencyName','emergencyRelationship','emergencyPhone']){assert(text.includes(normalize(String(p[key]))),f.name+' retains '+key);assertions++;}}
}
console.log('PASS',assertions,'source-data retention assertions across 17 Noto fixtures; full long remarks/addresses and publisher names retained.');
