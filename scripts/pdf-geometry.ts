import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const directories=process.argv.slice(2).length?process.argv.slice(2):['work/pdf-v2','work/s89-fixtures','work/refinement-pdf'];
await mkdir('tests/pdf-geometry',{recursive:true});const summaries=[];let hard=0;
for(const directory of directories)for(const file of (await readdir(directory)).filter(f=>f.endsWith('.pdf')).sort()){
 const filename=path.join(directory,file),data=new Uint8Array(await readFile(filename)),pdf=await getDocument({data,useSystemFonts:false,isEvalSupported:false}).promise;
 const fonts=execFileSync('pdffonts',[filename],{encoding:'utf8'}).split('\n').slice(2).filter(s=>s.trim());const failures:any[]=[];for(const row of fonts)if(!/^\S*(?:\+)?NotoSans\S*\s/.test(row)||!/\s+yes\s+yes\s+yes\s+\d+\s+\d+\s*$/.test(row))failures.push({kind:'font',row});
 const pages=[];for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
  const page=await pdf.getPage(pageNo),viewport=page.getViewport({scale:1}),content=await page.getTextContent({disableNormalization:true,includeMarkedContent:true});const runs:any[]=[];let marked:any[]|null=null;
  const add=(items:any[])=>{if(!items.length)return;const x=Math.min(...items.map(i=>i.transform[4])),y=Math.min(...items.map(i=>i.transform[5])),right=Math.max(...items.map(i=>i.transform[4]+i.width)),top=Math.max(...items.map(i=>i.transform[5]+i.height));runs.push({text:items.map(i=>i.str).join(''),page:pageNo,x,y,w:right-x,h:top-y,font:items[0].fontName,size:Math.hypot(items[0].transform[0],items[0].transform[1])});};
  for(const item of content.items as any[]){if(item.type==='beginMarkedContentProps'||item.type==='beginMarkedContent'){if(marked)add(marked);marked=[];}else if(item.type==='endMarkedContent'){if(marked)add(marked);marked=null;}else if('str'in item&&item.str.trim()){if(marked)marked.push(item);else add([item]);}}

  for(const run of runs){if(run.text.includes('\ufffd')||run.text.includes('\u0000'))failures.push({kind:'missing-glyph',run});if(run.x<-.25||run.x+run.w>viewport.width+.25||run.y<-.25||run.y+run.h>viewport.height+1)failures.push({kind:'page-overflow',run,pageWidth:viewport.width,pageHeight:viewport.height});}
  if(file.startsWith('s21-')&&pageNo===1){const numeric=runs.filter(r=>/^[0-9]+(?:[.,][0-9]+)?$/.test(r.text)&&r.y>25&&r.y<265&&((r.x>175&&r.x<225)||(r.x>315&&r.x<375)));for(const run of numeric){const center=run.x+run.w/2,target=run.x<250?207.33:348.47;if(Math.abs(center-target)>.5)failures.push({kind:'official-column-center',run,target});}for(const a of numeric)for(const b of numeric)if(a.x<250&&b.x>250&&Math.abs(a.y-b.y)<3&&Math.abs(a.y-b.y)>.25)failures.push({kind:'row-baseline',a,b});}
  const overlaps=[];for(let i=0;i<runs.length;i++)for(let j=i+1;j<runs.length;j++){const a=runs[i],b=runs[j],dx=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),dy=Math.min(a.y+a.h*.75,b.y+b.h*.75)-Math.max(a.y,b.y);if(dx>.5&&dy>.5)overlaps.push({a:i,b:j,dx,dy});}if(overlaps.length)failures.push({kind:'text-overlap',page:pageNo,pairs:overlaps});
  pages.push({page:pageNo,width:viewport.width,height:viewport.height,orientation:viewport.width>viewport.height?'landscape':'portrait',runs});
 }
 const snapshot={fixture:file,source:directory,pages,failures};await writeFile('tests/pdf-geometry/'+path.basename(directory)+'-'+file.replace('.pdf','.json'),JSON.stringify(snapshot,null,2)+'\n');hard+=failures.length;summaries.push({fixture:filename,pages:pdf.numPages,runs:pages.reduce((n,p)=>n+p.runs.length,0),hard:failures.length});await pdf.destroy();
}
const summary={fixtures:summaries.length,hard,results:summaries};await writeFile('docs/qa/r1-pdf-geometry.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));if(hard)process.exitCode=1;
