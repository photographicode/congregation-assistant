import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createPdfEngine} from '../packages/pdf/engine.mjs';
import {meetingPDF,assignmentPDF} from '../packages/pdf/meeting-output.mjs';
const dir='work/pdf-r1-stress';await mkdir(dir,{recursive:true});const loadFont=name=>readFile('assets/fonts/'+name),loadTemplate=name=>readFile('assets/pdf-templates/'+name),now=()=>new Date('2026-10-18T12:00:00Z');
const names=['Alexandra Catherine Montgomery Thomas Samuel X','മരിയ തോമസ്','மரியா தாமஸ்','मारिया थॉमस','ଓଡ଼ିଆ ପ୍ରକାଶକ'];
for(const [i,name]of names.entries()){
 const snapshot={id:'stress',name:'Synthetic Congregation',attendance:[],publishers:[{id:'p',name,gender:'Female',baptized:'2000-01-01',dob:'1980-01-01'}],reports:Array.from({length:12},(_,month)=>({id:'r'+month,pubId:'p',serviceYear:2027,month,sharedInMinistry:true,studies:month%3,hours:[.25,.5,.75][month%3],comments:month===8?'Long preserved remarks '.repeat(30):'',isAP:true}))};
 const engine=createPdfEngine({snapshot,loadFont,loadTemplate,now});await writeFile(`${dir}/s21-script-${i}.pdf`,await engine.s21(snapshot.publishers,2027));
}
const parts=['BibleReading','Conversation','FollowingUp','Disciples','Beliefs'];
for(const classrooms of [1,2,3])for(const [i,part]of parts.entries())await writeFile(`${dir}/s89-${classrooms}-${part}.pdf`,await assignmentPDF({name:names[i],assistant:names[(i+1)%names.length],date:'2026-10-21',part:(i+1)+' · '+part,hall:['main','aux1','aux2'][classrooms-1],classrooms,copies:2,loadFont}));
for(const classrooms of [1,2,3]){
 const people=names.map((name,i)=>({id:'p'+i,name})),week='2026-W42',assignments={[week]:{Chairman:{personId:'p0'},AuxiliaryCounselor:{personId:'p1'},AuxiliaryCounselor2:{personId:'p2'}}};for(const [i,part]of parts.entries())for(const hall of ['','Aux','Aux2']){assignments[week][part+hall]={personId:'p'+i};assignments[week][part+hall+'Assistant']={personId:'p'+((i+1)%names.length)};}
 await writeFile(`${dir}/s140-${classrooms}.pdf`,await meetingPDF({name:names[0],week,date:'21 October 2026',program:{auxiliary:classrooms>1,classrooms,reading:'Synthetic reading',parts:parts.map((type,i)=>({id:type,type,title:'Fictional '+type,minutes:4,assistant:i>0,section:i===0?'treasures':'field'}))},assignments,people,loadFont}));
}
const engine=createPdfEngine({snapshot:{id:'stress',reports:[],attendance:[]},loadFont,loadTemplate,now});
const family={headName:'Synthetic Seven',members:Array.from({length:7},(_,i)=>({name:names[i%names.length],phone:'+91000000000'+i,address:'Synthetic address',emergencyName:'Synthetic Contact',emergencyRelationship:'Family',emergencyPhone:'+910000000009',baptized:true}))};await writeFile(`${dir}/emergency-seven.pdf`,await engine.emergency([family],'Synthetic Congregation'));
for(const [kind,options]of [['duty-roster',{}],['schedule-large',{largePrint:true}],['co-visit-pack',{}]])await writeFile(`${dir}/${kind}.pdf`,await engine.schedule(kind,names.map(name=>({heading:name,lines:['Synthetic assignment · 21 October 2026','Quarter hours: 0.25 / 0.5 / 0.75']})),options));
console.log('Generated 27 stress fixtures: Latin/Indic, quarter hours, all S89 part types/classroom counts, 3-hall S140, seven-member family, roster, large print, CO sections.');
