import type {z} from 'zod';
export type Filter={column:string;op:'eq'|'is';value:unknown};
type Source={kind:'rpc';name:string;args:Record<string,unknown>}|{kind:'table';name:string;columns:string;filters?:Filter[];order?:string;ascending?:boolean;offset?:number;limit?:number};
export type Mutation={kind:'rpc';name:string;args:Record<string,unknown>}|{kind:'upsert'|'update';name:string;value:Record<string,unknown>;conflict?:string;filters?:Filter[]};
export type ReadRequest={source:Source;cacheKey?:string;fresh?:boolean};
export type DraftCommand={kind:'oclm-draft';key:'schedule';expectedRevision:number;draft:Record<string,unknown>};
export type SyncStatus={pending:number;conflicts:number;forbidden:number;lastError?:string};
export type StoreEvent={key:string;reason:'refresh'|'local'|'synced'|'conflict'|'forbidden'};
export interface Transport {read(source:Source):Promise<unknown>;write(mutation:Mutation):Promise<unknown>}
export interface Store {
 read<T>(request:ReadRequest,schema:z.ZodType<T>):Promise<T>;
 write<T>(mutation:Mutation,schema:z.ZodType<T>):Promise<T>;
 stage<T>(command:DraftCommand,schema:z.ZodType<T>):Promise<T>;
 sync():Promise<void>;
 status():Promise<SyncStatus>;
 subscribe(listener:(event:StoreEvent)=>void):()=>void;
 settled():Promise<void>;
 clear():Promise<void>;
 acceptShared<T>(request:ReadRequest,schema:z.ZodType<T>):Promise<T>;
 close():void;
}
export class StoreError extends Error {constructor(public kind:'offline'|'closed'|'invalid'|'conflict'|'forbidden'|'pending'|'storage'|'retryable',message:string){super(message);}}
