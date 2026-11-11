// Territory Assignment Record (S-13-E 1/22), filled from the assignment history and drawn like the printed form.
// Ported from the standalone territory-manager. Measurements (territory-s13-layout.json) come from the form at 918 × 1300 units, scaled to A4.
import {PDFDocument} from 'pdf-lib';
import L from './territory-s13-layout.json';
import {byNumber,serviceYearLabel,type Assignment,type Territory} from './territory-model';

type S13Slot={name:string;assigned:string;completed:string};
export type S13Row={number:string;last:string;slots:S13Slot[]};

const YEAR_END=4,MONTH_START=5,MONTH_END=7,DAY_START=8,DAY_END=10,YY_START=2;

/** One row per territory (more when it was given out over four times that year), in number order. */
export function s13Rows(territories:Pick<Territory,'id'|'number'>[],assignments:Assignment[],year:number):S13Row[]{
 const start=`${year-1}-09-01`,end=`${year}-08-31`;
 return [...territories].sort(byNumber).flatMap(t=>{
  const mine=assignments.filter(a=>a.territory_id===t.id);
  const last=mine.map(a=>a.returned_on||'').filter(d=>d&&d<start).sort().pop()||'';
  const slots=mine.filter(a=>a.taken_on>=start&&a.taken_on<=end).sort((a,b)=>a.taken_on.localeCompare(b.taken_on))
   .map(a=>({name:a.publisher,assigned:a.taken_on,completed:a.returned_on||''}));
  const rows:S13Row[]=[];
  for(let i=0;i===0||i<slots.length;i+=L.slots)rows.push({number:t.number,last:rows.length?'':last,slots:slots.slice(i,i+L.slots)});
  return rows;
 });
}

/** dd/mm/yy, short enough for the form's date boxes. */
const short=(iso:string)=>iso?`${iso.slice(DAY_START,DAY_END)}/${iso.slice(MONTH_START,MONTH_END)}/${iso.slice(YY_START,YEAR_END)}`:'';
/** Column edge by index; the layout file always has seven. */
const col=(i:number)=>L.cols[i]??0;
const FONT='Arial,"Noto Sans",sans-serif',INK='#111',GREY='#333',BAND='#d9d9d9',PAPER='#fff';
type TextOptions={size:number;bold?:boolean;align?:CanvasTextAlign;maxW?:number;color?:string};

function painter(g:CanvasRenderingContext2D){
 const text=(s:string,[x,y]:[number,number],o:TextOptions)=>{
  g.font=`${o.bold?'700':'400'} ${o.size}px ${FONT}`;g.fillStyle=o.color??INK;g.textAlign=o.align??'left';g.textBaseline='alphabetic';
  let fit=s;while(o.maxW&&fit.length>1&&g.measureText(fit).width>o.maxW)fit=fit.slice(0,-1);
  // Centre on the capital height, so digits, dates and names sit dead centre in their box whatever the font.
  const cap=g.measureText('H').actualBoundingBoxAscent;
  g.fillText(fit===s?s:`${fit.slice(0,-1)}…`,x,y+cap/2);
 };
 const line=([x1=0,y1=0,x2=0,y2=0]:number[],w:number)=>{g.lineWidth=w;g.strokeStyle=INK;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();};
 return {text,line};
}

function drawHeader(g:CanvasRenderingContext2D,year:number){
 const {text,line}=painter(g),C=L.cols,H=L.head,T=L.headText,mid01=(col(0)+col(1))/2,mid12=(col(1)+col(2))/2;
 text('TERRITORY ASSIGNMENT RECORD',[L.page.w/2,L.title.y],{size:L.title.size,bold:true,align:'center'});
 text('Service Year:',[col(0),L.year.labelY],{size:L.year.size,bold:true});
 line(L.year.line,L.year.lineW);
 text(serviceYearLabel(year),[L.year.textX,L.year.textY],{size:L.year.size,align:'center'});
 g.fillStyle=BAND;g.fillRect(col(2),H.top,col(L.cols.length-1)-col(2),H.bottom-H.top);
 const head={size:T.size,align:'center' as const,color:GREY},small={...head,size:T.small};
 text('Terr.',[mid01,T.line1],head);text('no.',[mid01,T.line2],head);
 text('Last date',[mid12,T.line1],head);text('completed*',[mid12,T.line2],head);
 for(let k=0;k<L.slots;k++){
  const a=col(2+k),b=col(2+k+1),mid=(a+b)/2;
  text('Assigned to',[mid,T.assignedY],head);
  text('Date',[(a+mid)/2,T.dateY],small);text('assigned',[(a+mid)/2,T.wordY],small);
  text('Date',[(mid+b)/2,T.dateY],small);text('completed',[(mid+b)/2,T.wordY],small);
  line([a,H.mid,b,H.mid],L.rule.thin);line([mid,H.mid,mid,H.bottom],L.rule.thin);
 }
}

function drawRows(g:CanvasRenderingContext2D,rows:S13Row[]){
 const {text,line}=painter(g),C=L.cols,rowH=(L.bodyBottom-L.head.bottom)/L.rows;
 for(let r=0;r<L.rows;r++){
  const top=L.head.bottom+r*rowH,half=top+rowH/2;
  for(let k=0;k<L.slots;k++){const a=col(2+k),b=col(2+k+1);line([a,half,b,half],L.rule.thin);line([(a+b)/2,half,(a+b)/2,top+rowH],L.rule.thin);}
  if(r)line([col(0),top,col(L.cols.length-1),top],L.rule.row);
  const row=rows[r];if(!row)continue;
  text(row.number,[(col(0)+col(1))/2,half],{size:L.cell.number,align:'center'});
  text(short(row.last),[(col(1)+col(2))/2,half],{size:L.cell.last,align:'center'});
  row.slots.forEach((s,k)=>{
   const a=col(2+k),b=col(2+k+1),mid=(a+b)/2,dateY=top+rowH*L.cell.dateAt;
   text(s.name,[mid,top+rowH*L.cell.nameAt],{size:L.cell.name,align:'center',maxW:b-a-L.cell.namePad});
   text(short(s.assigned),[(a+mid)/2,dateY],{size:L.cell.date,align:'center'});
   text(short(s.completed),[(mid+b)/2,dateY],{size:L.cell.date,align:'center'});
  });
 }
}

function drawPage(rows:S13Row[],year:number):HTMLCanvasElement{
 const scale=(L.page.inches*L.page.dpi)/L.page.w,c=document.createElement('canvas');
 c.width=Math.round(L.page.w*scale);c.height=Math.round(L.page.h*scale);
 const g=c.getContext('2d')!,{text,line}=painter(g),C=L.cols,left=col(0),right=col(L.cols.length-1);
 g.scale(scale,scale);g.fillStyle=PAPER;g.fillRect(0,0,L.page.w,L.page.h);
 drawHeader(g,year);drawRows(g,rows);
 line([left,L.head.bottom,right,L.head.bottom],L.rule.row);
 for(const x of C.slice(1,-1))line([x,L.head.top,x,L.bodyBottom],x===col(1)?L.rule.thin:L.rule.group);
 g.lineWidth=L.rule.frame;g.strokeRect(left,L.head.top,right-left,L.bodyBottom-L.head.top);
 text('*When beginning a new sheet, use this column to record the date on which each territory was last completed.',[left,L.footer.noteY],{size:L.footer.noteSize});
 text('S-13-E  1/22',[left,L.footer.codeY],{size:L.footer.codeSize});
 return c;
}

/** The record for one service year as an A4 PDF, 20 rows a page. JPEG keeps each page small. */
export async function s13Pdf(territories:Pick<Territory,'id'|'number'>[],assignments:Assignment[],year:number):Promise<Blob>{
 const rows=s13Rows(territories,assignments,year),pdf=await PDFDocument.create();
 pdf.setTitle(`Territory Assignment Record – Service Year ${serviceYearLabel(year)}`);
 for(let i=0;i<Math.max(rows.length,1);i+=L.rows){
  const canvas=drawPage(rows.slice(i,i+L.rows),year);
  const jpg=await new Promise<Blob>((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('Could not draw the record')),'image/jpeg',L.page.jpeg));
  const page=pdf.addPage(L.page.a4 as [number,number]);
  page.drawImage(await pdf.embedJpg(await jpg.arrayBuffer()),{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 }
 return new Blob([(await pdf.save()) as Uint8Array<ArrayBuffer>],{type:'application/pdf'});
}
