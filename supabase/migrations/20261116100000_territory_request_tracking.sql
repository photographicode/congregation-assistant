-- Territory requests, 2026-11-16 (owner request): milestones the congregation can follow on a link, and emails
-- (through ca_private.mail_outbox, sent by the Titan mailbox) when a request is accepted, declined or ready for use.
-- Milestones (stage): 0 received, 1 accepted, 2 territories drawn, 3 cards and full map made, 4 ready for use.
-- Status and stage stay in step: setting either one sets the other. Each email is sent once per request.
-- Needs 20261104130000_audit_followups_territory_requests.sql and onboarding-mail.sql. Safe to re-run.
-- Down path: 20261116100000_territory_request_tracking.down.sql.

alter table ca_private.territory_requests add column if not exists stage integer not null default 0 check(stage between 0 and 4);
alter table ca_private.territory_requests add column if not exists track_token text unique default replace(gen_random_uuid()::text,'-','');
update ca_private.territory_requests set stage=case status when 'done' then 4 when 'in_progress' then 1 else 0 end where stage=0 and status in('done','in_progress');

create or replace function ca_private.territory_request_sync() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status is distinct from old.status and new.stage is not distinct from old.stage then
  new.stage=case new.status when 'new' then 0 when 'in_progress' then least(greatest(old.stage,1),3) when 'done' then 4 else old.stage end;
 elsif new.stage is distinct from old.stage and new.status<>'declined' then
  new.status=case when new.stage=0 then 'new' when new.stage=4 then 'done' else 'in_progress' end;
 end if;
 return new;
end $$;

create or replace function ca_private.territory_request_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare
 track text='https://territory.congregationassistant.com/?territory-track#token='||new.track_token;
 hello text='Dear '||new.contact_name||','||chr(10)||chr(10);
 bye text=chr(10)||chr(10)||'Follow your request here: '||track||chr(10)||chr(10)||'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com';
 kind text;subject text;body text;
begin
 if new.status is not distinct from old.status then return new; end if;
 if new.status='in_progress' then
  kind='accepted';subject='Your territory request is accepted · '||new.congregation_name;
  body=hello||'Thank you for your request for '||new.congregation_name||'. We have accepted it and started the work.'||chr(10)||chr(10)||
   'What happens next:'||chr(10)||'1. We draw the territories from your boundary.'||chr(10)||'2. We make the Territory Map Cards and the full map.'||chr(10)||
   '3. We set everything up and email you when it is ready for use.'||chr(10)||chr(10)||
   'You can see each step on the link below. If we need anything from you, we will write to this address.'||chr(10)||chr(10)||
   'There is no fee. We accept only voluntary donations.';
 elsif new.status='declined' then
  kind='declined';subject='About your territory request · '||new.congregation_name;
  body=hello||'Thank you for your request for '||new.congregation_name||'. We are sorry, but we cannot take it on at this time.'||chr(10)||chr(10)||
   'If something was missing, such as the boundary KML file, you are welcome to send a new request with it:'||chr(10)||
   'https://territory.congregationassistant.com/?request=territory'||chr(10)||chr(10)||
   'For questions, reply to this email.';
 elsif new.status='done' then
  kind='ready';subject='Your territories are ready for use · '||new.congregation_name;
  body=hello||'Good news: the territories for '||new.congregation_name||' are ready for use.'||chr(10)||chr(10)||
   'How to start:'||chr(10)||
   '1. Open https://territory.congregationassistant.com/ and choose Sign in.'||chr(10)||
   '2. Use the congregation''s official Gmail account. It is the first admin and can add other admins and viewers.'||chr(10)||
   '3. Open a territory to assign it, share its card by link, and keep the S-13 record.'||chr(10)||chr(10)||
   'The guide shows every step (PDF):'||chr(10)||'https://territory.congregationassistant.com/app/assets/territory-guide.pdf'||chr(10)||chr(10)||
   'If you asked for printed cards or the full map, we will send the files separately.'||chr(10)||chr(10)||
   'There is no fee. We accept only voluntary donations.';
 else
  return new;
 end if;
 insert into ca_private.mail_outbox(dedupe,email,subject,body) values('territory-request-'||kind||':'||new.id,new.contact_email,subject,body||bye)
 on conflict(dedupe) do nothing;
 return new;
end $$;

drop trigger if exists sync_stage on ca_private.territory_requests;
create trigger sync_stage before update on ca_private.territory_requests for each row execute function ca_private.territory_request_sync();
drop trigger if exists mail_contact on ca_private.territory_requests;
create trigger mail_contact after update of status on ca_private.territory_requests for each row execute function ca_private.territory_request_mail();

-- Owners move a request to a milestone; -1 declines it.
create or replace function public.set_territory_request_stage(p_id uuid,p_stage integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r ca_private.territory_requests;
begin
 if (public.ca_is_superadmin() or ca_private.tm_is_superadmin()) is not true then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if p_stage not between -1 and 4 then raise exception 'Choose a milestone'; end if;
 if p_stage=-1 then update ca_private.territory_requests set status='declined',updated_at=now() where id=p_id returning * into r;
 else update ca_private.territory_requests set stage=p_stage,status=case when status='declined' then case when p_stage=0 then 'new' when p_stage=4 then 'done' else 'in_progress' end else status end,updated_at=now() where id=p_id returning * into r;
 end if;
 if r.id is null then raise exception 'Request not found. Refresh the list.'; end if;
 return jsonb_build_object('status',r.status,'stage',r.stage);
end $$;

-- The congregation's tracking link: milestones only, no contact details or notes.
create or replace function public.territory_request_progress(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r ca_private.territory_requests;
begin
 perform ca_private.rate_guard('territory_request_progress',p_token,60,120,60);
 select * into r from ca_private.territory_requests where track_token=p_token and length(coalesce(p_token,''))>=32;
 if r.id is null then raise exception 'This tracking link is not valid. Check the link in your email.'; end if;
 return jsonb_build_object('congregation',r.congregation_name,'status',r.status,'stage',r.stage,'created_at',r.created_at,'updated_at',r.updated_at);
end $$;

revoke all on function ca_private.territory_request_sync(),ca_private.territory_request_mail() from public,anon,authenticated;
revoke all on function public.set_territory_request_stage(uuid,integer),public.territory_request_progress(text) from public,anon,authenticated;
grant execute on function public.set_territory_request_stage(uuid,integer) to authenticated;
grant execute on function public.territory_request_progress(text) to anon,authenticated;
