import {t} from './i18n';
export type LocalPlan={kind:'s21-all'}|{kind:'report';people:Array<{id:string;name:string}>;period:string;hours:number;studies:number};
export function localCommand(input:string,people:Array<{id:string;name:string}>,now=new Date()):LocalPlan {
 const text=input.normalize('NFKC').trim().toLocaleLowerCase('en');if(/^(?:please\s+)?(?:generate|download|export)\s+(?:all\s+)?publisher(?:s)?\s+(?:reports|records|s-?21s?)\.?$/.test(text)||/^(?:generate|download)\s+all\s+s-?21s?\.?$/.test(text))return {kind:'s21-all'};
 if(!/^(?:please\s+)?(?:add|record|enter)\s+(?:a\s+)?(?:service\s+)?report\b/.test(text))throw Error(t('assistant.unsupported'));
 const hours=text.match(/\bhours?\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/),studies=text.match(/\bstudies\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/);if(!hours||!studies||Number(hours[1])<0||Number(hours[1])>744||!Number.isInteger(Number(studies[1]))||Number(studies[1])<0||Number(studies[1])>1000)throw Error(t('assistant.values'));
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];let period=text.match(/\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])\b/)?.[0];if(!period){const month=months.findIndex(name=>new RegExp('\\b'+name+'\\b').test(text));if(month<0)throw Error(t('assistant.month'));let year=Number(text.match(/\b(?:19|20|21)\d{2}\b/)?.[0]||now.getFullYear());if(!/\b(?:19|20|21)\d{2}\b/.test(text)&&month>now.getMonth())year--;period=year+'-'+String(month+1).padStart(2,'0');}
 const normalized=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('en').trim(),exact=people.filter(person=>text.includes(normalized(person.name)));let matches=exact;
 if(!matches.length){const target=text.match(/\breport\s+(?:for\s+)?(.+?)(?=,|\s+for\b|\s+in\b|\s+month\b|\s+hours?\b)/)?.[1]?.trim();if(target)matches=people.filter(person=>normalized(person.name)===target||normalized(person.name).split(/\s+/).includes(target));}
 if(!matches.length)throw Error(t('assistant.person'));return {kind:'report',people:matches,period,hours:Number(hours[1]),studies:Number(studies[1])};
}
