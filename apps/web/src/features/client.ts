import { createClient } from '@supabase/supabase-js';
import {z} from 'zod';
import publicConfig from '../../../../public-config.json';
import {PlainStore,clearPlainAccount} from '../../../../packages/core/plain-store';
import {plainTransport} from '../../../../packages/core/plain-transport';
import type {Store,StoreEvent} from '../../../../packages/core/store';
export const config=publicConfig;
export const demo=new URLSearchParams(location.search).has('demo');
const sdk=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce',persistSession:!demo,autoRefreshToken:!demo,detectSessionInUrl:!demo}});
// Screens may use the authentication API; data APIs belong to Store adapters.
export const client={auth:sdk.auth};
const transport=plainTransport(sdk),stores=new Map<string,Store>(),listeners=new Set<(event:StoreEvent)=>void>();
let account='';
export function storeFor(workspace:string,roles:string[]=[]):Store {
 const key=JSON.stringify([account,workspace,[...roles].sort()]);const existing=stores.get(key);if(existing)return existing;
 const selected=new PlainStore({account:account||'public',workspace,authorization:[...roles].sort().join(',')||'transient',transport:demo?{read:async()=>{throw Error('The fictional demo never calls the cloud.');},write:async()=>{throw Error('The fictional demo never calls the cloud.');}}:transport});
 selected.subscribe(event=>{for(const listener of listeners)listener(event);});stores.set(key,selected);return selected;
}
export function subscribeStores(listener:(event:StoreEvent)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export async function clearStores(){const previous=[...stores.values()],previousAccount=account;stores.clear();for(const store of previous)store.close();await Promise.all(previous.map(store=>store.clear()));if(previousAccount&&!demo)await clearPlainAccount(previousAccount);}
export function switchStoreAccount(next:string|null){if(account===(next||''))return;void clearStores().catch(()=>{});account=next||'';}
export async function syncStores(){await Promise.all([...stores.values()].map(store=>store.sync()));}
export async function rpc(name:string,args:Record<string,unknown>={}) {
 if(demo)throw Error('The fictional demo never calls the cloud.');
 // Unported RPC contracts are transient: no response or credential is mirrored.
 return storeFor(String(args.p_cong_id||'')).read({source:{kind:'rpc',name,args}},z.any());
}
export async function capabilities(cong:string){try{return await storeFor(cong).read({source:{kind:'rpc',name:'ca_v2_capabilities',args:{p_cong_id:cong}},cacheKey:'capabilities',fresh:true},z.object({schema_version:z.number(),groups:z.boolean(),weekend:z.boolean(),setup:z.boolean(),private:z.boolean()}).passthrough());}catch{return {schema_version:0,groups:false,weekend:false,setup:false,private:false,reason:'Database update required.'};}}
