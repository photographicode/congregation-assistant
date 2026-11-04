-- Audit follow-ups from 2026-11-04 and territory-making requests.
-- Needs 20261103090000_public_rate_limits.sql and 20261104120000_security_hardening.sql first.
-- Additive and safe to re-run. Down path: 20261104130000_audit_followups_territory_requests.down.sql.

-- 1. Members read only the congregation's name, status and feature switches.
--    Email, notes, billing and wipe details stay with the owner, through ca_owner_congregations().
create or replace function public.ca_owner_congregations() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'name',c.name,'email',c.email,'status',c.status,'trial_days',c.trial_days,'created_at',c.created_at,
  'payment_date',c.payment_date,'feature_attendance',c.feature_attendance,'feature_emergency_contacts',c.feature_emergency_contacts,
  'feature_oclm',c.feature_oclm,'wipe_requested_at',c.wipe_requested_at) order by c.created_at desc),'[]'::jsonb)
  from (select * from public.congregations order by created_at desc limit 1000) c);
end $$;
revoke all on function public.ca_owner_congregations() from public,anon,authenticated;
grant execute on function public.ca_owner_congregations() to authenticated;
revoke select on public.congregations from anon,authenticated;
grant select(id,name,status,trial_days,created_at,feature_attendance,feature_emergency_contacts,feature_oclm) on public.congregations to authenticated;

-- 2. New report links cover one group or one publisher. Existing links keep working until rotated or revoked.
create or replace function ca_private.report_link_scope() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='report' and new.service_group is null and new.pub_id is null then
  raise exception 'Report links now cover one group. Choose a group and create a link for each.' using errcode='22023';
 end if;
 return new;
end $$;
drop trigger if exists report_link_scope on public.ca_public_links;
create trigger report_link_scope before insert on public.ca_public_links for each row execute function ca_private.report_link_scope();

-- 3. One role list for every patch file, so re-running an older file cannot drop a role.
alter table public.congregation_access drop constraint if exists congregation_access_role_check;
alter table public.congregation_access add constraint congregation_access_role_check
 check(role in('admin','field_service','attendance','oclm','weekend','group_overseer','publisher','attendant','av','cleaning'));

-- 4. Rate limits check the caller's address before counting the token, so random tokens from one address
--    stop adding rows once that address is over its limit. Old windows are purged after two hours.
create or replace function ca_private.rate_hit(p_scope text,p_key text,p_seconds integer) returns integer language plpgsql set search_path='' as $$
declare w timestamptz=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);n integer;
begin
 insert into ca_private.rate_limits as r(bucket,window_start,hits) values(md5(p_scope||':'||coalesce(p_key,'')),w,1)
 on conflict(bucket,window_start) do update set hits=r.hits+1 returning hits into n;
 if random()<0.01 then delete from ca_private.rate_limits where window_start<now()-interval '2 hours'; end if;
 return n;
end $$;
create or replace function ca_private.rate_guard(p_fn text,p_token text,p_token_limit integer,p_ip_limit integer,p_seconds integer) returns void language plpgsql set search_path='' as $$
begin
 if ca_private.rate_hit(p_fn||':ip',ca_private.client_ip(),p_seconds)>p_ip_limit
 or ca_private.rate_hit(p_fn||':token',p_token,p_seconds)>p_token_limit then
  raise exception 'Too many requests. Please wait a minute and try again.' using errcode='PT429';
 end if;
end $$;
revoke all on function ca_private.rate_hit(text,text,integer),ca_private.rate_guard(text,text,integer,integer,integer) from public,anon,authenticated;

-- 5. Territory-making requests. Congregation Assistant manages territories; drawing or splitting new
--    territory maps is a separate service that congregations request here and the owner tracks.
create table if not exists ca_private.territory_requests(
 id uuid primary key default gen_random_uuid(),
 contact_name text not null,
 contact_email text not null,
 congregation_name text not null,
 phone text,
 details text not null,
 status text not null default 'new' check(status in('new','in_progress','done','declined')),
 owner_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists territory_requests_queue_idx on ca_private.territory_requests(status,created_at);
alter table ca_private.territory_requests enable row level security;
revoke all on ca_private.territory_requests from public,anon,authenticated;

create or replace function public.submit_territory_request(p_name text,p_contact_email text,p_congregation text,p_phone text,p_details text,p_website text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
 if coalesce(p_website,'')<>'' then raise exception 'Request could not be sent'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 100
 or p_congregation is null or length(trim(p_congregation)) not between 2 and 150
 or p_contact_email is null or length(p_contact_email)>150 or p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(coalesce(p_phone,''))>30
 or p_details is null or length(trim(p_details)) not between 10 and 2000 then
  raise exception 'Check the form: name, congregation, email and at least a sentence about what you need';
 end if;
 if ca_private.rate_hit('submit_territory_request:ip',ca_private.client_ip(),3600)>3 then
  raise exception 'Too many requests. Please wait an hour and try again.' using errcode='PT429';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('territory-request-rate',0));
 if (select count(*) from ca_private.territory_requests where created_at>now()-interval '1 hour')>=50 then
  raise exception 'Requests are temporarily busy. Please try again later.';
 end if;
 insert into ca_private.territory_requests(contact_name,contact_email,congregation_name,phone,details)
 values(trim(p_name),lower(trim(p_contact_email)),trim(p_congregation),nullif(trim(coalesce(p_phone,'')),''),trim(p_details))
 returning id into result_id;
 return jsonb_build_object('received',true,'reference',result_id);
end $$;

create or replace function public.get_territory_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  from (select * from ca_private.territory_requests order by created_at desc limit 500) r);
end $$;

create or replace function public.update_territory_request(p_id uuid,p_status text,p_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if p_status not in('new','in_progress','done','declined') then raise exception 'Choose a valid status'; end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'Keep the note under 2000 characters'; end if;
 -- A null note keeps the saved one; an empty note clears it.
 update ca_private.territory_requests set status=p_status,owner_note=case when p_note is null then owner_note else nullif(trim(p_note),'') end,updated_at=now() where id=p_id;
 if not found then raise exception 'Request not found. Refresh the list.'; end if;
 return jsonb_build_object('status',p_status);
end $$;

revoke all on function public.submit_territory_request(text,text,text,text,text,text),public.get_territory_requests(),public.update_territory_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_territory_request(text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.get_territory_requests(),public.update_territory_request(uuid,text,text) to authenticated;
