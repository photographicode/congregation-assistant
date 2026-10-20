import {readFile,writeFile} from 'node:fs/promises';
import {PDFDocument,PDFName,PDFArray,decodePDFRawStream,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {drawTextInCell,fontMetrics,subsetName} from '../packages/pdf/layout.ts';
const references=JSON.parse(await readFile('packages/pdf/template-cells.json','utf8'));
for(const [name,pages] of Object.entries(references)){
 const measured=await getDocument({data:new Uint8Array(await readFile('assets/pdf-templates/'+name+'.pdf')),verbosity:0,useSystemFonts:false}).promise;
 const pdf=await PDFDocument.load(await readFile('assets/pdf-templates/'+name+'.pdf'));pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(await readFile('assets/fonts/NotoSans-Regular.ttf'),{subset:true,customName:subsetName(pdf,'NotoSans-Regular')}),bold=await pdf.embedFont(await readFile('assets/fonts/NotoSans-Bold.ttf'),{subset:true,customName:subsetName(pdf,'NotoSans-Bold')});
 for(const [index,reference] of pages.entries()){
  const page=pdf.getPage(index),contents=page.node.Contents(),streams=contents instanceof PDFArray?contents.asArray():[contents];const original=streams.map(ref=>Buffer.from(decodePDFRawStream(pdf.context.lookup(ref)).decode()).toString('latin1')).join('\n');
  const artwork=original.replace(/\bBT\b[\s\S]*?\bET\b/g,'');page.node.set(PDFName.of('Contents'),pdf.context.register(pdf.context.flateStream(Buffer.from(artwork,'latin1'))));page.node.Resources().set(PDFName.of('Font'),pdf.context.obj({}));
  const sourceRuns=(await (await measured.getPage(index+1)).getTextContent()).items.filter(item=>'str' in item&&item.str.trim());
  for(const cell of reference.cells){const originalRun=sourceRuns.find(run=>Math.abs(run.transform[5]-cell.baseline)<.5&&Math.abs(run.transform[4]-cell.x)<.75);const measuredSize=originalRun?Math.hypot(originalRun.transform[2],originalRun.transform[3]):cell.size;if(name==='s21'&&cell.baseline<reference.height/2)continue;if(cell.text.includes('\u0002')&&!cell.ornament){page.drawLine({start:{x:cell.x,y:cell.baseline},end:{x:cell.x+cell.width,y:cell.baseline},thickness:.35,dashArray:[.5,1],color:rgb(0,0,0)});continue;}if(cell.ornament){page.drawRectangle({x:cell.x,y:cell.baseline,width:8,height:8,borderWidth:.5,borderColor:rgb(0,0,0)});continue;}const font=cell.bold?bold:regular,size=Math.max(7,measuredSize),metrics=fontMetrics(font,size),width=Math.max(cell.width,font.widthOfTextAtSize(cell.text,size));drawTextInCell(page,cell.text,{x:cell.x+(cell.width-width)/2-2,y:cell.baseline+metrics.descent-2,w:width+4,h:metrics.ascent-metrics.descent+4,padding:2,fontSize:size,minSize:size,align:'center',valign:'bottom'},font,page.drawText.bind(page),{color:rgb(0,0,0)});}
 }
 await measured.destroy();
 await writeFile('assets/pdf-templates/'+name+'-noto.pdf',await pdf.save());console.log('Converted reference text to Noto:',name);
}
