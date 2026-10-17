import {z} from 'zod';import {openDB} from 'idb';
import {PlainStore} from '../../packages/core/plain-store';
import type {Transport,ReadRequest} from '../../packages/core/store';
async function run(){
 let online=true,writes=0,server={revision:1,draft:{title:'Shared'},publication:null};
 const schema=z.object({revision:z.number(),draft:z.object({title:z.string()}),publication:z.null()});
 const transport:Transport={read:async()=>structuredClone(server),write:async mutation=>{writes++;if(mutation.kind!=='rpc'||mutation.args.p_expected_revision!==server.revision)throw Object.assign(Error('Conflict'),{code:'40001'});server={...server,revision:server.revision+1,draft:mutation.args.p_data as {title:string}};return server;}};
 const options={account:crypto.randomUUID(),workspace:'fixture',authorization:'oclm',transport,online:()=>online};
 const query:ReadRequest={source:{kind:'rpc',name:'get_oclm_workspace',args:{p_cong_id:'fixture'}},cacheKey:'schedule'};
 const store=new PlainStore(options);await store.read(query,schema);online=false;await store.stage({kind:'oclm-draft',key:'schedule',expectedRevision:1,draft:{title:'Offline browser draft'}},schema);store.close();const db=await openDB('ca-v3-plain'),pending=(await db.getAll('outbox')).find(row=>JSON.parse(row.scope)[0]===options.account);await db.put('outbox',{...pending,lease:'closed-document',leaseUntil:Date.now()+60000});db.close();
 const first=new PlainStore(options),second=new PlainStore(options);const reloaded=await first.read(query,schema);online=true;await Promise.all([first.sync(),second.sync()]);
 const results={offlineReload:reloaded.draft.title==='Offline browser draft',parallelSyncOnce:writes===1,abandonedLeaseRecovered:writes===1,synced:(await first.status()).pending===0};
 online=false;await first.stage({kind:'oclm-draft',key:'schedule',expectedRevision:2,draft:{title:'Recovery copy'}},schema);server={...server,revision:3,draft:{title:'Other browser'}};online=true;await first.sync();
 const conflict=(await first.status()).conflicts===1&&(await first.read(query,schema)).draft.title==='Recovery copy';await first.settled();
 const reviewed=(await first.acceptShared(query,schema)).draft.title==='Other browser';await first.clear();second.close();
 return {...results,conflict,reviewed};
}
run().then(value=>{document.getElementById('result')!.textContent=JSON.stringify(value);}).catch(error=>{document.getElementById('result')!.textContent=JSON.stringify({error:error.message});});
