/* Server-only delivery. No secret or private report is returned to a browser. */
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),header=req.headers.get('authorization');
 if(!service||header!==`Bearer ${service}`)return new Response('Worker access required',{status:403});
 const apiKey=Deno.env.get('BREVO_API_KEY'),sender=Deno.env.get('CA_MAIL_SENDER');
 if(!apiKey||!sender)return Response.json({enabled:false,reason:'Verified sender configuration required'},{status:503});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,service,{auth:{persistSession:false}});
 const {data:jobs,error}=await db.rpc('claim_transactional_mail');if(error)return new Response('Queue unavailable',{status:503});
 let delivered=0,retry=0;
 for(const job of jobs||[]){let id=null;try{const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Congregation Assistant',email:sender},to:[{email:job.email}],subject:job.subject,textContent:job.body}),signal:AbortSignal.timeout(15000)});if(response.ok){const result=await response.json();id=result.messageId||null;}}catch{/* Retry without logging addresses, message bodies or credentials. */}const {error:finishError}=await db.rpc('finish_transactional_mail',{p_id:job.id,p_lease:job.lease,p_provider_id:id});if(finishError)return new Response('Delivery receipt unavailable',{status:503});if(id)delivered++;else retry++;}
 return Response.json({delivered,retry});
});
