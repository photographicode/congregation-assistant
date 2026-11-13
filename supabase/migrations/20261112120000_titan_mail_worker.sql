-- Deliver queued mail through the GoDaddy Professional Email (Titan) mailbox support@congregationassistant.com. The Edge Function transactional-mail sends ca_private.mail_outbox
-- over SMTP; pg_cron calls it every 5 minutes with a random secret that lives only in the database vault, so no
-- service key is copied anywhere. Also alerts the owner when a territory workspace request arrives.
-- Safe to run more than once. Down: 20261112120000_titan_mail_worker.down.sql.
create extension if not exists pg_net;

do $$
begin
 if not exists(select 1 from vault.secrets where name='mail_worker_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'mail_worker_secret','transactional-mail cron caller');
 end if;
end $$;

create or replace function public.mail_worker_ok(p_secret text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(length(p_secret)>=32 and p_secret=(select decrypted_secret from vault.decrypted_secrets where name='mail_worker_secret'),false)
$$;
revoke all on function public.mail_worker_ok(text) from public,anon,authenticated;
grant execute on function public.mail_worker_ok(text) to service_role;

-- Territory workspace requests now alert the owner like the other request forms.
create or replace function ca_private.alert_owner_of_request() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text=case tg_table_name when 'territory_requests' then 'Territory maps' when 'tm_applications' then 'Territory workspace' else 'Workspace' end;
 review text=case tg_table_name when 'tm_applications' then 'https://territory.congregationassistant.com/ (Owner panel)' else 'https://congregationassistant.com/app/' end;
 j jsonb=to_jsonb(new);
begin
 insert into ca_private.mail_outbox(dedupe,email,subject,body)
 values('owner-alert:'||tg_table_name||':'||new.id,ca_private.owner_alert_email(),
  'New request: '||kind||' · '||coalesce(j->>'congregation_name','unknown congregation'),
  'A new '||lower(kind)||' request arrived.'||chr(10)||chr(10)||
  'Congregation: '||coalesce(j->>'congregation_name','')||chr(10)||
  'Name: '||coalesce(j->>'contact_name','')||chr(10)||
  'Email: '||coalesce(j->>'contact_email','')||chr(10)||
  case when j ? 'admin_email' then 'Administrator Gmail: '||coalesce(j->>'admin_email','')||chr(10) else '' end||
  case when coalesce(j->>'phone','')<>'' then 'Phone: '||(j->>'phone')||chr(10) else '' end||
  case when coalesce(j->>'details','')<>'' then chr(10)||'Details:'||chr(10)||(j->>'details')||chr(10) else '' end||
  chr(10)||'Review it here: '||review||chr(10)||'Reference: '||new.id)
 on conflict(dedupe) do nothing;
 return new;
end $$;
revoke all on function ca_private.alert_owner_of_request() from public,anon,authenticated;
drop trigger if exists alert_owner on ca_private.tm_applications;
create trigger alert_owner after insert on ca_private.tm_applications for each row execute function ca_private.alert_owner_of_request();

-- Every 5 minutes. The function sends at most 20 messages a run and 250 a day.
select cron.unschedule(jobid) from cron.job where jobname='ca-transactional-mail';
select cron.schedule('ca-transactional-mail','*/5 * * * *',$job$
 select net.http_post(
  url:='https://ejosykrxjvwrhxfnputo.supabase.co/functions/v1/transactional-mail',
  headers:=jsonb_build_object('Content-Type','application/json','x-mail-worker',(select decrypted_secret from vault.decrypted_secrets where name='mail_worker_secret')),
  body:='{}'::jsonb,timeout_milliseconds:=60000)
$job$);
