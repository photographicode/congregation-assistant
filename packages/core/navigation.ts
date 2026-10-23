import type {MessageKey} from './i18n';
export type SectionId='home'|'people'|'reports'|'meetings'|'messages'|'forms'|'admin';
export type Tool={id:string;section:SectionId;label:MessageKey;description:MessageKey;route:string;sub?:string;roles:string[];owner?:boolean;available:boolean};
export const sections:Array<{id:SectionId;label:MessageKey}>=[{id:'home',label:'nav.home'},{id:'people',label:'nav.people'},{id:'reports',label:'nav.reports'},{id:'meetings',label:'nav.meetings'},{id:'messages',label:'nav.messages'},{id:'forms',label:'nav.forms'},{id:'admin',label:'nav.admin'}];
const tools:Tool[]=[
 {id:'publishers',section:'people',label:'tool.publishers',description:'purpose.publishers',route:'people',sub:'publishers',roles:['admin','field_service','group_overseer'],available:true},
 {id:'groups',section:'people',label:'tool.groups',description:'purpose.groups',route:'people',sub:'groups',roles:['admin','field_service'],available:true},
 {id:'households',section:'people',label:'tool.households',description:'purpose.households',route:'reports',roles:['admin','field_service','group_overseer','publisher'],available:true},
 {id:'emergency',section:'people',label:'tool.emergency',description:'purpose.emergency',route:'emergency',roles:['admin'],available:true},
 {id:'import',section:'people',label:'tool.import',description:'purpose.import',route:'people',sub:'import',roles:['admin'],available:true},
 {id:'month',section:'reports',label:'tool.month',description:'purpose.month',route:'reports',sub:'service',roles:['admin','field_service','group_overseer','publisher'],available:true},
 {id:'pioneers',section:'reports',label:'tool.pioneers',description:'purpose.pioneers',route:'reports',sub:'annual',roles:['admin','field_service','group_overseer'],available:true},
 {id:'summary',section:'reports',label:'tool.summary',description:'purpose.summary',route:'reports',roles:['admin','field_service'],available:false},
 {id:'midweek',section:'meetings',label:'tool.midweek',description:'purpose.midweek',route:'schedule',sub:'midweek',roles:['admin','oclm','publisher'],available:true},
 {id:'weekend',section:'meetings',label:'tool.weekend',description:'purpose.weekend',route:'schedule',sub:'weekend',roles:['admin','weekend','publisher'],available:true},
 {id:'attendance',section:'meetings',label:'tool.attendance',description:'purpose.attendance',route:'reports',sub:'attendance',roles:['admin','attendance'],available:true},
 {id:'duties',section:'meetings',label:'tool.duties',description:'purpose.duties',route:'schedule',sub:'duties',roles:['admin','oclm','attendant','av','cleaning'],available:true},
 {id:'field-service',section:'meetings',label:'tool.fieldService',description:'purpose.fieldService',route:'schedule',roles:['admin','field_service','group_overseer'],available:false},
 {id:'speakers',section:'meetings',label:'tool.speakers',description:'purpose.speakers',route:'schedule',roles:['admin','weekend'],available:false},
 {id:'whatsapp',section:'messages',label:'tool.whatsapp',description:'purpose.whatsapp',route:'messages',roles:['admin'],available:true},
 {id:'reminders',section:'messages',label:'tool.reminders',description:'purpose.reminders',route:'messages',roles:['admin','publisher'],available:false},
 {id:'announcements',section:'messages',label:'tool.announcements',description:'purpose.announcements',route:'messages',roles:['admin','publisher'],available:false},
 {id:'s21',section:'forms',label:'tool.s21',description:'purpose.s21',route:'pdf',sub:'s21',roles:['admin','field_service','group_overseer'],available:true},
 {id:'attendance-pdf',section:'forms',label:'tool.attendancePDF',description:'purpose.attendancePDF',route:'pdf',sub:'s88',roles:['admin','attendance'],available:true},
 {id:'emergency-pdf',section:'forms',label:'tool.emergencyPDF',description:'purpose.emergencyPDF',route:'pdf',sub:'emergency',roles:['admin','field_service'],available:true},
 {id:'schedule-pdf',section:'forms',label:'tool.schedulePDF',description:'purpose.schedulePDF',route:'pdf',sub:'midweek',roles:['admin','oclm','weekend'],available:true},
 {id:'duty-pdf',section:'forms',label:'tool.duties',description:'purpose.duties',route:'pdf',sub:'duties',roles:['admin','av','attendant','cleaning'],available:true},
 {id:'co-pack',section:'forms',label:'tool.coPack',description:'purpose.coPack',route:'pdf',roles:['admin','field_service'],available:false},
 {id:'access',section:'admin',label:'tool.access',description:'purpose.access',route:'access',roles:['admin'],available:true},
 {id:'links',section:'admin',label:'tool.links',description:'purpose.links',route:'access',roles:['admin','field_service','group_overseer','attendance'],available:true},
 {id:'backup',section:'admin',label:'tool.backup',description:'purpose.backup',route:'settings',roles:['admin'],available:true},
 {id:'settings',section:'admin',label:'tool.settings',description:'purpose.settings',route:'settings',roles:['admin','field_service','group_overseer','attendance','oclm','weekend','attendant','av','cleaning','publisher'],available:true},
 {id:'plan',section:'admin',label:'tool.plan',description:'purpose.plan',route:'settings',roles:['admin'],available:true},
 {id:'owner',section:'admin',label:'tool.owner',description:'purpose.owner',route:'owner',roles:[],owner:true,available:true}
];
export function allowedTools(roles:string[],owner=false){return tools.filter(tool=>owner?['owner','settings'].includes(tool.id):!tool.owner&&tool.roles.some(role=>roles.includes(role)));}
export function sectionForRoute(route:string):SectionId{return ({schedule:'meetings',pdf:'forms',settings:'admin',access:'admin',owner:'admin',emergency:'people'} as Record<string,SectionId>)[route]||(['home','people','reports','messages'].includes(route)?route as SectionId:'home');}
