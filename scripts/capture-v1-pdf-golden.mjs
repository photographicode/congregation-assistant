import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';import {mkdir,writeFile,symlink,access,readFile} from 'node:fs/promises';import path from 'node:path';import {pdfFixtures,fixtureDate} from '../tests/fixtures/pdf.mjs';
const root=path.resolve('work/v1-final');try{await access(root+'/node_modules');}catch{await symlink(path.resolve('node_modules'),root+'/node_modules','dir');}
const require=createRequire(root+'/scripts/app-harness.cjs'),{createHarness}=require(root+'/scripts/app-harness.cjs');
class FixedDate extends Date{constructor(...args){super(...(args.length?args:[fixtureDate]));}static now(){return new Date(fixtureDate).getTime();}}
const manifest=[];await mkdir('tests/golden/v1',{recursive:true});
for(const fixture of pdfFixtures){const h=createHarness({date:FixedDate}),w=h.window;w.currentCongId=fixture.snapshot.id;w.db.reports=fixture.snapshot.reports;w.db.attendance=fixture.snapshot.attendance;let bytes;
 if(fixture.kind==='s21')bytes=await w.__exports.s21(fixture.snapshot.publishers,fixture.year,fixture.snapshot.reports);
 else if(fixture.kind==='s3')bytes=await w.__exports.s3(fixture.year,fixture.month,fixture.snapshot.name);
 else if(fixture.kind==='emergency')bytes=await w.PdfTools.emergency(fixture.families,fixture.snapshot.name);
 else{h.elements.get('att-year').value=String(fixture.year);let blob;const original=URL.createObjectURL;URL.createObjectURL=value=>{blob=value;return 'blob:golden';};try{await w.ui.printS88();}finally{URL.createObjectURL=original;}if(!blob)throw Error('V1 failed fixture '+fixture.name+': '+JSON.stringify(h.messages));bytes=new Uint8Array(await blob.arrayBuffer());}
 await writeFile('tests/golden/v1/'+fixture.name+'.pdf',bytes);manifest.push({name:fixture.name,kind:fixture.kind,bytes:bytes.length});
}
const source=await readFile(root+'/index.html','utf8'),templates={};for(const name of ['S21','S3','S88'])templates[name.toLowerCase()+'.pdf']=createHash('sha256').update(Buffer.from(source.match(new RegExp('const '+name+'_TEMPLATE_B64\\s*=\\s*"([^"]+)"'))[1],'base64')).digest('hex');
await writeFile('tests/golden/v1/manifest.json',JSON.stringify({tag:'v1-final',date:fixtureDate,templates,fixtures:manifest},null,2));console.log('Captured',manifest.length,'real V1 PDF golden fixtures.');
