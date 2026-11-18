-- Automatic first draft of a territory request. When the request form stores a boundary file, the database asks
-- GitHub to run photographicode/territory-manager's "Automatic territory draft" workflow. That job splits the
-- boundary along roads, numbers the territories, suggests locality names and merges, then saves the draft back as
-- the request file auto-draft.kml (Requests → Open in generator → Import as territories) and emails the owners the
-- names to check and the merges to consider. Nothing is sent to the congregation until an owner does it by hand.
-- Needs 20261116120000_territory_request_one_kml.sql and 20261112120000_titan_mail_worker.sql (pg_net, vault).
-- Safe to run more than once. Down: 20261118100000_territory_auto_draft.down.sql.
--
-- Setup, once, by the owner (nothing secret is in this file):
--  1. GitHub fine-grained token, repository photographicode/territory-manager only, permission Contents: read and write
--     (needed for repository_dispatch). In the SQL Editor:
--       select vault.create_secret('<token>','github_dispatch_token','territory auto-draft dispatch');
--  2. GitHub repository secrets of territory-manager: SUPABASE_ANON_KEY (the public anon key) and TM_AUTO_SECRET, the
--     value of:  select decrypted_secret from vault.decrypted_secrets where name='tm_auto_secret';
create extension if not exists pg_net;

do $$
begin
 if not exists(select 1 from vault.secrets where name='tm_auto_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'tm_auto_secret','territory auto-draft job (GitHub secret TM_AUTO_SECRET)');
 end if;
end $$;

-- One automatic draft per request.
create table if not exists ca_private.tm_auto_drafts(
 request_id uuid primary key references ca_private.territory_requests(id) on delete cascade,
 state text not null default 'queued' check(state in('queued','ready','failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table ca_private.tm_auto_drafts enable row level security;
revoke all on ca_private.tm_auto_drafts from public,anon,authenticated;

create or replace function ca_private.tm_auto_ok(p_secret text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(length(p_secret)>=32 and p_secret=(select decrypted_secret from vault.decrypted_secrets where name='tm_auto_secret'),false)
$$;
revoke all on function ca_private.tm_auto_ok(text) from public,anon,authenticated;

-- The first boundary file of a request starts the job. The draft file itself never does.
create or replace function ca_private.tm_auto_dispatch() returns trigger language plpgsql security definer set search_path='' as $$
declare token text=(select decrypted_secret from vault.decrypted_secrets where name='github_dispatch_token');
begin
 if new.file_name like 'auto-draft%' or token is null then return new; end if;
 insert into ca_private.tm_auto_drafts(request_id) values(new.request_id) on conflict do nothing;
 if not found then return new; end if;
 perform net.http_post(
  url:='https://api.github.com/repos/photographicode/territory-manager/dispatches',
  headers:=jsonb_build_object('Authorization','Bearer '||token,'Accept','application/vnd.github+json',
   'X-GitHub-Api-Version','2022-11-28','User-Agent','congregation-assistant','Content-Type','application/json'),
  body:=jsonb_build_object('event_type','territory-request','client_payload',jsonb_build_object('request_id',new.request_id)),
  timeout_milliseconds:=10000);
 return new;
end $$;
revoke all on function ca_private.tm_auto_dispatch() from public,anon,authenticated;
drop trigger if exists auto_draft on ca_private.territory_request_files;
create trigger auto_draft after insert on ca_private.territory_request_files for each row execute function ca_private.tm_auto_dispatch();

-- For the job: the request's boundary file, or null when there is nothing (left) to draft.
create or replace function public.tm_auto_request(p_secret text,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if not ca_private.tm_auto_ok(p_secret) then raise exception 'Not allowed' using errcode='42501'; end if;
 if not exists(select 1 from ca_private.tm_auto_drafts where request_id=p_request and state='queued') then return null; end if;
 select jsonb_build_object('congregation',q.congregation_name,'name',f.file_name,'data',encode(f.content,'base64')) into r
  from ca_private.territory_request_files f join ca_private.territory_requests q on q.id=f.request_id
  where f.request_id=p_request and f.file_name not like 'auto-draft%' order by f.created_at,f.id limit 1;
 return r;
end $$;
revoke all on function public.tm_auto_request(text,uuid) from public,anon,authenticated;
grant execute on function public.tm_auto_request(text,uuid) to anon;

-- For the job: store the draft (null when it failed) and email the owners the summary.
create or replace function public.tm_auto_draft_save(p_secret text,p_request uuid,p_kml text,p_summary text) returns void language plpgsql security definer set search_path='' as $$
declare cong text; bytes bytea=convert_to(coalesce(p_kml,''),'UTF8'); ok boolean=p_kml is not null; a text;
begin
 if not ca_private.tm_auto_ok(p_secret) then raise exception 'Not allowed' using errcode='42501'; end if;
 select congregation_name into cong from ca_private.territory_requests where id=p_request;
 if cong is null or not exists(select 1 from ca_private.tm_auto_drafts where request_id=p_request and state='queued') then return; end if;
 if ok and octet_length(bytes) not between 1 and 5242880 then
  ok=false; p_summary='The automatic draft was too large to store ('||octet_length(bytes)||' bytes).'||chr(10)||chr(10)||coalesce(p_summary,'');
 end if;
 if ok then
  insert into ca_private.territory_request_files(request_id,file_name,kind,size_bytes,content) values(p_request,'auto-draft.kml','kml',octet_length(bytes),bytes);
 end if;
 update ca_private.tm_auto_drafts set state=case when ok then 'ready' else 'failed' end,updated_at=now() where request_id=p_request;
 for a in select email from ca_private.tm_superadmins loop
  insert into ca_private.mail_outbox(dedupe,email,subject,body) values('tm-auto-draft:'||p_request||':'||a,a,
   case when ok then 'Automatic territory draft ready · ' else 'Automatic territory draft failed · ' end||cong,
   left(coalesce(p_summary,''),60000)||chr(10)||chr(10)||
   case when ok then 'To check it: territory.congregationassistant.com → Requests → '||cong||' → auto-draft.kml → Open in generator → Import as territories. '||
    'Merge or rename there, then send the cards to the admin for review as usual.'
   else 'Open the request in Requests and make the territories in the generator by hand.' end||chr(10)||'Reference: '||p_request)
  on conflict(dedupe) do nothing;
 end loop;
end $$;
revoke all on function public.tm_auto_draft_save(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.tm_auto_draft_save(text,uuid,text,text) to anon;
