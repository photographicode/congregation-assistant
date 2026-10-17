import 'fake-indexeddb/auto';
import {test,expect,vi} from 'vitest';
import {z} from 'zod';
import {PlainStore,clearPlainAccount} from '../../packages/core/plain-store';
import type {Transport,ReadRequest} from '../../packages/core/store';

const schema=z.object({revision:z.number(),draft:z.object({title:z.string()}),publication:z.unknown().nullable()});
const query:ReadRequest={source:{kind:'rpc',name:'get_oclm_workspace',args:{p_cong_id:'park'}},cacheKey:'schedule'};
function setup(account=crypto.randomUUID(),online=true){
 let connected=online,current={revision:1,draft:{title:'Shared'},publication:null},reads=0,writes=0;
 const transport:Transport={read:async()=>{reads++;return structuredClone(current);},write:async request=>{writes++;if(request.kind!=='rpc')throw Error('Unexpected mutation');if(request.args.p_expected_revision!==current.revision)throw Object.assign(Error('Review the newer shared draft'),{code:'40001'});current={...current,revision:current.revision+1,draft:request.args.p_data as {title:string}};return {revision:current.revision,draft:current.draft};}};
 const store=new PlainStore({account,workspace:'park',authorization:'oclm',transport,online:()=>connected});
 return {account,store,transport,setOnline:(value:boolean)=>{connected=value;},changeServer:()=>{current={...current,revision:2,draft:{title:'Other device'}};},counts:()=>({reads,writes})};
}
const command=(title='Local')=>({kind:'oclm-draft' as const,key:'schedule',expectedRevision:1,draft:{title}});

test('cached read survives reload offline and is isolated by account and authorization',async()=>{
 const a=setup();expect((await a.store.read(query,schema)).draft.title).toBe('Shared');a.store.close();
 const offline=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:a.transport,online:()=>false});
 expect((await offline.read(query,schema)).revision).toBe(1);
 const other=new PlainStore({account:a.account,workspace:'park',authorization:'publisher',transport:a.transport,online:()=>false});
 await expect(other.read(query,schema)).rejects.toMatchObject({kind:'offline'});
 const otherAccount=setup(crypto.randomUUID(),false);await expect(otherAccount.store.read(query,schema)).rejects.toMatchObject({kind:'offline'});await otherAccount.store.clear();
 await offline.clear();other.close();
});
test('local-first refresh emits only changed validated data',async()=>{
 const a=setup();await a.store.read(query,schema);let events=0;const stop=a.store.subscribe(()=>events++);a.changeServer();
 expect((await a.store.read(query,schema)).revision).toBe(1);await a.store.settled();expect((await a.store.read(query,schema)).revision).toBe(2);await a.store.settled();expect(events).toBe(1);stop();await a.store.clear();
});
test('offline draft is durable, wins over stale pull, syncs once and is acknowledged',async()=>{
 const a=setup();await a.store.read(query,schema);a.setOnline(false);
 await a.store.stage(command(),schema);expect((await a.store.read(query,schema)).draft.title).toBe('Local');expect((await a.store.status()).pending).toBe(1);a.store.close();
 const reopened=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:a.transport,online:()=>true});
 await reopened.sync();expect((await reopened.status()).pending).toBe(0);expect(a.counts().writes).toBe(1);expect((await reopened.read(query,schema)).draft.title).toBe('Local');await reopened.clear();
});
test('server conflict keeps local recovery and never overwrites the other device',async()=>{
 const a=setup();await a.store.read(query,schema);a.setOnline(false);await a.store.stage(command(),schema);a.changeServer();a.setOnline(true);await a.store.sync();
 expect(await a.store.status()).toMatchObject({pending:0,conflicts:1});expect((await a.store.read(query,schema)).draft.title).toBe('Local');await a.store.settled();await a.store.sync();expect(a.counts().writes).toBe(1);await a.store.clear();
});
test('clearing an account while a pull is in flight cannot resurrect its records',async()=>{
 let finish!:(value:unknown)=>void;let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});
 const a=setup();const transport:Transport={read:()=>new Promise(resolve=>{finish=resolve;started();}),write:a.transport.write};
 const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport,online:()=>true});const pending=store.read(query,schema);const rejection=expect(pending).rejects.toMatchObject({kind:'closed'});await ready;const cleared=store.clear();finish({revision:1,draft:{title:'Must not return'},publication:null});await cleared;await rejection;
 const offline=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport,online:()=>false});await expect(offline.read(query,schema)).rejects.toMatchObject({kind:'offline'});await offline.clear();
});
test('invalid server data is rejected and cannot poison the local mirror',async()=>{
 const a=setup();const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{...a.transport,read:async()=>({revision:'bad'})},online:()=>true});await expect(store.read(query,schema)).rejects.toMatchObject({kind:'invalid'});await store.clear();
});
test('parallel sync from two tabs sends the revision command once',async()=>{
 vi.stubGlobal('navigator',{});try{
 const a=setup();await a.store.read(query,schema);a.setOnline(false);await a.store.stage(command(),schema);a.setOnline(true);
 const second=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:a.transport,online:()=>true});await Promise.all([a.store.sync(),second.sync()]);expect(a.counts().writes).toBe(1);expect(await a.store.status()).toMatchObject({pending:0,conflicts:0});second.close();await a.store.clear();}finally{vi.unstubAllGlobals();}
});
test('a lost acknowledgement never duplicates a server revision or drops recovery',async()=>{
 const a=setup();let lose=true;const transport:Transport={read:a.transport.read,write:async mutation=>{const value=await a.transport.write(mutation);if(lose){lose=false;throw Error('Connection lost after commit');}return value;}};
 const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport,online:()=>true});await store.read(query,schema);await store.stage(command(),schema);await store.settled();expect((await store.status()).pending).toBe(1);await store.sync();expect((await store.status()).conflicts).toBe(1);expect(a.counts().writes).toBe(2);expect((await store.read(query,schema)).draft.title).toBe('Local');await store.clear();
});
test('failed shared-draft review retains recovery; successful review replaces it atomically',async()=>{
 const a=setup();await a.store.read(query,schema);a.setOnline(false);await a.store.stage(command(),schema);a.changeServer();a.setOnline(true);await a.store.sync();
 const bad=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{...a.transport,read:async()=>{throw Error('Unavailable');}},online:()=>true});await expect(bad.acceptShared(query,schema)).rejects.toThrow('Unavailable');expect((await bad.status()).conflicts).toBe(1);bad.close();
 expect((await a.store.acceptShared(query,schema)).draft.title).toBe('Other device');expect(await a.store.status()).toMatchObject({pending:0,conflicts:0});expect((await a.store.read(query,schema)).draft.title).toBe('Other device');await a.store.clear();
});
test('permission denial stops automatic replay and retains the local draft',async()=>{
 const a=setup();let attempts=0;const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{read:a.transport.read,write:async()=>{attempts++;throw Object.assign(Error('Denied'),{code:'42501'});}},online:()=>true});await store.read(query,schema);await store.stage(command(),schema);await store.settled();await store.sync();expect(attempts).toBe(1);expect((await store.status()).forbidden).toBe(1);expect((await store.read(query,schema)).draft.title).toBe('Local');await store.settled();await store.clear();
});
test('bearer material is never retained in the local mirror',async()=>{
 const a=setup();const transport:Transport={...a.transport,read:async()=>({revision:1,draft:{title:'Shared'},publication:{token:'must-not-persist',version:1}})};const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport,online:()=>true});await store.read(query,schema);store.close();
 const offline=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport,online:()=>false});expect(JSON.stringify(await offline.read(query,schema))).not.toContain('must-not-persist');await offline.clear();
});
test('public transient operations do not need or open IndexedDB',async()=>{
 vi.stubGlobal('indexedDB',undefined);try{const a=setup('public');expect((await a.store.read({source:query.source},schema)).revision).toBe(1);await expect(a.store.read(query,schema)).rejects.toMatchObject({kind:'forbidden'});await a.store.clear();}finally{vi.unstubAllGlobals();}
});
test('a cached read cannot use another workspace projection',async()=>{const a=setup();await expect(a.store.read({...query,source:{kind:'rpc',name:'get_oclm_workspace',args:{p_cong_id:'other'}}},schema)).rejects.toMatchObject({kind:'forbidden'});await a.store.clear();});
test('a pull begun before a local write cannot overwrite that write',async()=>{
 const a=setup();await a.store.read(query,schema);let finish!:(value:unknown)=>void;let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});const store=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{...a.transport,read:()=>new Promise(resolve=>{finish=resolve;started();})},online:()=>true});
 await store.read(query,schema);a.setOnline(false);await a.store.stage(command(),schema);finish({revision:1,draft:{title:'Stale pull'},publication:null});await store.settled();store.close();expect((await a.store.read(query,schema)).draft.title).toBe('Local');await a.store.clear();
});
test('fresh startup uses a validated cache when the network is unreachable, but never on access denial',async()=>{
 const a=setup();await a.store.read(query,schema);a.store.close();
 const network=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{...a.transport,read:async()=>{throw Error('Failed to fetch');}},online:()=>true});expect((await network.read({...query,fresh:true},schema)).revision).toBe(1);network.close();
 const denied=new PlainStore({account:a.account,workspace:'park',authorization:'oclm',transport:{...a.transport,read:async()=>{throw Object.assign(Error('Denied'),{code:'42501'});}},online:()=>true});await expect(denied.read({...query,fresh:true},schema)).rejects.toMatchObject({code:'42501'});await denied.clear();
});
test('account cleanup removes earlier role mirrors without deleting another account',async()=>{
 const a=setup(),b=setup();await a.store.read(query,schema);await b.store.read(query,schema);const role=new PlainStore({account:a.account,workspace:'park',authorization:'admin',transport:a.transport,online:()=>true});await role.read(query,schema);a.store.close();role.close();await clearPlainAccount(a.account);
 const offline=new PlainStore({account:a.account,workspace:'park',authorization:'admin',transport:a.transport,online:()=>false});await expect(offline.read(query,schema)).rejects.toMatchObject({kind:'offline'});b.setOnline(false);expect((await b.store.read(query,schema)).revision).toBe(1);await offline.clear();await b.store.clear();
});
