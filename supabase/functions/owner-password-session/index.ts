// Server-only password login. No password or service key belongs in the browser.
const origin = 'https://photographicode.github.io';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
Deno.serve(async request => {
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return new Response('{}',{status:405,headers});
  const fail=()=>new Response(JSON.stringify({error:'Sign-in failed'}),{status:401,headers});
  try {
    const raw=await request.text();if(raw.length>2048)return fail();
    const {username,password}=JSON.parse(raw);
    if(typeof username!=='string'||username.trim().toLowerCase()!=='superadmin'||typeof password!=='string'||!password.length||password.length>128)return fail();
    const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const email='congregationassistant0@gmail.com';
    const serviceHeaders={'apikey':service,'Authorization':'Bearer '+service,'Content-Type':'application/json'};
    const signIn=()=>fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    let login=await signIn();
    if(!login.ok){
      // Only the privately configured initial password can create the approved owner.
      // Never reset an existing account's password from this endpoint.
      const match=await fetch(url+'/rest/v1/rpc/ca_owner_bootstrap_matches',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_password:password})});
      if(!match.ok||await match.json()!==true)return fail();
      const created=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:serviceHeaders,body:JSON.stringify({email,password,email_confirm:true})});
      if(!created.ok)return fail();
      await fetch(url+'/rest/v1/rpc/ca_consume_owner_bootstrap',{method:'POST',headers:serviceHeaders,body:'{}'});
      login=await signIn();if(!login.ok)return fail();
    }
    const session=await login.json();if(!session.access_token||!session.refresh_token)return fail();
    const approved=await fetch(url+'/rest/v1/rpc/ca_is_superadmin',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'});
    if(!approved.ok||await approved.json()!==true){await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+session.access_token}});return fail();}
    return new Response(JSON.stringify({session:{access_token:session.access_token,refresh_token:session.refresh_token}}),{headers});
  }catch{return fail();}
});
