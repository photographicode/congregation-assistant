/* Public metadata only. No Google secret, owner password or privileged key. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const config=JSON.parse(fs.readFileSync('supabase/new-project-public.json','utf8'));
const clientId='685091883212-8dkkjidlf2ndir4e05roc8kgdtjlo7gg.apps.googleusercontent.com';
(async()=>{
 const response=await fetch(config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:config.supabaseAnonKey},signal:AbortSignal.timeout(15000)});assert(response.ok,'Cannot read public auth settings');const settings=await response.json();assert.equal(settings.external?.google,true,'Google provider remains disabled');
 const url=new URL(config.supabaseUrl+'/auth/v1/authorize');url.searchParams.set('provider','google');url.searchParams.set('redirect_to','https://photographicode.github.io/congregation-assistant/staging/');
 const authorize=await fetch(url,{headers:{apikey:config.supabaseAnonKey},redirect:'manual',signal:AbortSignal.timeout(15000)});assert([302,303].includes(authorize.status),'Google authorization did not redirect');const location=new URL(authorize.headers.get('location'));assert.equal(location.hostname,'accounts.google.com');assert.equal(location.searchParams.get('client_id'),clientId,'Provider has a different Client ID');assert.equal(location.searchParams.get('redirect_uri'),config.supabaseUrl+'/auth/v1/callback','Provider has an unexpected callback');
 console.log('PASS Google provider enabled; intended Client ID and Supabase callback are used');console.log('Google Cloud allowed callback, test-user approval and real sign-in still require interactive verification.');
})().catch(error=>{console.error(error.message);process.exitCode=1});
