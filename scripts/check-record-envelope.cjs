const assert=require('node:assert/strict');
(async()=>{
 const api=await import('../experiments/record-envelope.mjs');assert.equal(api.productionEnabled,false);
 const key=await api.createFictionalKey(),ctx={workspace:'fictional_a',scope:'reports',record:'sample_1',epoch:1,revision:4};
 const value={name:'Fictional person',hours:0,comments:'Sample only'};
 const sealed=await api.sealFictionalRecord(key,ctx,value);assert(!JSON.stringify(sealed).includes(value.name));assert.deepEqual(await api.openFictionalRecord(key,ctx,sealed),value);
 for(const [field,replacement] of Object.entries({workspace:'fictional_b',scope:'contacts',record:'sample_2',epoch:2,revision:5}))await assert.rejects(api.openFictionalRecord(key,{...ctx,[field]:replacement},sealed),/verification failed/);
 await assert.rejects(api.openFictionalRecord(await api.createFictionalKey(),ctx,sealed),/verification failed/);
 const altered={...sealed,ciphertext:(sealed.ciphertext[0]==='A'?'B':'A')+sealed.ciphertext.slice(1)};await assert.rejects(api.openFictionalRecord(key,ctx,altered),/verification failed/);
 await assert.rejects(api.openFictionalRecord(key,ctx,{...sealed,nonce:'AA'}),/verification failed/);
 await assert.rejects(api.sealFictionalRecord(key,{...ctx,epoch:0},value),/Invalid record context/);
 await assert.rejects(crypto.subtle.exportKey('raw',key));
 const nonces=new Set();for(let i=0;i<100;i++)nonces.add((await api.sealFictionalRecord(key,{...ctx,revision:5+i},value)).nonce);assert.equal(nonces.size,100);
 // AES-256-GCM published zero-key/zero-IV empty-input vector. This tests the primitive, not a group protocol.
 const vectorKey=await crypto.subtle.importKey('raw',new Uint8Array(32),'AES-GCM',false,['encrypt']);
 const tag=await crypto.subtle.encrypt({name:'AES-GCM',iv:new Uint8Array(12),tagLength:128},vectorKey,new Uint8Array());assert.equal(Buffer.from(tag).toString('hex'),'530f8afbc74536b9a963b4f1c4cb738b');
 console.log('PASS disabled fictional encryption experiment: AES-256-GCM vector, non-exportable keys, ciphertext tamper, wrong key, workspace/scope/record/epoch/revision binding');
})().catch(e=>{console.error(e);process.exitCode=1;});
