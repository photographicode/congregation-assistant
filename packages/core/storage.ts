import {z} from 'zod';
import {handleError} from './errors';
const SCHEMA_VERSION = 1;
const MAX_KEY_LENGTH = 256;
const KIBIBYTE = 1024;
const MAX_VALUE_LENGTH = KIBIBYTE * KIBIBYTE;
const memory=new Map<string,string>();
export type PreferenceKey='ca-v2-appearance'|`ca-v3:${string}`|`ca-${string}`;
const storedPreference=z.object({version:z.literal(SCHEMA_VERSION),value:z.unknown()});
function validKey(key:string):void {
  if(!key||key.length>MAX_KEY_LENGTH)throw new Error('Invalid preference key.');
}
function backend():Storage|undefined {
  try{return globalThis.localStorage;}catch(error){handleError(error,{scope:'storage.access',severity:'warning'});return undefined;}
}
/** Compatibility facade preserves existing on-disk formats while callers are migrated. */
export const preferenceStorage={
 getItem(key:string):string|null {
  validKey(key);
  try{const value=backend()?.getItem(key);if(value!==null&&value!==undefined){memory.set(key,value);return value;}}catch(error){handleError(error,{scope:'storage.read',severity:'warning'});}
  return memory.get(key)??null;
 },
 setItem(key:string,value:string):void {
  validKey(key);
  if(value.length>MAX_VALUE_LENGTH)throw new Error('Preference value is too large.');
  memory.set(key,value);
  try{backend()?.setItem(key,value);}catch(error){handleError(error,{scope:'storage.write',severity:'warning'});}
 },
 removeItem(key:string):void {
  validKey(key);memory.delete(key);
  try{backend()?.removeItem(key);}catch(error){handleError(error,{scope:'storage.remove',severity:'warning'});}
 },
};
export function readPreference<T>(key:PreferenceKey,schema:z.ZodType<T>,fallback:T):T {
 const raw=preferenceStorage.getItem(key);if(raw===null)return fallback;
 try{const value:unknown=JSON.parse(raw);const envelope=storedPreference.safeParse(value);return schema.parse(envelope.success?envelope.data.value:value);}catch(error){handleError(error,{scope:'storage.schema',severity:'warning'});return fallback;}
}
export function writePreference<T>(key:PreferenceKey,schema:z.ZodType<T>,value:T):void {
 preferenceStorage.setItem(key,JSON.stringify({version:SCHEMA_VERSION,value:schema.parse(value)}));
}
export function clearPreferenceMemory():void{memory.clear();}
