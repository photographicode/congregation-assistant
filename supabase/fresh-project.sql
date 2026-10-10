-- FRESH PROJECT ONLY. Run in the new project's trusted Supabase SQL Editor.
-- This does not migrate, delete, or modify records in the existing project.
begin;
do $$ begin
 if to_regclass('public.congregations') is not null then
  raise exception 'Fresh-project setup refused: congregations already exists. Use an audited migration.';
 end if;
end $$;
create table public.ca_superadmins(email text primary key check(email=lower(trim(email))),active boolean not null default true);
create table public.congregations(
 id text primary key check(length(id) between 1 and 100),name text not null,
 admin_password text, status text not null default 'trial' check(status in ('trial','active','expired')),
 trial_days integer not null default 30 check(trial_days between 1 and 365),created_at timestamptz not null default now(),
 payment_date date,feature_attendance boolean not null default true,feature_emergency_contacts boolean not null default true,
 feature_oclm boolean not null default true,email text,notes text,wipe_requested_at timestamptz,wipe_device_info text
);
create table public.congregation_access(
 id uuid primary key default gen_random_uuid(),cong_id text not null references public.congregations(id) on delete cascade,
 email text not null check(email=lower(trim(email))),role text not null check(role in ('admin','field_service','attendance','oclm')),
 active boolean not null default true,created_at timestamptz not null default now(),unique(cong_id,email,role)
);
create table public.publishers(
 id text primary key,cong_id text not null references public.congregations(id) on delete cascade,name text not null,
 service_group text,gender text,hope text,dob text,baptized text,is_elder boolean default false,is_ms boolean default false,
 is_rp boolean default false,is_sp boolean default false,is_fm boolean default false,
 phone text,address text,emergency_name text,emergency_relationship text,emergency_phone text,spiritual_status text,family_head_id text,
 unique(id,cong_id), foreign key(family_head_id,cong_id) references public.publishers(id,cong_id) deferrable initially deferred
);
create table public.reports(
 id text primary key,cong_id text not null references public.congregations(id) on delete cascade,pub_id text not null,
 service_year integer not null check(service_year between 1900 and 2200),month integer not null check(month between 0 and 11),
 shared_in_ministry boolean default false,studies integer default 0 check(studies between 0 and 1000),
 hours numeric default 0 check(hours between 0 and 744),comments text,is_ap boolean default false,
 unique(pub_id,service_year,month),foreign key(pub_id,cong_id) references public.publishers(id,cong_id) on delete cascade
);
create table public.meeting_attendance(
 id text primary key,cong_id text not null references public.congregations(id) on delete cascade,
 service_year integer not null check(service_year between 1900 and 2200),month integer not null check(month between 0 and 11),
 w1_mid text default '',w1_end text default '',w2_mid text default '',w2_end text default '',w3_mid text default '',w3_end text default '',
 w4_mid text default '',w4_end text default '',w5_mid text default '',w5_end text default '',unique(cong_id,service_year,month)
);
create table public.group_access(id uuid primary key default gen_random_uuid(),cong_id text not null references public.congregations(id) on delete cascade,service_group text,password text,unique(cong_id,service_group));
create table public.wipe_requests(id uuid primary key default gen_random_uuid(),cong_id text not null references public.congregations(id) on delete cascade,requested_at timestamptz default now(),device_info text);
create table public.ca_oclm_publications(
 cong_id text primary key references public.congregations(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(),snapshot jsonb not null,updated_at timestamptz not null default now()
);
create table public.ca_public_links(
 token uuid primary key default gen_random_uuid(),cong_id text not null references public.congregations(id) on delete cascade,
 kind text not null check(kind in ('report','attendance')),service_group text,pub_id text,
 active boolean not null default true,expires_at timestamptz not null default(now()+interval '1 year'),created_at timestamptz default now(),
 foreign key(pub_id,cong_id) references public.publishers(id,cong_id) on delete cascade
);
create index ca_public_links_cong_idx on public.ca_public_links(cong_id);
create index ca_public_links_publisher_idx on public.ca_public_links(pub_id,cong_id);
create index publishers_cong_idx on public.publishers(cong_id);
create index publishers_family_idx on public.publishers(family_head_id,cong_id);
create index reports_cong_period_idx on public.reports(cong_id,service_year,month);
create index reports_publisher_cong_idx on public.reports(pub_id,cong_id);
create index wipe_requests_cong_idx on public.wipe_requests(cong_id);
create index congregation_access_email_idx on public.congregation_access(email,cong_id) where active;
create function public.ca_google_identity() returns boolean language sql stable set search_path='' as $$
 select coalesce(auth.jwt()->'app_metadata'->>'provider'='google' or (auth.jwt()->'app_metadata'->'providers') ? 'google',false)
 and auth.jwt()->>'email' is not null;
$$;
create function public.ca_is_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ca_superadmins a where a.active and a.email=lower(auth.jwt()->>'email')
 and (public.ca_google_identity() or (auth.jwt()->'app_metadata'->>'provider'='email' and exists(
 select 1 from auth.users u where u.id=auth.uid() and lower(u.email)=a.email and u.email_confirmed_at is not null))));
$$;
create function public.ca_has_role(p_cong_id text,p_roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select public.ca_is_superadmin() or (public.ca_google_identity() and exists(
  select 1 from public.congregation_access a join public.congregations c on c.id=a.cong_id
  where a.cong_id=p_cong_id and a.active and a.email=lower(auth.jwt()->>'email') and (a.role='admin' or a.role=any(p_roles))
  and (c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now())));
$$;
create function public.ca_is_congregation_admin(p_cong_id text) returns boolean language sql stable security definer set search_path='' as $$ select public.ca_has_role(p_cong_id,array['admin']); $$;
-- All underlying tables deny anonymous reads and writes. Public links use narrow functions below.
do $$ declare t text; begin
 foreach t in array array['ca_superadmins','congregations','congregation_access','publishers','reports','meeting_attendance','group_access','wipe_requests','ca_oclm_publications','ca_public_links'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create policy superadmins_self on public.ca_superadmins for select to authenticated using((select public.ca_google_identity()) and email=lower((select auth.jwt())->>'email'));
create policy congregations_read on public.congregations for select to authenticated using(public.ca_has_role(id,array['admin','field_service','attendance','oclm']));
create policy congregations_insert on public.congregations for insert to authenticated with check((select public.ca_is_superadmin()));
create policy congregations_update on public.congregations for update to authenticated using((select public.ca_is_superadmin())) with check((select public.ca_is_superadmin()));
create policy congregations_delete on public.congregations for delete to authenticated using((select public.ca_is_superadmin()));
create policy access_read on public.congregation_access for select to authenticated using(public.ca_is_congregation_admin(cong_id) or (select public.ca_google_identity()) and active and email=lower((select auth.jwt())->>'email'));
create policy access_insert on public.congregation_access for insert to authenticated with check(public.ca_is_congregation_admin(cong_id));
create policy access_update on public.congregation_access for update to authenticated using(public.ca_is_congregation_admin(cong_id)) with check(public.ca_is_congregation_admin(cong_id));
create policy access_delete on public.congregation_access for delete to authenticated using(public.ca_is_congregation_admin(cong_id));
create policy publishers_manage on public.publishers for all to authenticated using(public.ca_has_role(cong_id,array['field_service'])) with check(public.ca_has_role(cong_id,array['field_service']));
create policy reports_manage on public.reports for all to authenticated using(public.ca_has_role(cong_id,array['field_service'])) with check(public.ca_has_role(cong_id,array['field_service']));
create policy attendance_manage on public.meeting_attendance for all to authenticated using(public.ca_has_role(cong_id,array['attendance'])) with check(public.ca_has_role(cong_id,array['attendance']));
create policy group_access_manage on public.group_access for all to authenticated using(public.ca_is_congregation_admin(cong_id)) with check(public.ca_is_congregation_admin(cong_id));
create policy wipe_manage on public.wipe_requests for all to authenticated using(public.ca_is_congregation_admin(cong_id)) with check(public.ca_is_congregation_admin(cong_id));
create policy publications_manage on public.ca_oclm_publications for all to authenticated using(public.ca_has_role(cong_id,array['oclm'])) with check(public.ca_has_role(cong_id,array['oclm']));
create policy links_manage on public.ca_public_links for all to authenticated using(public.ca_is_congregation_admin(cong_id)) with check(public.ca_is_congregation_admin(cong_id));
create function public.provision_congregation(p_cong jsonb,p_admin_email text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare c public.congregations;
 begin
 if not public.ca_is_superadmin() then raise exception 'Superadmin access required' using errcode='42501';end if;
 if p_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Administrator email required';end if;
 insert into public.congregations(id,name,trial_days,payment_date,email,notes,feature_attendance,feature_emergency_contacts,feature_oclm)
 values(p_cong->>'id',p_cong->>'name',coalesce((p_cong->>'trial_days')::integer,30),nullif(p_cong->>'payment_date','')::date,lower(trim(p_admin_email)),p_cong->>'notes',coalesce((p_cong->>'feature_attendance')::boolean,true),coalesce((p_cong->>'feature_emergency_contacts')::boolean,true),coalesce((p_cong->>'feature_oclm')::boolean,true)) returning * into c;
 insert into public.congregation_access(cong_id,email,role) values(c.id,lower(trim(p_admin_email)),'admin');
 return to_jsonb(c);
 end $$;
create function public.upsert_oclm_public_snapshot(p_cong_id text,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare outrow public.ca_oclm_publications; clean jsonb; weeks jsonb; assignments jsonb; people jsonb;
 begin
 if not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'Approved scheduler account required' using errcode='42501';end if;
 if pg_column_size(p_snapshot)>1048576 then raise exception 'Schedule is too large';end if;
 if p_snapshot->>'kind'='midweek' then
  if p_snapshot->>'v'<>'2' or jsonb_typeof(p_snapshot->'publishedWeeks')<>'array' or jsonb_typeof(p_snapshot->'assignments')<>'object' or jsonb_typeof(p_snapshot->'people')<>'array' then raise exception 'Invalid schedule';end if;
  select coalesce(jsonb_agg(w),'[]') into weeks from jsonb_array_elements_text(p_snapshot->'publishedWeeks') as entries(w) where w ~ '^[0-9]{4}-W[0-9]{2}$';
  select coalesce(jsonb_object_agg(k,v),'{}') into assignments from (
   select week.key k,(select coalesce(jsonb_object_agg(part.key,jsonb_build_object('personId',part.value->>'personId','customTitle',left(part.value->>'customTitle',300))),'{}') from jsonb_each(week.value) part) v
   from jsonb_each(p_snapshot->'assignments') week where weeks ? week.key and jsonb_typeof(week.value)='object') x;
  select coalesce(jsonb_agg(jsonb_build_object('id',p->>'id','name',left(p->>'name',150))),'[]') into people
   from jsonb_array_elements(p_snapshot->'people') p where exists(select 1 from jsonb_each(assignments) w,jsonb_each(w.value) a where a.value->>'personId'=p->>'id');
  clean=jsonb_build_object('v',2,'kind','midweek','congregation',(select name from public.congregations where id=p_cong_id),'defaultWeek',p_snapshot->>'defaultWeek','publishedWeeks',weeks,'assignments',assignments,'people',people,'generatedAt',p_snapshot->'generatedAt');
 else raise exception 'Use the current midweek scheduler to publish';
 end if;
 insert into public.ca_oclm_publications(cong_id,snapshot) values(p_cong_id,clean)
 on conflict(cong_id) do update set snapshot=excluded.snapshot,updated_at=now() returning * into outrow;
 return jsonb_build_object('token',outrow.token,'updated_at',outrow.updated_at);
 end $$;
create function public.get_oclm_public_snapshot(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('snapshot',p.snapshot,'updated_at',p.updated_at) from public.ca_oclm_publications p join public.congregations c on c.id=p.cong_id
 where p.token::text=p_token and (c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now());
$$;
create function public.create_public_link(p_cong_id text,p_kind text,p_group text default null,p_pub_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare t uuid;
 begin
 if p_kind not in ('report','attendance') or not public.ca_has_role(p_cong_id,case when p_kind='report' then array['field_service'] else array['attendance'] end) then raise exception 'Access denied' using errcode='42501';end if;
 insert into public.ca_public_links(cong_id,kind,service_group,pub_id) values(p_cong_id,p_kind,nullif(p_group,''),nullif(p_pub_id,'')) returning token into t;
 return jsonb_build_object('token',t);
 end $$;
create function public.ca_resolve_link(p_token text,p_kind text default null) returns public.ca_public_links language sql stable security definer set search_path='' as $$
 select l from public.ca_public_links l join public.congregations c on c.id=l.cong_id where l.token::text=p_token and l.active and l.expires_at>now() and (p_kind is null or l.kind=p_kind)
 and (c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now());
$$;
create function public.get_public_link_context(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare l public.ca_public_links; pubs jsonb;
 begin
 l=public.ca_resolve_link(p_token);if l.token is null then return null;end if;
 if l.kind='report' then select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'service_group',service_group,'is_rp',is_rp,'is_sp',is_sp,'is_fm',is_fm)),'[]') into pubs
 from public.publishers where cong_id=l.cong_id and (l.service_group is null or service_group=l.service_group) and (l.pub_id is null or id=l.pub_id);end if;
 return jsonb_build_object('cong_id',l.cong_id,'congregation',(select name from public.congregations where id=l.cong_id),'kind',l.kind,'service_group',l.service_group,'publishers',coalesce(pubs,'[]'));
 end $$;
create function public.submit_public_report(p_token text,p_report jsonb) returns boolean language plpgsql security definer set search_path='' as $$
 declare l public.ca_public_links;p public.publishers;y integer;m integer;
 begin
 l=public.ca_resolve_link(p_token,'report');if l.token is null then raise exception 'Invalid or withdrawn report link' using errcode='42501';end if;
 select * into p from public.publishers where id=p_report->>'pub_id' and cong_id=l.cong_id and (l.pub_id is null or id=l.pub_id) and (l.service_group is null or service_group=l.service_group);
 if p.id is null then raise exception 'Publisher is outside this link' using errcode='42501';end if;
 y=(p_report->>'service_year')::integer;m=(p_report->>'month')::integer;
 insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
 values(p.id||'_'||y||'_'||m,l.cong_id,p.id,y,m,coalesce((p_report->>'shared_in_ministry')::boolean,false),coalesce((p_report->>'studies')::integer,0),coalesce((p_report->>'hours')::numeric,0),left(p_report->>'comments',2000),coalesce((p_report->>'is_ap')::boolean,false))
 on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap;
 return true;
 end $$;
create function public.get_public_attendance(p_token text,p_year integer,p_month integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare l public.ca_public_links;
 begin l=public.ca_resolve_link(p_token,'attendance');if l.token is null then raise exception 'Invalid attendance link' using errcode='42501';end if;
 return (select to_jsonb(a)-'cong_id' from public.meeting_attendance a where a.cong_id=l.cong_id and a.service_year=p_year and a.month=p_month);
 end $$;
create function public.submit_public_attendance(p_token text,p_year integer,p_month integer,p_changes jsonb) returns boolean language plpgsql security definer set search_path='' as $$
 declare l public.ca_public_links;k text;v text;record_id text;
 begin
 l=public.ca_resolve_link(p_token,'attendance');if l.token is null then raise exception 'Invalid attendance link' using errcode='42501';end if;
 if jsonb_typeof(p_changes)<>'object' or p_changes='{}'::jsonb then raise exception 'Attendance values required';end if;
 record_id=l.cong_id||'_'||p_year||'_'||p_month;
 for k,v in select key,value from jsonb_each_text(p_changes) loop
  if k !~ '^w[1-5]_(mid|end)$' or v !~ '^(\d{1,5}|CA|RC|Memorial)$' then raise exception 'Invalid attendance value';end if;
 end loop;
 insert into public.meeting_attendance(id,cong_id,service_year,month) values(record_id,l.cong_id,p_year,p_month) on conflict(cong_id,service_year,month) do nothing;
 for k,v in select key,value from jsonb_each_text(p_changes) loop
  execute format('update public.meeting_attendance set %I=$1 where cong_id=$2 and service_year=$3 and month=$4',k) using v,l.cong_id,p_year,p_month;
 end loop;
 return true;
 end $$;
-- Function execution is explicit; internal capability resolution is never public.
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('ca_google_identity','ca_is_superadmin','ca_has_role','ca_is_congregation_admin','provision_congregation','upsert_oclm_public_snapshot','get_oclm_public_snapshot','create_public_link','ca_resolve_link','get_public_link_context','submit_public_report','get_public_attendance','submit_public_attendance') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function public.ca_google_identity(),public.ca_is_superadmin(),public.ca_has_role(text,text[]),public.ca_is_congregation_admin(text) to authenticated;
grant execute on function public.provision_congregation(jsonb,text),public.upsert_oclm_public_snapshot(text,jsonb),public.create_public_link(text,text,text,text) to authenticated;
grant execute on function public.get_oclm_public_snapshot(text),public.get_public_link_context(text),public.submit_public_report(text,jsonb),public.get_public_attendance(text,integer,integer),public.submit_public_attendance(text,integer,integer,jsonb) to anon,authenticated;
commit;
-- Trusted editor only. Check the exact Google email before bootstrapping your owner.
-- insert into public.ca_superadmins(email) values ('tester-32239@example.com');
