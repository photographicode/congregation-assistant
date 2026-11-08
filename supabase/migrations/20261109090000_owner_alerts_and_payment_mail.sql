-- Owner alerts and the getting-started letter. Mail is queued in ca_private.mail_outbox and delivered by the
-- transactional-mail worker once a mail provider is configured. Safe to run more than once.

create or replace function ca_private.owner_alert_email() returns text language sql immutable set search_path='' as
$$ select 'congregationassistant0@gmail.com' $$;
revoke all on function ca_private.owner_alert_email() from public,anon,authenticated;

-- 1. Every new workspace or territory-map request alerts the owner. Review happens in the Command centre.
create or replace function ca_private.alert_owner_of_request() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text=case tg_table_name when 'territory_requests' then 'Territory maps' else 'Workspace' end;
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
  chr(10)||'Review it in the Command centre: https://congregationassistant.com/app/'||chr(10)||'Reference: '||new.id)
 on conflict(dedupe) do nothing;
 return new;
end $$;
revoke all on function ca_private.alert_owner_of_request() from public,anon,authenticated;

do $$
begin
 if to_regclass('ca_private.workspace_applications') is not null then
  drop trigger if exists alert_owner on ca_private.workspace_applications;
  create trigger alert_owner after insert on ca_private.workspace_applications for each row execute function ca_private.alert_owner_of_request();
 end if;
 if to_regclass('ca_private.territory_requests') is not null then
  drop trigger if exists alert_owner on ca_private.territory_requests;
  create trigger alert_owner after insert on ca_private.territory_requests for each row execute function ca_private.alert_owner_of_request();
 end if;
end $$;

-- 2. When the owner approves a workspace, the administrator also gets the first steps and how to pay.
create or replace function ca_private.send_getting_started() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and old.status is distinct from 'approved' then
  insert into ca_private.mail_outbox(dedupe,email,subject,body)
  values('application-getting-started:'||new.id,new.admin_email,'Getting started with Congregation Assistant',
   'Dear brothers,'||chr(10)||chr(10)||
   'Your Congregation Assistant workspace for '||new.congregation_name||' is approved. Here is how to begin.'||chr(10)||chr(10)||
   'First steps'||chr(10)||
   '1. Open https://congregationassistant.com/app/ and choose Continue with Google, using '||new.admin_email||'.'||chr(10)||
   '2. Follow the setup guide on Home: meeting days and times, field service groups, then publishers.'||chr(10)||
   '3. In Settings, give overseers their roles: secretary, service overseer, Our Christian Life and Ministry meeting, weekend meeting, duties.'||chr(10)||
   '4. Share each group''s report link with its group overseer. Publishers can then send their monthly report from any phone.'||chr(10)||chr(10)||
   'Payment'||chr(10)||
   'Congregation access is Rs 1,499 a year for the whole congregation. Nothing is charged automatically.'||chr(10)||
   'When online payment is open, the main administrator can pay in Settings > Plan > Pay online (UPI, card or net banking through Razorpay).'||chr(10)||
   'Until then, reply to this email and we will send a payment link.'||chr(10)||chr(10)||
   'Questions: congregationassistant0@gmail.com'||chr(10)||
   'Congregation Assistant is independent and unofficial.')
  on conflict(dedupe) do nothing;
 end if;
 return new;
end $$;
revoke all on function ca_private.send_getting_started() from public,anon,authenticated;

do $$
begin
 if to_regclass('ca_private.workspace_applications') is not null then
  drop trigger if exists getting_started on ca_private.workspace_applications;
  create trigger getting_started after update of status on ca_private.workspace_applications for each row execute function ca_private.send_getting_started();
 end if;
end $$;
