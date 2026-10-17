import {openDB,type DBSchema,type IDBPDatabase} from 'idb';
import {z} from 'zod';
import {t} from './i18n';
import {StoreError,type Store,type Transport,type ReadRequest,type Mutation,type DraftCommand,type StoreEvent,type SyncStatus} from './store';
type Snapshot={id:string;scope:string;key:string;signature:string;value:unknown};
type Pending={id:string;scope:string;sequence:number;command:DraftCommand;state:'pending'|'conflict'|'forbidden';error?:string;lease?:string;leaseUntil?:number};
interface Mirror extends DBSchema {
 snapshots:{key:string;value:Snapshot;indexes:{scope:string}};
 outbox:{key:string;value:Pending;indexes:{scope:string}};
}
type Options={account:string;workspace:string;authorization:string;transport:Transport;online?:()=>boolean;database?:string};
const queued=z.object({kind:z.literal('oclm-draft'),key:z.literal('schedule'),expectedRevision:z.number().int().nonnegative(),draft:z.record(z.string(),z.unknown())});
const savedDraft=z.object({revision:z.number().int().positive(),draft:z.record(z.string(),z.unknown())});
function openMirror(name='ca-v3-plain'){return openDB<Mirror>(name,1,{upgrade(db){db.createObjectStore('snapshots',{keyPath:'id'}).createIndex('scope','scope');db.createObjectStore('outbox',{keyPath:'id'}).createIndex('scope','scope');}});}
export async function clearPlainAccount(account:string){if(!account)return;const db=await openMirror(),tx=db.transaction(['snapshots','outbox'],'readwrite');for(const name of ['snapshots','outbox'] as const){const store=tx.objectStore(name);for(const row of await store.getAll()){let owner;try{owner=JSON.parse(row.scope)[0];}catch{continue;}if(owner===account)await store.delete(row.id);}}await tx.done;db.close();}
// Share-link credentials are fetched when online. Never mirror bearer material.
function redact(value:unknown):unknown {if(Array.isArray(value))return value.map(redact);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/^(token|access_token|refresh_token|id_token)$/i.test(key)?'':redact(item)]));return value;}
function signature(request:ReadRequest){return JSON.stringify(request.source);}
function parse<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success)throw new StoreError('invalid',t('store.invalid'));return result.data;}
export class PlainStore implements Store {
 private databasePromise?:Promise<IDBPDatabase<Mirror>>;
 private get database(){return this.databasePromise??=openMirror(this.options.database);}
 private scope:string;
 private active=true;
 private listeners=new Set<(event:StoreEvent)=>void>();
 private tasks=new Set<Promise<unknown>>();
 private syncing?:Promise<void>;
 private reading=new Map<string,Promise<unknown>>();
 private lastError?:string;
 private online:()=>boolean;
 constructor(private options:Options){
  if(!options.account)throw new StoreError('forbidden',t('store.signIn'));
  this.scope=JSON.stringify([options.account,options.workspace,options.authorization]);
  this.online=options.online||(()=>navigator.onLine);

 }
 private assertActive(){if(!this.active)throw new StoreError('closed',t('store.closed'));}
 private id(key:string){return JSON.stringify([this.scope,key]);}
 private validateScope(request:ReadRequest){if(!request.cacheKey)return;const source=request.source,accountMetadata=this.options.workspace===''&&(request.cacheKey==='account-owner'&&source.kind==='rpc'&&source.name==='ca_is_superadmin'&&Object.keys(source.args).length===0||request.cacheKey==='account-membership'&&source.kind==='table'&&source.name==='congregation_access'&&source.columns==='cong_id,role,congregations(name)'&&source.filters?.some(filter=>filter.column==='email'&&filter.op==='eq'&&typeof filter.value==='string')&&source.filters?.some(filter=>filter.column==='active'&&filter.op==='eq'&&filter.value===true)),correct=accountMetadata||(source.kind==='rpc'?source.args.p_cong_id===this.options.workspace:source.filters?.some(filter=>filter.column==='cong_id'&&filter.op==='eq'&&filter.value===this.options.workspace));if(this.options.account==='public'||!correct)throw new StoreError('forbidden',t('store.invalid'));}
 private emit(key:string,reason:StoreEvent['reason']){if(this.active)for(const listener of this.listeners)listener({key,reason});}
 private async entries(){return (await this.database).getAllFromIndex('outbox','scope',this.scope);}
 private track(task:Promise<unknown>){this.tasks.add(task);void task.catch(error=>{this.lastError=(error as Error).message;}).finally(()=>this.tasks.delete(task));}
 async settled(){await Promise.allSettled([...this.tasks]);}
 subscribe(listener:(event:StoreEvent)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 async read<T>(request:ReadRequest,schema:z.ZodType<T>):Promise<T>{
  this.assertActive();this.validateScope(request);if(!request.cacheKey){if(!this.online())throw new StoreError('offline',t('store.onlineRequired'));return this.refresh(request,schema);}
  const db=await this.database;this.assertActive();let fallback:T|undefined;
  if(request.cacheKey){const snapshot=await db.get('snapshots',this.id(request.cacheKey));this.assertActive();if(snapshot&&snapshot.signature===signature(request)){
    const value=parse(schema,snapshot.value);fallback=value;
    if(!request.fresh||!this.online()||(await this.entries()).some(entry=>entry.command.key===request.cacheKey)){
     if(this.online())this.track(this.refresh(request,schema));return value;
    }
   }}
  if(!this.online())throw new StoreError('offline',t('store.noOfflineCopy'));
  try{return await this.refresh(request,schema);}catch(error){const e=error as {code?:string;message?:string};if(fallback!==undefined&&!(error instanceof StoreError)&&!e.code&&/fetch|network|connection|load failed/i.test(e.message||''))return fallback;throw error;}
 }
 private async refresh<T>(request:ReadRequest,schema:z.ZodType<T>):Promise<T>{
  this.assertActive();const key=request.cacheKey?this.id(request.cacheKey):signature(request);
  const current=this.reading.get(key);if(current)return current as Promise<T>;
  const task=(async()=>{const value=parse(schema,await this.options.transport.read(request.source));this.assertActive();
   if(request.cacheKey){const db=await this.database;const tx=db.transaction(['snapshots','outbox'],'readwrite');
    const pending=await tx.objectStore('outbox').index('scope').getAll(this.scope);this.assertActive();
    if(pending.some(entry=>entry.command.key===request.cacheKey)){const local=await tx.objectStore('snapshots').get(key);await tx.done;return local?parse(schema,local.value):value;}
    const previous=await tx.objectStore('snapshots').get(key),clean=redact(value);this.assertActive();
    await tx.objectStore('snapshots').put({id:key,scope:this.scope,key:request.cacheKey,signature:signature(request),value:clean});await tx.done;this.assertActive();
    if(previous&&JSON.stringify(previous.value)!==JSON.stringify(clean))this.emit(request.cacheKey,'refresh');
   }return value;
  })();this.reading.set(key,task);try{return await task;}finally{this.reading.delete(key);}
 }
 async write<T>(mutation:Mutation,schema:z.ZodType<T>):Promise<T>{
  this.assertActive();if(!this.online())throw new StoreError('offline',t('store.onlineRequired'));
  await this.sync();this.assertActive();if((await this.entries()).length)throw new StoreError('pending',t('store.resolveBeforePublish'));
  this.assertActive();const result=parse(schema,await this.options.transport.write(mutation));this.assertActive();
  // Online-only operations invalidate local reads, never an unacknowledged draft.
  const db=await this.database,tx=db.transaction('snapshots','readwrite');for(const key of await tx.store.index('scope').getAllKeys(this.scope))await tx.store.delete(key);await tx.done;
  this.assertActive();return result;
 }
 async stage<T>(input:DraftCommand,schema:z.ZodType<T>):Promise<T>{
  this.assertActive();const command=parse(queued,input),db=await this.database,tx=db.transaction(['snapshots','outbox'],'readwrite');
  const old=await tx.objectStore('snapshots').get(this.id(command.key));this.assertActive();
  if(!old){await tx.done;throw new StoreError('invalid',t('store.loadBeforeEdit'));}
  const previous=old.value as {revision?:number};if(previous.revision!==command.expectedRevision){await tx.done;throw new StoreError('conflict',t('store.reviewRevision'));}
  const value=parse(schema,{...previous,revision:command.expectedRevision+1,draft:command.draft});
  const entries=await tx.objectStore('outbox').index('scope').getAll(this.scope);this.assertActive();
  if(entries.some(entry=>entry.state!=='pending')){await tx.done;throw new StoreError('conflict',t('store.reviewRevision'));}
  const sequence=Math.max(0,...entries.map(entry=>entry.sequence))+1;
  await tx.objectStore('snapshots').put({...old,value:redact(value)});
  await tx.objectStore('outbox').put({id:crypto.randomUUID(),scope:this.scope,sequence,command,state:'pending'});await tx.done;this.assertActive();this.emit(command.key,'local');
  // A successful local write means durable on this device, not server delivery.
  if(this.online())this.track(this.sync());return value;
 }
 async status():Promise<SyncStatus>{this.assertActive();const rows=await this.entries();return {pending:rows.filter(row=>row.state==='pending').length,conflicts:rows.filter(row=>row.state==='conflict').length,forbidden:rows.filter(row=>row.state==='forbidden').length,lastError:this.lastError};}
 sync():Promise<void>{this.assertActive();if(this.syncing)return this.syncing;const locks=globalThis.navigator?.locks;this.syncing=(async()=>{if(locks)await locks.request('ca-v3-sync:'+this.scope,()=>this.flush(true));else await this.flush(false);})().finally(()=>{this.syncing=undefined;});return this.syncing;}
 // An acquired Web Lock proves an earlier document no longer owns this sync scope.
 // Reclaim its abandoned lease immediately; retain TTL coordination when Web Locks are absent.
 private async claim(id:string,exclusive:boolean){const db=await this.database,tx=db.transaction('outbox','readwrite'),row=await tx.store.get(id);this.assertActive();if(!row||row.state!=='pending'||(!exclusive&&(row.leaseUntil||0)>Date.now())){await tx.done;return undefined;}const leased={...row,lease:crypto.randomUUID(),leaseUntil:Date.now()+60000};await tx.store.put(leased);await tx.done;return leased;}
 private async flush(exclusive:boolean){
  if(!this.online())return;const rows=(await this.entries()).sort((a,b)=>a.sequence-b.sequence);this.assertActive();
  for(const candidate of rows){if(candidate.state!=='pending'||!this.online())break;const row=await this.claim(candidate.id,exclusive);if(!row)break;const command=parse(queued,row.command);
   try{this.assertActive();const response=parse(savedDraft,await this.options.transport.write({kind:'rpc',name:'save_oclm_workspace',args:{p_cong_id:this.options.workspace,p_expected_revision:command.expectedRevision,p_data:command.draft}}));this.assertActive();
    const db=await this.database,tx=db.transaction(['snapshots','outbox'],'readwrite');
    const current=await tx.objectStore('outbox').get(row.id);this.assertActive();if(!current||current.lease!==row.lease){await tx.done;break;}await tx.objectStore('outbox').delete(row.id);const later=await tx.objectStore('outbox').index('scope').getAll(this.scope),snapshot=await tx.objectStore('snapshots').get(this.id(command.key));this.assertActive();
    if(snapshot&&!later.some(entry=>entry.command.key===command.key))await tx.objectStore('snapshots').put({...snapshot,value:redact({...snapshot.value as object,...response})});await tx.done;this.lastError=undefined;this.emit(command.key,'synced');
   }catch(error){this.assertActive();const code=(error as {code?:string}).code,kind=code==='40001'?'conflict':code==='42501'||code==='PGRST301'?'forbidden':undefined;
    this.lastError=kind==='conflict'?t('store.reviewRevision'):kind==='forbidden'?t('store.accessChanged'):t('store.retryLater');
    const db=await this.database,tx=db.transaction('outbox','readwrite'),current=await tx.store.get(row.id);this.assertActive();if(current?.lease===row.lease)await tx.store.put({...current,state:kind||'pending',error:this.lastError,lease:undefined,leaseUntil:undefined});await tx.done;
    if(kind)this.emit(command.key,kind);break;
   }
  }
 }
 close(){this.active=false;this.listeners.clear();}
 async acceptShared<T>(request:ReadRequest,schema:z.ZodType<T>):Promise<T>{
  this.assertActive();this.validateScope(request);if(!request.cacheKey||!this.online())throw new StoreError('offline',t('store.onlineRequired'));if(this.syncing)await this.syncing;
  const value=parse(schema,await this.options.transport.read(request.source));this.assertActive();
  const db=await this.database,tx=db.transaction(['snapshots','outbox'],'readwrite');for(const row of await tx.objectStore('outbox').index('scope').getAll(this.scope))if(row.command.key===request.cacheKey)await tx.objectStore('outbox').delete(row.id);this.assertActive();
  await tx.objectStore('snapshots').put({id:this.id(request.cacheKey),scope:this.scope,key:request.cacheKey,signature:signature(request),value:redact(value)});await tx.done;this.lastError=undefined;this.emit(request.cacheKey,'synced');return value;
 }
 async clear(){this.close();if(!this.databasePromise)return;const db=await this.database,tx=db.transaction(['snapshots','outbox'],'readwrite');for(const name of ['snapshots','outbox'] as const){const store=tx.objectStore(name);for(const key of await store.index('scope').getAllKeys(this.scope))await store.delete(key);}await tx.done;}
}
