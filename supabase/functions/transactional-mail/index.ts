/* Server-only delivery through the GoDaddy Professional Email (Titan) mailbox: SMTP over TLS, port 465. No secret or private report is returned to a browser. */
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import nodemailer from 'npm:nodemailer@6.9.16';
// Single file so it can be deployed from the Supabase dashboard. Only the scheduler calls it: browsers are refused.
Deno.serve(async(req:Request)=>{if(req.headers.get('origin'))return new Response('Origin not allowed',{status:403});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!service)return new Response('Worker access required',{status:403});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,service,{auth:{persistSession:false}});
 // The scheduled job sends a secret kept in the database vault; the service-role bearer still works for manual runs.
 if(req.headers.get('authorization')!==`Bearer ${service}`){const {data:ok}=await db.rpc('mail_worker_ok',{p_secret:req.headers.get('x-mail-worker')||''});if(ok!==true)return new Response('Worker access required',{status:403});}
 const user=Deno.env.get('SMTP_USER'),pass=(Deno.env.get('SMTP_PASSWORD')||Deno.env.get('SMPT_PASSWORD')/* the live secret was saved under this spelling */)?.trim(),sender=Deno.env.get('CA_MAIL_SENDER')||user;
 if(!user||!pass||!sender)return Response.json({enabled:false,reason:'Mailbox configuration required'},{status:503});
 const smtp=nodemailer.createTransport({host:Deno.env.get('SMTP_HOST')||'smtpout.secureserver.net',port:Number(Deno.env.get('SMTP_PORT')||465),secure:true,auth:{user,pass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000});
 const {data:jobs,error}=await db.rpc('claim_transactional_mail');if(error)return new Response('Queue unavailable',{status:503});
 let delivered=0,retry=0;
 for(const job of jobs||[]){let id:string|null=null;
  try{const info=await smtp.sendMail({from:{name:'Congregation Assistant',address:sender},to:job.email,replyTo:sender,subject:job.subject,text:job.body});id=info.messageId||'accepted';}
  catch(e){console.error('Mail server refused job',job.id,(e as {code?:string}).code||'');/* Never log addresses, message bodies or credentials. */}
  const {error:finishError}=await db.rpc('finish_transactional_mail',{p_id:job.id,p_lease:job.lease,p_provider_id:id});if(finishError)return new Response('Delivery receipt unavailable',{status:503});if(id)delivered++;else retry++;}
 smtp.close();
 return Response.json({delivered,retry});
});
