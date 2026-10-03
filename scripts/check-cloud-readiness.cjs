/* Read-only public API checks. Never uses server credentials or production records. */
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html','utf8');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync('app-config.js','utf8'),context);
const config=context.window.CA_CONFIG || {};
const active={supabaseUrl:config.supabaseUrl || html.match(/const SUPABASE_URL[^;]*'(https:\/\/[^']+)'/)[1],supabaseAnonKey:config.supabaseAnonKey || html.match(/const SUPABASE_ANON_KEY[^;]*'([^']+)'/)[1]};
async function check(target) {
 const headers={apikey:target.supabaseAnonKey,'Content-Type':'application/json'};
 const output={checkedAt:new Date().toISOString(),project:target.supabaseUrl};
 async function request(path,options={}) {
  try { const r=await fetch(target.supabaseUrl+path,{...options,headers,signal:AbortSignal.timeout(12000)});return {status:r.status,ok:r.ok,data:await r.json()}; }
  catch { return {status:null,ok:false,error:'Connection unavailable'}; }
 }
 const [rpc,auth,privateRead]=await Promise.all([
  request('/rest/v1/rpc/get_oclm_public_snapshot',{method:'POST',body:JSON.stringify({p_token:'00000000-0000-0000-0000-000000000000'})}),
  request('/auth/v1/settings'),
  request('/rest/v1/congregations?select=id&limit=0')
 ]);
 output.publicScheduleRPC={status:rpc.status,available:rpc.status===null?null:rpc.ok,error:rpc.error || null,errorCode:rpc.data?.code || null};
 output.googleProvider={status:auth.status,enabled:auth.ok?auth.data?.external?.google===true:null,error:auth.error || null};
 output.privateTableAccess={status:privateRead.status,anonymousDenied:privateRead.status===null?null:[401,403].includes(privateRead.status),error:privateRead.error || null};
 return output;
}
(async()=>{
 const activeResult=await check(active);
 const next=JSON.parse(fs.readFileSync('supabase/new-project-public.json','utf8'));
 const newResult=next.supabaseUrl===active.supabaseUrl?activeResult:await check(next);
 const applicationURL='https://photographicode.github.io/congregation-assistant/';
 async function landing(url){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(12000)});const html=await response.text();return {url,status:response.status,mentionsApplicationURL:response.ok?html.includes(applicationURL):null};}
  catch{return {url,status:null,mentionsApplicationURL:null,error:'Connection unavailable'};}
 }
 const [originalLanding,previewLanding]=await Promise.all([
  landing('https://photographicode.github.io/Congregation-Assistant_Public/'),
  landing(applicationURL+'public-site-preview/')
 ]);
 const output={active:activeResult,newProject:newResult,websites:{originalLanding,previewLanding}};
 fs.mkdirSync('artifacts/cloud',{recursive:true});fs.writeFileSync('artifacts/cloud/readiness.json',JSON.stringify(output,null,2));
 console.log(JSON.stringify(output));
 if(newResult.privateTableAccess.anonymousDenied===false)throw new Error('New project exposes the private congregation table to anonymous requests.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
