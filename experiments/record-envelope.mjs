/** Fictional-record experiment only. NOT loaded by the application or connected to Supabase.
 * AEAD is one primitive; device authentication, distribution, revocation and recovery are unresolved.
 */
export const productionEnabled = false;
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal:true});
const MAX_BYTES=1024*1024;
function context(value){
  if(!value||Object.keys(value).sort().join(',')!=='epoch,record,revision,scope,workspace')throw Error('Invalid record context');
  for(const field of ['workspace','scope','record'])if(typeof value[field]!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(value[field]))throw Error('Invalid record context');
  for(const field of ['epoch','revision'])if(!Number.isSafeInteger(value[field])||value[field]<1)throw Error('Invalid record context');
  return encoder.encode(JSON.stringify(['ca-record-experiment-v1',value.workspace,value.scope,value.record,value.epoch,value.revision]));
}
function encode(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decode(text){if(typeof text!=='string'||!text||text.length>MAX_BYTES*2||!/^[A-Za-z0-9_-]+$/.test(text))throw Error('Invalid encrypted record');const bytes=Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));if(encode(bytes)!==text)throw Error('Invalid encrypted record');return bytes;}
function checkKey(key){if(!key||key.type!=='secret'||key.extractable!==false||key.algorithm?.name!=='AES-GCM'||key.algorithm.length!==256||!key.usages.includes('encrypt')||!key.usages.includes('decrypt'))throw Error('Use a non-exportable AES-GCM-256 key');}
export async function createFictionalKey(){return crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function sealFictionalRecord(key,expectedContext,fictionalRecord){checkKey(key);const aad=context(expectedContext),bytes=encoder.encode(JSON.stringify(fictionalRecord));if(bytes.length>MAX_BYTES)throw Error('Record too large');const nonce=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:128},key,bytes);return Object.freeze({format:'ca-record-experiment-v1',algorithm:'AES-GCM-256',nonce:encode(nonce),ciphertext:encode(new Uint8Array(ciphertext))});}
export async function openFictionalRecord(key,expectedContext,envelope){checkKey(key);const aad=context(expectedContext);if(!envelope||Object.keys(envelope).sort().join(',')!=='algorithm,ciphertext,format,nonce'||envelope.format!=='ca-record-experiment-v1'||envelope.algorithm!=='AES-GCM-256')throw Error('Invalid encrypted record');try{const nonce=decode(envelope.nonce),ciphertext=decode(envelope.ciphertext);if(nonce.length!==12||ciphertext.length<16||ciphertext.length>MAX_BYTES+16)throw Error('Invalid encrypted record');return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce,additionalData:aad,tagLength:128},key,ciphertext)));}catch{throw Error('Record verification failed');}}
