/** Privacy-safe, device-memory diagnostics. Never stores messages, stacks, URLs or records. */
export type ErrorSeverity = 'info' | 'warning' | 'error';
export type LocalError = Readonly<{
  at: number;
  scope: string;
  severity: ErrorSeverity;
  category: 'abort' | 'storage' | 'permission' | 'unexpected';
}>;
export type ErrorContext = {scope:string;severity:ErrorSeverity;userMessage?:string};
const CAPACITY = 50;
const MAX_SCOPE_LENGTH = 64;
const RATE_WINDOW_MS = 1000;
const entries:LocalError[]=[];
const listeners=new Set<(entry:LocalError,userMessage?:string)=>void>();
function categoryFor(error:unknown):LocalError['category'] {
  if(!(error instanceof Error))return 'unexpected';
  if(error.name==='AbortError')return 'abort';
  if(['QuotaExceededError','InvalidStateError','SecurityError'].includes(error.name))return 'storage';
  if(error.name==='NotAllowedError')return 'permission';
  return 'unexpected';
}
export function handleError(error:unknown,context:ErrorContext):void {
  const entry:LocalError=Object.freeze({at:Date.now(),scope:context.scope.replace(/[^a-zA-Z0-9_.:/-]/g,'').slice(0,MAX_SCOPE_LENGTH),severity:context.severity,category:categoryFor(error)});
  const last=entries.at(-1);
  if(last&&last.scope===entry.scope&&last.category===entry.category&&entry.at-last.at<RATE_WINDOW_MS)return;
  entries.push(entry);
  if(entries.length>CAPACITY)entries.shift();
  for(const listener of listeners)listener(entry,context.userMessage);
}
export function ignoreError(reason:string):void {
  if(!reason.trim())throw new Error('An intentional fallback requires a reason.');
}
export function recentErrors():readonly LocalError[]{return [...entries];}
export function clearErrors():void{entries.length=0;}
export function subscribeErrors(listener:(entry:LocalError,userMessage?:string)=>void):()=>void{
  listeners.add(listener);
  return ()=>{listeners.delete(listener);};
}
