-- Territory manager: a separate workspace kind that holds only territories.
-- The owner (SuperAdmin) approves requests or creates workspaces; workspace admins add managers.
-- Every table is closed to the API; all reads and writes go through the functions below.
-- Needs 20261103090000_public_rate_limits.sql (rate_guard, rate_hit, client_ip) and onboarding-mail.sql (mail_outbox).
-- Additive and safe to re-run. Down path: 20261111090000_territory_manager.down.sql.

create table if not exists public.tm_workspaces(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 150),
 due_days integer not null default 120 check(due_days between 1 and 3650),
 recent_days integer not null default 90 check(recent_days between 1 and 3650),
 report_token text not null unique default replace(gen_random_uuid()::text,'-',''),
 created_at timestamptz not null default now()
);
create table if not exists public.tm_members(
 workspace_id uuid not null references public.tm_workspaces(id) on delete cascade,
 email text not null check(email=lower(email) and length(email)<=150),
 role text not null check(role in('admin','manager')),
 added_at timestamptz not null default now(),
 primary key(workspace_id,email)
);
create index if not exists tm_members_email_idx on public.tm_members(email);
create table if not exists public.tm_territories(
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.tm_workspaces(id) on delete cascade,
 number text not null check(length(trim(number)) between 1 and 20),
 name text not null check(length(trim(name)) between 1 and 150),
 notes text not null default '' check(length(notes)<=5000),
 -- shortcut: images are compressed WebP/JPEG data URLs in the row (about 150 KB); move to Storage if workspaces outgrow this.
 image text check(image is null or (length(image)<=1500000 and image ~ '^data:image/(webp|jpeg|png);base64,')),
 thumb text check(thumb is null or (length(thumb)<=150000 and thumb ~ '^data:image/(webp|jpeg|png);base64,')),
 share_token text not null unique default replace(gen_random_uuid()::text,'-',''),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workspace_id,number)
);
-- A Google My Maps (or any https map) link that opens in whichever map app the phone has.
alter table public.tm_territories add column if not exists map_url text check(map_url is null or (length(map_url)<=500 and map_url ~ '^https://[^[:space:]]+$'));
create table if not exists public.tm_assignments(
 id uuid primary key default gen_random_uuid(),
 territory_id uuid not null references public.tm_territories(id) on delete cascade,
 publisher text not null check(length(trim(publisher)) between 1 and 120),
 taken_on date not null,
 due_on date not null,
 returned_on date,
 created_at timestamptz not null default now(),
 check(due_on>=taken_on and (returned_on is null or returned_on>=taken_on))
);
create index if not exists tm_assignments_territory_idx on public.tm_assignments(territory_id,taken_on desc);
-- A territory is with at most one publisher at a time.
create unique index if not exists tm_assignments_open_idx on public.tm_assignments(territory_id) where returned_on is null;
create table if not exists public.tm_reports(
 id uuid primary key default gen_random_uuid(),
 territory_id uuid not null references public.tm_territories(id) on delete cascade,
 household text not null default '' check(length(household)<=150),
 details text not null check(length(trim(details)) between 3 and 2000),
 reporter text not null default '' check(length(reporter)<=120),
 lat double precision check(lat between -90 and 90),
 lng double precision check(lng between -180 and 180),
 accuracy real check(accuracy is null or accuracy between 0 and 100000),
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create index if not exists tm_reports_territory_idx on public.tm_reports(territory_id,created_at desc);
create table if not exists ca_private.tm_applications(
 id uuid primary key default gen_random_uuid(),
 contact_name text not null,
 contact_email text not null,
 admin_email text not null,
 congregation_name text not null,
 phone text,
 status text not null default 'pending' check(status in('pending','approved','declined')),
 workspace_id uuid references public.tm_workspaces(id) on delete set null,
 reviewed_by uuid,
 created_at timestamptz not null default now()
);
create index if not exists tm_applications_queue_idx on ca_private.tm_applications(status,created_at);

do $$
declare t text;
begin
 foreach t in array array['tm_workspaces','tm_members','tm_territories','tm_assignments','tm_reports'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
alter table ca_private.tm_applications enable row level security;
revoke all on ca_private.tm_applications from public,anon,authenticated;

-- The caller's role in a workspace: 'admin', 'manager' or null. The owner acts as admin everywhere.
create or replace function ca_private.tm_role(p_ws uuid) returns text language sql stable security definer set search_path='' as $$
 select case when public.ca_is_superadmin() then 'admin'
  else (select m.role from public.tm_members m where m.workspace_id=p_ws and m.email=lower(auth.jwt()->>'email')) end
$$;
create or replace function ca_private.tm_need(p_ws uuid,p_admin boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
declare r text=ca_private.tm_role(p_ws);
begin
 if r is null or (p_admin and r<>'admin') then
  raise exception '%',case when p_admin then 'Only a workspace admin can do this' else 'You do not have access to this territory workspace' end using errcode='42501';
 end if;
end $$;
create or replace function ca_private.tm_workspace_of(p_territory uuid) returns uuid language sql stable security definer set search_path='' as $$
 select workspace_id from public.tm_territories where id=p_territory
$$;
create or replace function ca_private.tm_valid_email(p text) returns boolean language sql immutable set search_path='' as $$
 select p is not null and length(p)<=150 and p ~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$'
$$;
create or replace function ca_private.tm_welcome(p_ws uuid,p_email text,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into ca_private.mail_outbox(dedupe,email,subject,body) values('tm-welcome:'||p_ws||':'||p_email,p_email,'Your territory workspace is ready',
  'Dear brother,'||chr(10)||chr(10)||'The territory workspace for '||p_name||' is ready in Congregation Assistant.'||chr(10)||chr(10)||
  'Open: https://congregationassistant.com/app/?territory'||chr(10)||'Choose Continue with Google and use '||p_email||'. No password is sent by email.'||chr(10)||chr(10)||
  'Add your territories, then give territory managers access under Settings.'||chr(10)||chr(10)||'Warm regards,'||chr(10)||'Congregation Assistant')
 on conflict(dedupe) do nothing;
end $$;

-- Signed-in members --------------------------------------------------------------------------------
create or replace function public.tm_my_workspaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',ca_private.tm_role(w.id)) order by w.name),'[]'::jsonb)
 from public.tm_workspaces w
 where public.ca_is_superadmin() or exists(select 1 from public.tm_members m where m.workspace_id=w.id and m.email=lower(auth.jwt()->>'email'))
$$;

create or replace function public.tm_workspace_data(p_ws uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need(p_ws);
 return jsonb_build_object(
  'workspace',(select jsonb_build_object('id',id,'name',name,'due_days',due_days,'recent_days',recent_days,'report_token',report_token) from public.tm_workspaces where id=p_ws),
  'role',ca_private.tm_role(p_ws),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('email',email,'role',role) order by role,email),'[]'::jsonb) from public.tm_members where workspace_id=p_ws),
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name,'notes',notes,'thumb',thumb,'has_image',image is not null,'map_url',map_url,'share_token',share_token,'updated_at',updated_at)),'[]'::jsonb) from public.tm_territories where workspace_id=p_ws),
  'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'territory_id',a.territory_id,'publisher',a.publisher,'taken_on',a.taken_on,'due_on',a.due_on,'returned_on',a.returned_on) order by a.taken_on desc),'[]'::jsonb) from public.tm_assignments a join public.tm_territories t on t.id=a.territory_id where t.workspace_id=p_ws),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'territory_id',r.territory_id,'household',r.household,'details',r.details,'reporter',r.reporter,'lat',r.lat,'lng',r.lng,'accuracy',r.accuracy,'created_at',r.created_at,'resolved_at',r.resolved_at) order by r.created_at desc),'[]'::jsonb) from public.tm_reports r join public.tm_territories t on t.id=r.territory_id where t.workspace_id=p_ws)
 );
end $$;

create or replace function public.tm_territory_image(p_id uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need(ca_private.tm_workspace_of(p_id));
 return (select image from public.tm_territories where id=p_id);
end $$;

-- p_image: null keeps the saved image, '' removes it.
create or replace function public.tm_save_territory(p_ws uuid,p_id uuid,p_number text,p_name text,p_notes text,p_image text default null,p_thumb text default null,p_map_url text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform ca_private.tm_need(p_ws);
 if exists(select 1 from public.tm_territories where workspace_id=p_ws and number=trim(p_number) and id is distinct from p_id) then
  raise exception 'Territory number % is already used. Choose another.',trim(p_number);
 end if;
 if p_id is null then
  insert into public.tm_territories(workspace_id,number,name,notes,image,thumb,map_url)
  values(p_ws,trim(p_number),trim(p_name),coalesce(p_notes,''),nullif(p_image,''),nullif(p_thumb,''),nullif(trim(p_map_url),'')) returning id into result;
 else
  update public.tm_territories set number=trim(p_number),name=trim(p_name),notes=coalesce(p_notes,''),map_url=nullif(trim(p_map_url),''),
   image=case when p_image is null then image else nullif(p_image,'') end,
   thumb=case when p_image is null then thumb else nullif(p_thumb,'') end,updated_at=now()
  where id=p_id and workspace_id=p_ws returning id into result;
  if result is null then raise exception 'Territory not found. Refresh the list.'; end if;
 end if;
 return result;
end $$;

create or replace function public.tm_delete_territory(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform ca_private.tm_need(ca_private.tm_workspace_of(p_id),true);
 delete from public.tm_territories where id=p_id;
end $$;

-- Add or edit one assignment. A new one without a due date is due after the workspace's due_days.
create or replace function public.tm_save_assignment(p_territory uuid,p_id uuid,p_publisher text,p_taken date,p_due date,p_returned date) returns uuid language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);result uuid;
begin
 perform ca_private.tm_need(ws);
 if p_taken is null then raise exception 'Enter the date the territory was taken'; end if;
 if p_due is null then p_due=p_taken+(select due_days from public.tm_workspaces where id=ws); end if;
 begin
  if p_id is null then
   insert into public.tm_assignments(territory_id,publisher,taken_on,due_on,returned_on) values(p_territory,trim(p_publisher),p_taken,p_due,p_returned) returning id into result;
  else
   update public.tm_assignments set publisher=trim(p_publisher),taken_on=p_taken,due_on=p_due,returned_on=p_returned
   where id=p_id and territory_id=p_territory returning id into result;
   if result is null then raise exception 'Assignment not found. Refresh the list.'; end if;
  end if;
 exception when unique_violation then
  raise exception 'This territory is already with a publisher. Mark it returned first.';
 when check_violation then
  raise exception 'Check the publisher name and dates: due and returned dates cannot be before the taken date.';
 end;
 update public.tm_territories set updated_at=now() where id=p_territory;
 return result;
end $$;

create or replace function public.tm_delete_assignment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare t uuid=(select territory_id from public.tm_assignments where id=p_id);
begin
 perform ca_private.tm_need(ca_private.tm_workspace_of(t));
 delete from public.tm_assignments where id=p_id;
end $$;

create or replace function public.tm_resolve_report(p_id uuid,p_resolved boolean) returns void language plpgsql security definer set search_path='' as $$
declare t uuid=(select territory_id from public.tm_reports where id=p_id);
begin
 perform ca_private.tm_need(ca_private.tm_workspace_of(t));
 update public.tm_reports set resolved_at=case when p_resolved then now() end where id=p_id;
end $$;

create or replace function public.tm_delete_report(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare t uuid=(select territory_id from public.tm_reports where id=p_id);
begin
 perform ca_private.tm_need(ca_private.tm_workspace_of(t));
 delete from public.tm_reports where id=p_id;
end $$;

create or replace function public.tm_save_settings(p_ws uuid,p_name text,p_due_days integer,p_recent_days integer,p_rotate_report_link boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 perform ca_private.tm_need(p_ws,true);
 update public.tm_workspaces set name=trim(p_name),due_days=p_due_days,recent_days=p_recent_days,
  report_token=case when p_rotate_report_link then replace(gen_random_uuid()::text,'-','') else report_token end where id=p_ws;
end $$;

-- p_role null removes the member. The last admin cannot be removed or demoted.
create or replace function public.tm_set_member(p_ws uuid,p_email text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare e text=lower(trim(p_email));
begin
 perform ca_private.tm_need(p_ws,true);
 if not ca_private.tm_valid_email(e) then raise exception 'Enter a valid Google account email'; end if;
 if p_role is not null and p_role not in('admin','manager') then raise exception 'Choose admin or manager'; end if;
 perform 1 from public.tm_workspaces where id=p_ws for update;
 if coalesce(p_role,'')<>'admin' and exists(select 1 from public.tm_members where workspace_id=p_ws and email=e and role='admin')
  and (select count(*) from public.tm_members where workspace_id=p_ws and role='admin')<=1 then
  raise exception 'Keep at least one admin. Add another admin first.';
 end if;
 if p_role is null then delete from public.tm_members where workspace_id=p_ws and email=e;
 else insert into public.tm_members(workspace_id,email,role) values(p_ws,e,p_role) on conflict(workspace_id,email) do update set role=excluded.role;
 end if;
end $$;

-- Owner (SuperAdmin) -------------------------------------------------------------------------------
create or replace function public.tm_owner_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return jsonb_build_object(
  'workspaces',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'created_at',w.created_at,
    'admins',(select coalesce(jsonb_agg(m.email order by m.email),'[]'::jsonb) from public.tm_members m where m.workspace_id=w.id and m.role='admin'),
    'territories',(select count(*) from public.tm_territories t where t.workspace_id=w.id)) order by w.created_at desc),'[]'::jsonb) from public.tm_workspaces w),
  'applications',(select coalesce(jsonb_agg(to_jsonb(a)-'reviewed_by' order by a.created_at desc),'[]'::jsonb) from (select * from ca_private.tm_applications order by created_at desc limit 200) a));
end $$;

create or replace function public.tm_create_workspace(p_name text,p_admin_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare e text=lower(trim(p_admin_email));result uuid;
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if not ca_private.tm_valid_email(e) then raise exception 'Enter a valid Google account email for the admin'; end if;
 insert into public.tm_workspaces(name) values(trim(p_name)) returning id into result;
 insert into public.tm_members(workspace_id,email,role) values(result,e,'admin');
 perform ca_private.tm_welcome(result,e,trim(p_name));
 return result;
end $$;

create or replace function public.tm_review_application(p_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r ca_private.tm_applications;ws uuid;
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select * into r from ca_private.tm_applications where id=p_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'This request has already been reviewed. Refresh the list.'; end if;
 if p_approve is distinct from true then
  update ca_private.tm_applications set status='declined',reviewed_by=auth.uid() where id=p_id;
  return jsonb_build_object('status','declined');
 end if;
 ws=public.tm_create_workspace(r.congregation_name,r.admin_email);
 update ca_private.tm_applications set status='approved',workspace_id=ws,reviewed_by=auth.uid() where id=p_id;
 return jsonb_build_object('status','approved','workspace',ws);
end $$;

-- Public, no sign-in --------------------------------------------------------------------------------
create or replace function public.tm_submit_application(p_name text,p_contact_email text,p_admin_email text,p_congregation text,p_phone text,p_website text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare result uuid;e text=lower(trim(p_admin_email));
begin
 if coalesce(p_website,'')<>'' then raise exception 'Request could not be sent'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 100 or p_congregation is null or length(trim(p_congregation)) not between 2 and 150
 or not ca_private.tm_valid_email(lower(trim(coalesce(p_contact_email,'')))) or not ca_private.tm_valid_email(e) or length(coalesce(p_phone,''))>30 then
  raise exception 'Check your name, congregation, email and the admin Google account';
 end if;
 if ca_private.rate_hit('tm_submit_application:ip',ca_private.client_ip(),3600)>3 then
  raise exception 'Too many requests. Please wait an hour and try again.' using errcode='PT429';
 end if;
 if exists(select 1 from ca_private.tm_applications where admin_email=e and status='pending') then return jsonb_build_object('received',true); end if;
 insert into ca_private.tm_applications(contact_name,contact_email,admin_email,congregation_name,phone)
 values(trim(p_name),lower(trim(p_contact_email)),e,trim(p_congregation),nullif(trim(coalesce(p_phone,'')),'')) returning id into result;
 return jsonb_build_object('received',true,'reference',result);
end $$;

-- The workspace report link lists territory numbers and names so a publisher can pick one.
create or replace function public.tm_public_form(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 select * into w from public.tm_workspaces where report_token=p_token;
 if w.id is null then raise exception 'This link is not valid any more. Ask the territory servant for a new one.'; end if;
 return jsonb_build_object('workspace',w.name,'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name) order by number),'[]'::jsonb) from public.tm_territories where workspace_id=w.id));
end $$;

-- A territory's shared link: the card, its notes and the open issues, so the next publisher is aware.
create or replace function public.tm_public_territory(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tm_territories;
begin
 perform ca_private.rate_guard('tm_public_territory',p_token,120,300,60);
 select * into t from public.tm_territories where share_token=p_token;
 if t.id is null then raise exception 'This territory link is not valid any more. Ask the territory servant for a new one.'; end if;
 return jsonb_build_object('id',t.id,'number',t.number,'name',t.name,'notes',t.notes,'image',t.image,'map_url',t.map_url,
  'workspace',(select name from public.tm_workspaces where id=t.workspace_id),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('household',household,'details',details,'lat',lat,'lng',lng,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.tm_reports where territory_id=t.id and resolved_at is null));
end $$;

-- p_token is the territory share token, or the workspace report token together with p_territory.
create or replace function public.tm_submit_report(p_token text,p_territory uuid,p_household text,p_details text,p_reporter text,p_lat double precision,p_lng double precision,p_accuracy real,p_website text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 if coalesce(p_website,'')<>'' then raise exception 'Report could not be sent'; end if;
 perform ca_private.rate_guard('tm_submit_report',p_token,30,20,3600);
 select id into t from public.tm_territories where share_token=p_token;
 if t is null then
  select tt.id into t from public.tm_territories tt join public.tm_workspaces w on w.id=tt.workspace_id where w.report_token=p_token and tt.id=p_territory;
 end if;
 if t is null then raise exception 'Choose a territory from the list, or ask for a new link.'; end if;
 if p_details is null or length(trim(p_details)) not between 3 and 2000 or length(coalesce(p_household,''))>150 or length(coalesce(p_reporter,''))>120 then
  raise exception 'Describe the issue in 3 to 2000 characters';
 end if;
 if (p_lat is null)<>(p_lng is null) then raise exception 'Location is incomplete. Get the location again.'; end if;
 insert into public.tm_reports(territory_id,household,details,reporter,lat,lng,accuracy)
 values(t,trim(coalesce(p_household,'')),trim(p_details),trim(coalesce(p_reporter,'')),p_lat,p_lng,p_accuracy);
 return jsonb_build_object('received',true);
end $$;

do $$
begin
 if to_regprocedure('ca_private.alert_owner_of_request()') is not null then
  drop trigger if exists alert_owner on ca_private.tm_applications;
  create trigger alert_owner after insert on ca_private.tm_applications for each row execute function ca_private.alert_owner_of_request();
 end if;
end $$;

revoke all on function ca_private.tm_role(uuid),ca_private.tm_need(uuid,boolean),ca_private.tm_workspace_of(uuid),ca_private.tm_valid_email(text),ca_private.tm_welcome(uuid,text,text) from public,anon,authenticated;
revoke all on function public.tm_my_workspaces(),public.tm_workspace_data(uuid),public.tm_territory_image(uuid),
 public.tm_save_territory(uuid,uuid,text,text,text,text,text,text),public.tm_delete_territory(uuid),
 public.tm_save_assignment(uuid,uuid,text,date,date,date),public.tm_delete_assignment(uuid),
 public.tm_resolve_report(uuid,boolean),public.tm_delete_report(uuid),public.tm_save_settings(uuid,text,integer,integer,boolean),
 public.tm_set_member(uuid,text,text),public.tm_owner_overview(),public.tm_create_workspace(text,text),public.tm_review_application(uuid,boolean),
 public.tm_submit_application(text,text,text,text,text,text),public.tm_public_form(text),public.tm_public_territory(text),
 public.tm_submit_report(text,uuid,text,text,text,double precision,double precision,real,text) from public,anon,authenticated;
grant execute on function public.tm_my_workspaces(),public.tm_workspace_data(uuid),public.tm_territory_image(uuid),
 public.tm_save_territory(uuid,uuid,text,text,text,text,text,text),public.tm_delete_territory(uuid),
 public.tm_save_assignment(uuid,uuid,text,date,date,date),public.tm_delete_assignment(uuid),
 public.tm_resolve_report(uuid,boolean),public.tm_delete_report(uuid),public.tm_save_settings(uuid,text,integer,integer,boolean),
 public.tm_set_member(uuid,text,text),public.tm_owner_overview(),public.tm_create_workspace(text,text),public.tm_review_application(uuid,boolean) to authenticated;
grant execute on function public.tm_submit_application(text,text,text,text,text,text),public.tm_public_form(text),public.tm_public_territory(text),
 public.tm_submit_report(text,uuid,text,text,text,double precision,double precision,real,text) to anon,authenticated;
