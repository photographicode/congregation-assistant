import {readFile,writeFile} from 'node:fs/promises';
import {PDFDocument,PDFName,PDFArray,decodePDFRawStream,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {drawTextInCell,fontMetrics,subsetName} from '../packages/pdf/layout.ts';
const references=JSON.parse(await readFile('packages/pdf/template-cells.json','utf8'));
for(const [name,pages] of Object.entries(references)){
 const pdf=await PDFDocument.load(await readFile('assets/pdf-templates/'+name+'.pdf'));pdf.registerFontkit(fontkit);
 const regular=await pdf.embedFont(await readFile('assets/fonts/NotoSans-Regular.ttf'),{subset:true,customName:subsetName(pdf,'NotoSans-Regular')}),bold=await pdf.embedFont(await readFile('assets/fonts/NotoSans-Bold.ttf'),{subset:true,customName:subsetName(pdf,'NotoSans-Bold')});
 for(const [index,reference] of pages.entries()){
  const page=pdf.getPage(index),contents=page.node.Contents(),streams=contents instanceof PDFArray?contents.asArray():[contents];const original=streams.map(ref=>Buffer.from(decodePDFRawStream(pdf.context.lookup(ref)).decode()).toString('latin1')).join('\n');
  const artwork=original.replace(/\bBT\b[\s\S]*?\bET\b/g,'');page.node.set(PDFName.of('Contents'),pdf.context.register(pdf.context.flateStream(Buffer.from(artwork,'latin1'))));page.node.Resources().set(PDFName.of('Font'),pdf.context.obj({}));
  for(const cell of reference.cells){if(name==='s21'&&cell.baseline<reference.height/2)continue;if(cell.text.includes('\u0002')&&!cell.ornament){page.drawLine({start:{x:cell.x,y:cell.baseline},end:{x:cell.x+cell.width,y:cell.baseline},thickness:.35,dashArray:[.5,1],color:rgb(0,0,0)});continue;}if(cell.ornament){page.drawRectangle({x:cell.x,y:cell.baseline,width:8,height:8,borderWidth:.5,borderColor:rgb(0,0,0)});continue;}const font=cell.bold?bold:regular,size=Math.max(7,cell.size),metrics=fontMetrics(font,size);drawTextInCell(page,cell.text,{x:cell.x-2,y:cell.baseline+metrics.descent-2,w:Math.max(cell.width,font.widthOfTextAtSize(cell.text,7))+4,h:metrics.ascent-metrics.descent+4,padding:2,fontSize:size,minSize:7,valign:'bottom'},font,page.drawText.bind(page),{color:rgb(0,0,0)});}
 }
 await writeFile('assets/pdf-templates/'+name+'-noto.pdf',await pdf.save());console.log('Converted reference text to Noto:',name);
}
