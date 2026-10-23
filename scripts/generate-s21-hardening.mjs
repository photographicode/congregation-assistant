import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createPdfEngine} from '../packages/pdf/engine.mjs';
const publishers=[
 {id:'male-elder',name:'Fictional Male Elder',gender:'Male',hope:'Anointed',isElder:true,isRP:true},
 {id:'male-ms',name:'Fictional Male Ministerial Servant',gender:'Male',hope:'Other Sheep',isMS:true,isSP:true},
 {id:'female-fm',name:'Fictional Female Full Time Servant',gender:'Female',hope:'Other Sheep',isFM:true},
].map(p=>({dob:'1980-01-01',baptized:'2000-01-01',...p}));
const months=[8,9,10,11,0,1,2,3,4,5,6,7];
const reports=publishers.flatMap(p=>months.map((month,i)=>({id:p.id+'-'+month,pubId:p.id,serviceYear:2027,month,sharedInMinistry:true,studies:i%3,hours:i+.25,comments:'Fictional report',isAP:true})));
const snapshot={id:'fictional',name:'Fictional Congregation',publishers,reports,attendance:[]};
const engine=createPdfEngine({snapshot,loadTemplate:name=>readFile('assets/pdf-templates/'+name),loadFont:name=>readFile('assets/fonts/'+name),now:()=>new Date('2026-10-14T06:00:00Z')});
await mkdir('work/pdf-s21-hardening',{recursive:true});await writeFile('work/pdf-s21-hardening/s21-checkbox-variants.pdf',await engine.s21(publishers,2027));console.log('Generated independent fictional S-21 checkbox variants; original 17 fixtures/goldens unchanged');
