import {describe,expect,it} from 'vitest';
import fc from 'fast-check';
import {cellGeometry,drawTextInCell} from '../../packages/pdf/layout.ts';

const latinIndic=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',...'മലയാളംதமிழ்తెలుగుಕನ್ನಡहिन्दीଓଡ଼ିଆ'];
const field=fc.array(fc.constantFrom(...latinIndic),{minLength:1,maxLength:60}).map(chars=>chars.join('').trim()||'A');
const remarks=fc.array(fc.constantFrom(...latinIndic,'.',',','0','1','2','3'),{maxLength:240}).map(chars=>chars.join(''));
const face={widthOfTextAtSize:(value:string,size:number)=>[...value].reduce((width,char)=>width+(char===' '?0.3:/[\u0900-\u0dff]/u.test(char)?1:.56)*size,0),heightAtSize:(size:number,options?:{descender:boolean})=>options?.descender?size*1.15:size*.82,embedder:{font:{capHeight:720,unitsPerEm:1000}}};

describe('PDF cell properties',()=>{
 it('keeps random publisher values inside measured cells with shared row baselines',()=>fc.assert(fc.property(field,fc.integer({min:0,max:11}),fc.integer({min:0,max:2976}).map(n=>n/4),remarks,(name,month,hours,note)=>{
  const page={},draw=()=>{};
  const left=drawTextInCell(page,name,{x:20,y:700,w:260,h:28,padding:2,fontSize:10,minSize:7,valign:'middle'},face,draw);
  const center=drawTextInCell(page,String(hours),{x:300,y:700,w:70,h:28,padding:2,fontSize:9,minSize:7,align:'center',valign:'middle'},face,draw);
  drawTextInCell(page,`${month+1} ${note}`,{x:20,y:640,w:350,h:52,padding:2,fontSize:9,minSize:7,maxLines:3,valign:'middle'},face,draw);
  const rows=cellGeometry(page) as Array<{x:number;y:number;w:number;ascent:number;descent:number;cell:{x:number;y:number;w:number;h:number;padding:number}}>;
  for(const row of rows){expect(row.x).toBeGreaterThanOrEqual(row.cell.x+row.cell.padding-.25);expect(row.x+row.w).toBeLessThanOrEqual(row.cell.x+row.cell.w-row.cell.padding+.25);expect(row.y+row.descent).toBeGreaterThanOrEqual(row.cell.y+row.cell.padding-.25);expect(row.y+row.ascent).toBeLessThanOrEqual(row.cell.y+row.cell.h-row.cell.padding+.25);}
  expect(left.lines).toHaveLength(1);expect(center.lines).toHaveLength(1);expect(Math.abs((rows[0] as {y:number}).y-(rows[1] as {y:number}).y)).toBeLessThanOrEqual(.25);
 }),{numRuns:200}));
});
