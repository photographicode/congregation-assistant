import english from './locales/en.json';
import bootstrap from './locales/bootstrap.json';
import type {MessageKey} from './locales/message-keys';
import {handleError} from './errors';
import {preferenceStorage} from './storage';
export type {MessageKey} from './locales/message-keys';
export type Locale=keyof typeof bootstrap;
type Catalogue=Partial<Record<MessageKey,string>>;
export const localeMetadata=bootstrap;
export const messages=Object.fromEntries(Object.entries(bootstrap).map(([code,value])=>[code,code==='en'?english:value.messages])) as Record<Locale,Catalogue>;
const importers={hi:()=>import('./locales/hi.json'),ta:()=>import('./locales/ta.json'),ml:()=>import('./locales/ml.json'),kn:()=>import('./locales/kn.json'),te:()=>import('./locales/te.json'),or:()=>import('./locales/or.json'),as:()=>import('./locales/as.json'),mr:()=>import('./locales/mr.json'),gu:()=>import('./locales/gu.json'),bn:()=>import('./locales/bn.json'),pa:()=>import('./locales/pa.json'),ur:()=>import('./locales/ur.json')};
const listeners=new Set<()=>void>();
const loaded=new Set<Locale>(['en']);
const loading=new Map<Locale,Promise<void>>();
let revision=0;
let currentLocale:Locale='en';
const saved=preferenceStorage.getItem('ca-interface-language');
if(saved&&saved in bootstrap)currentLocale=saved as Locale;
function applyDocumentLocale():void{
 if(typeof document==='undefined')return;
 document.documentElement.lang=currentLocale;
 document.documentElement.dir=currentLocale==='ur'?'rtl':'ltr';
}
function notify():void{revision++;for(const listener of listeners)listener();}
async function loadLocale(locale:Locale):Promise<void>{
 if(loaded.has(locale)||locale==='en')return;
 const existing=loading.get(locale);if(existing)return existing;
 const task=importers[locale]().then(value=>{messages[locale]=value.default;loaded.add(locale);notify();}).catch(error=>{handleError(error,{scope:'i18n.catalogue',severity:'warning'});}).finally(()=>{loading.delete(locale);});
 loading.set(locale,task);
 return task;
}
export const getLocaleSnapshot=():string=>currentLocale+':'+revision;
export const getUILocale=():Locale=>currentLocale;
export function subscribeUILocale(listener:()=>void):()=>void{listeners.add(listener);return()=>{listeners.delete(listener);};}
export function setUILocale(value:Locale):void{
 if(!(value in messages))return;
 currentLocale=value;
 preferenceStorage.setItem('ca-interface-language',value);
 applyDocumentLocale();notify();
 void loadLocale(value);
}
export function t(key:MessageKey,locale:Locale=currentLocale):string{return messages[locale][key]||english[key];}
applyDocumentLocale();
void loadLocale(currentLocale);
