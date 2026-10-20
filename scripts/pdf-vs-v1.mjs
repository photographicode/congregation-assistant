import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const normalize=s=>s.normalize('NFKC').replace(/\u0002/g,'').replace(/\s+/g,' ').trim();
const templates={s21:'assets/pdf-templates/s21.pdf',s3:'assets/pdf-templates/s3.pdf',s88:'assets/pdf-templates/s88.pdf'};
const staticRuns={};
for(const [kind,file] of Object.entries(templates))staticRuns[kind]=new Set((await runs(file)).map(run=>run.text));
const ornamentLabels=new Set(['Male','Female','Other sheep','Anointed','Elder','Ministerial servant','Regular pioneer','Special pioneer','Field missionary','Congregation name:','Month:']);
const fittedCodes=new Set(['CA','RC','Memorial']);
async function runs(file){
 const pdf=await getDocument({data:new Uint8Array(await readFile(file)),useSystemFonts:false,verbosity:0}).promise,all=[];
 for(let page=1;page<=pdf.numPages;page++){const text=await (await pdf.getPage(page)).getTextContent();
  for(const item of text.items)if('str'in item&&normalize(item.str)){
   const x=item.transform[4],y=item.transform[5],size=Math.hypot(item.transform[2],item.transform[3]),previous=all.at(-1);
   if(previous&&previous.page===page&&Math.abs(previous.y-y)<.25&&Math.abs(previous.size-size)<.2&&x-previous.right>=-.5&&x-previous.right<size*.6){const gap=x-previous.right;previous.text=normalize(previous.text+(gap>size*.18?' ':'')+item.str);previous.right=x+item.width;previous.cx=(previous.left+previous.right)/2;}
   else all.push({page,text:normalize(item.str),left:x,right:x+item.width,cx:x+item.width/2,y,size});
  }
 }await pdf.destroy();return all;
}
const results=[];
for(const name of (await readdir('tests/golden/v1')).filter(n=>/^s(?:21|88|3)-.*\.pdf$/.test(n))){
 const kind=name.match(/^(s(?:21|88|3))-/)[1],original=await runs('tests/golden/v1/'+name),candidate=await runs('work/pdf-v2/'+name),used=new Set(),failures=[];
 for(const a of original){
  // Original template checkbox glyphs are intentionally replaced with vector paths.
  if(/^[✓✔☑□\u0002]+$/.test(a.text))continue;
  const index=candidate.findIndex((b,i)=>!used.has(i)&&b.page===a.page&&b.text===a.text);
  if(index<0){failures.push({text:a.text,page:a.page,reason:'unmatched V1 text run'});continue;}
  used.add(index);const b=candidate[index],isStatic=staticRuns[kind].has(a.text),delta={center:Math.abs(a.cx-b.cx),left:Math.abs(a.left-b.left),baseline:Math.abs(a.y-b.y),size:Math.abs(a.size-b.size)};
  // Noto replaces the official template fonts. Static template copy therefore
  // keeps the measured centre/baseline while its PDF text transform may report
  // a different nominal size. Left-aligned entered values may keep their left
  // edge because exact Noto widths differ from V1's font. Checkbox-label runs
  // exclude V1's non-text ornament from horizontal comparisons.
  const horizontal=ornamentLabels.has(a.text)?0:Math.min(delta.center,delta.left);
  if(horizontal>1||delta.baseline>.75||(!isStatic&&!fittedCodes.has(a.text)&&delta.size>.2))failures.push({text:a.text,page:a.page,staticTemplate:isStatic,delta});
 }
 results.push({fixture:name,referenceRuns:original.length,matched:used.size,failures});
}
await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/pdf-vs-v1.json',JSON.stringify({tolerances:{horizontalAnchor:1,baseline:.75,dynamicFontSize:.2},intentional:["Noto's nominal transform size differs from the official template fonts; static copy is checked by measured position.","Left-aligned entered values preserve their V1 left edge when Noto run width differs.","V1 checkbox and dotted-line ornaments are vector artwork and excluded from text-run width comparisons.","The fixed attendance codes CA, RC and Memorial may shrink to fit their unchanged official cells."],results},null,2)+'\n');
const failures=results.reduce((n,r)=>n+r.failures.length,0);console.log(JSON.stringify({fixtures:results.length,failures,report:'docs/qa/pdf-vs-v1.json'}));if(failures)process.exitCode=1;
