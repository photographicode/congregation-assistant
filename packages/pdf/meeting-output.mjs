import * as library from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {createPdfTools} from './layout.mjs';
import {unicodeFontProvider} from './unicode.mjs';
const {PDFDocument,rgb}=library;
const palettes={treasures:rgb(87/255,90/255,93/255),field:rgb(190/255,137/255,0),living:rgb(126/255,0,36/255)};
export async function meetingPDF({name,week,date,program,assignments,people,start='19:00',loadFont}){
 const pdf=await PDFDocument.create(),tools=createPdfTools({library,fontkit,loadFont,fontProvider:unicodeFontProvider({library,fontkit,loadFont})}),{font,bold}=await tools.fonts(pdf,[name,program.reading,...program.parts.map(p=>p.title),...people.map(p=>p.name)]),page=pdf.addPage([595.28,841.89]);
 const write=(text,x,y,width,size=10,isBold=false)=>{const face=isBold?bold:font;const lines=tools.wrap(text,face,width,size);for(let i=0;i<lines.length;i++)page.drawText(lines[i],{x,y:y-i*(size+2),font:face,size,color:rgb(0,0,0)});return lines.length*(size+2);};
 write(name,28,806,300,17,true);write('Midweek Meeting Schedule',340,806,225,12,true);page.drawRectangle({x:28,y:769,width:539,height:24,color:palettes.treasures});page.drawText(`${date||week} | ${program.reading}`,{x:35,y:777,size:11,font:bold,color:rgb(1,1,1)});
 const auxiliary=program.auxiliary===true;const assigned=assignments[week]||{},person=slot=>people.find(p=>p.id===assigned[slot]?.personId)?.name||'—';write('Chairman: '+person('Chairman'),28,750,260);if(auxiliary)write('Auxiliary Classroom Counselor: '+person('AuxiliaryCounselor'),305,750,260);
 let y=715,previous='',minutes=Number(start.split(':')[0])*60+Number(start.split(':')[1]);
 if(auxiliary)write('Auxiliary classroom',385,y+15,78,8,true);write('Main hall',auxiliary?475:430,y+15,auxiliary?88:130,8,true);
 for(const [index,part]of program.parts.entries()){
  if(part.section!==previous){previous=part.section;page.drawRectangle({x:28,y:y-9,width:539,height:22,color:palettes[part.section]});page.drawText(({treasures:'TREASURES FROM GOD’S WORD',field:'APPLY YOURSELF TO THE FIELD MINISTRY',living:'LIVING AS CHRISTIANS'})[part.section],{x:35,y:y-2,size:10,font:bold,color:part.section==='field'?rgb(31/255,22/255,0):rgb(1,1,1)});y-=34;}
  const time=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');minutes+=part.minutes;
  const height=Math.max(write(time,28,y,36,9),write(`${index+1}. ${part.title} (${part.minutes} min.)`,72,y,auxiliary?298:340,10,true),...(auxiliary?['Aux','']:['']).map((hall,i)=>write(person(part.id+hall)+(part.assistant?' / '+person(part.id+hall+'Assistant'):''),auxiliary?385+i*90:430,y,auxiliary?85:130,9)))+10;
  y-=height;page.drawLine({start:{x:28,y:y+6},end:{x:567,y:y+6},thickness:.25,color:rgb(.8,.8,.8)});if(y<45)throw Error('This program is too long for the supplied S-140 page. Review its parts before printing.');
 }
 page.drawText('S-140',{x:28,y:25,size:8,font,color:palettes.treasures});return pdf.save();
}
export async function assignmentPDF({name,assistant='',date,part,hall='main',copies=1,loadFont}){
 const pdf=await PDFDocument.create(),tools=createPdfTools({library,fontkit,loadFont,fontProvider:unicodeFontProvider({library,fontkit,loadFont})}),{font,bold}=await tools.fonts(pdf,[name,assistant,date,String(part)]),scale=.75,width=731*scale,height=974*scale;
 for(let copy=0;copy<copies;copy++){
  const page=pdf.addPage([width,height]);const text=(value,x,top,size=28,isBold=false)=>page.drawText(value,{x:x*scale,y:height-top*scale,size:size*scale,font:isBold?bold:font,color:rgb(0,0,0)});
  text('OUR CHRISTIAN LIFE AND MINISTRY',36,60,34,true);text('MEETING ASSIGNMENT',150,103,34,true);
  for(const [label,value,left,top]of [['Name:',name,150,166],['Assistant:',assistant,212,237],['Date:',date,134,309],['Part no.:',String(part),195,380]]){
   text(label,32,top,34,true);page.drawRectangle({x:left*scale,y:height-top*scale,width:(697-left)*scale,height:49*scale,color:rgb(.95,.96,1)});page.drawLine({start:{x:left*scale,y:height-top*scale},end:{x:697*scale,y:height-top*scale},dashArray:[3,2],thickness:1,color:rgb(.35,.35,.35)});const filled=tools.field(page,value,{x:left*scale,y:height-top*scale,width:(697-left)*scale,height:49*scale},font,{size:20,minSize:12,align:'left'});if(filled.truncated)throw Error('This field is too long for the supplied S-89 layout. Review it before exporting.');
  }
  text('To be given in:',32,489,34,true);
  for(const [index,label]of ['Main hall','Auxiliary classroom 1','Auxiliary classroom 2'].entries()){const y=height-(543+index*43)*scale;page.drawRectangle({x:76*scale,y,width:25*scale,height:25*scale,borderWidth:1,borderColor:rgb(.35,.35,.35)});if(hall===['main','aux1','aux2'][index])tools.checkbox(page,{x:76*scale,y,width:25*scale,height:25*scale},true);text(label,128,543+index*43,34);}
  text('Note to student:',32,732,28,true);const note='The source material and study point for your assignment can be found in the Life and Ministry Meeting Workbook. Please review the instructions for the part as outlined in Instructions for Our Christian Life and Ministry Meeting (S-38).';const lines=tools.wrap(note,font,640*scale,20);lines.forEach((line,index)=>page.drawText(line,{x:32*scale,y:height-(768+index*31)*scale,size:20,font}));text('S-89-E  11/23',32,920,24);
 }return pdf.save();
}
