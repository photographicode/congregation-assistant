/** Shared point-based cells. Coordinates use the PDF bottom-left origin. */
export type Cell={x:number;y:number;w:number;h:number;align?:'left'|'center'|'right';valign?:'top'|'middle'|'bottom';padding?:number;fontSize?:number;minSize?:number;bold?:boolean;maxLines?:number};
type Face={widthOfTextAtSize:(s:string,n:number)=>number;heightAtSize:(n:number,o?:{descender:boolean})=>number;caValidate?:(s:string)=>void;embedder?:{font?:{capHeight?:number;unitsPerEm?:number}}};
type Draw=(value:string,options:Record<string,unknown>)=>unknown;
const records=new WeakMap<object,unknown[]>();
export const cellGeometry=(page:object)=>records.get(page)||[];
export function fontMetrics(font:Face,size:number){const ascent=font.heightAtSize(size,{descender:false}),height=font.heightAtSize(size,{descender:true});const parsed=font.embedder?.font;return {ascent,descent:ascent-height,capHeight:parsed?.capHeight&&parsed?.unitsPerEm?parsed.capHeight/parsed.unitsPerEm*size:ascent};}
export function drawTextInCell(page:object,value:unknown,cell:Cell,font:Face,draw:Draw,options:Record<string,unknown>={}){
 const text=String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();if(!text)return {lines:[],size:cell.fontSize||9,truncated:false};font.caValidate?.(text);
 // Official template labels include reviewed 6.5–7 pt text. Runtime-entered
 // values still pass a 7 pt minimum; template reconstruction may preserve the
 // smaller source size explicitly.
 const padding=Math.max(2,cell.padding??2),width=Math.max(0,cell.w-padding*2),height=Math.max(0,cell.h-padding*2),minimum=Math.max(6,cell.minSize??7);let size=Math.max(minimum,cell.fontSize??9);
 const indic=/[\u0900-\u0dff]/u.test(text),leadingFactor=indic?1.5:1.25;
 while(size>minimum&&(font.widthOfTextAtSize(text,size)>width||font.heightAtSize(size)>height))size=Math.max(minimum,size-.25);
 const metrics=fontMetrics(font,size),leading=size*leadingFactor,maxLines=Math.max(1,Math.min(cell.maxLines??1,Math.floor(Math.max(0,height-metrics.ascent+metrics.descent)/leading)+1));const lines:string[]=[];let line='';
 for(const word of text.split(' ')){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)<=width)line=next;else {if(line)lines.push(line);line=word;}}
 if(line)lines.push(line);let truncated=lines.length>maxLines;const visible=lines.slice(0,maxLines);
 for(let i=0;i<visible.length;i++){if(font.widthOfTextAtSize(visible[i],size)>width||(truncated&&i===visible.length-1)){const segments=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(visible[i])].map(s=>s.segment);while(segments.length&&font.widthOfTextAtSize(segments.join('')+'…',size)>width)segments.pop();visible[i]=segments.join('')+'…';truncated=true;}}
 const blockHeight=metrics.ascent-metrics.descent+(visible.length-1)*leading;
 const bottom=cell.y+padding,top=cell.y+cell.h-padding;const baseline=cell.valign==='top'?top-metrics.ascent:cell.valign==='bottom'?bottom-metrics.descent:bottom+(height-blockHeight)/2-metrics.descent+(visible.length-1)*leading;
 const rows=records.get(page)||[];records.set(page,rows);
 visible.forEach((line,index)=>{const w=font.widthOfTextAtSize(line,size),x=cell.align==='right'?cell.x+cell.w-padding-w:cell.align==='center'?cell.x+(cell.w-w)/2:cell.x+padding,y=baseline-index*leading;if(w>width+.25||y+metrics.descent<bottom-.25||y+metrics.ascent>top+.25)throw Error('PDF cell is too small for readable text');draw(line,{...options,x,y,size,font});rows.push({text:line,x,y,w,size,cell:{...cell,padding},ascent:metrics.ascent,descent:metrics.descent});});return {lines:visible,size,truncated};
}
/** Route legacy baseline calls through the same measured cell policy. */
export function installCellWriter(pdf:{addPage:(...args:unknown[])=>any;getPage:(...args:unknown[])=>any;getPages:()=>any[]}){
 const seen=new WeakSet();function patch(page:any){if(seen.has(page))return page;seen.add(page);const draw=page.drawText.bind(page);page.drawText=(value:string,options:any={})=>{if(!String(value).trim())return;const font=options.font;if(!font)throw Error('Every PDF text cell requires an embedded font');const size=Math.max(7,options.size||12),m=fontMetrics(font,size),x=options.x||0,y=options.y||0;return drawTextInCell(page,value,{x:x-2,y:y+m.descent-2,w:Math.max(4,page.getWidth()-Math.max(12,x)-12)+4,h:m.ascent-m.descent+4,fontSize:size,valign:'bottom'},font,draw,options);};return page;}
 const add=pdf.addPage.bind(pdf),get=pdf.getPage.bind(pdf);pdf.addPage=(...args:unknown[])=>patch(add(...args));pdf.getPage=(...args:unknown[])=>patch(get(...args));pdf.getPages().forEach(patch);
}
export function subsetName(pdf:{context:{largestObjectNumber:number}},family:string){let n=pdf.context.largestObjectNumber+1,tag='';for(let i=0;i<6;i++){tag+=String.fromCharCode(65+n%26);n=Math.floor(n/26);}return tag+'+'+family;}
