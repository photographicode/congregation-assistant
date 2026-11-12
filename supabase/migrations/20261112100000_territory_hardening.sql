-- Territory hardening, 2026-11-12.
-- 1. Members must be signed in with Google, like every Congregation Assistant membership check (ca_google_identity()).
-- 2. The public issue form list is rate limited like the other public links.
-- 3. Quotas so one workspace or one public link cannot fill the database.
-- Needs 20261111090000_territory_manager.sql and 20261112090000_territory_superadmins.sql. Safe to re-run.
-- Down path: re-run 20261112090000_territory_superadmins.sql and the function section of 20261111090000_territory_manager.sql.

create or replace function ca_private.tm_role(p_ws uuid) returns text language sql stable security definer set search_path='' as $$
 select case when ca_private.tm_is_superadmin() then 'admin'
  when auth.uid() is null or not public.ca_google_identity() then null
  else (select m.role from public.tm_members m where m.workspace_id=p_ws and m.email=lower(auth.jwt()->>'email')) end
$$;

create or replace function public.tm_my_workspaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',ca_private.tm_role(w.id)) order by w.name),'[]'::jsonb)
 from public.tm_workspaces w
 where ca_private.tm_is_superadmin()
  or (auth.uid() is not null and public.ca_google_identity() and exists(select 1 from public.tm_members m where m.workspace_id=w.id and m.email=lower(auth.jwt()->>'email')))
$$;

create or replace function public.tm_public_form(p_token text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 perform ca_private.rate_guard('tm_public_form',p_token,120,300,60);
 select * into w from public.tm_workspaces where report_token=p_token;
 if w.id is null then raise exception 'This link is not valid any more. Ask the territory servant for a new one.'; end if;
 return jsonb_build_object('workspace',w.name,'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name) order by number),'[]'::jsonb) from public.tm_territories where workspace_id=w.id));
end $$;

-- Quotas: 1,000 territories and 150 MB of images per workspace.
create or replace function public.tm_save_territory(p_ws uuid,p_id uuid,p_number text,p_name text,p_notes text,p_image text default null,p_thumb text default null,p_map_url text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform ca_private.tm_need(p_ws);
 perform 1 from public.tm_workspaces where id=p_ws for update;
 if exists(select 1 from public.tm_territories where workspace_id=p_ws and number=trim(p_number) and id is distinct from p_id) then
  raise exception 'Territory number % is already used. Choose another.',trim(p_number);
 end if;
 if p_id is null and (select count(*) from public.tm_territories where workspace_id=p_ws)>=1000 then
  raise exception 'This workspace has reached 1,000 territories. Contact support to raise the limit.';
 end if;
 if coalesce(p_image,'')<>'' and (select coalesce(sum(length(coalesce(image,''))+length(coalesce(thumb,''))),0) from public.tm_territories where workspace_id=p_ws and id is distinct from p_id)
   +length(p_image)+length(coalesce(p_thumb,''))>150000000 then
  raise exception 'Image storage for this workspace is full (150 MB). Remove some images or contact support.';
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

-- Quota: 1,000 history records per territory.
create or replace function public.tm_save_assignment(p_territory uuid,p_id uuid,p_publisher text,p_taken date,p_due date,p_returned date) returns uuid language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);result uuid;
begin
 perform ca_private.tm_need(ws);
 if p_taken is null then raise exception 'Enter the date the territory was taken'; end if;
 if p_id is null and (select count(*) from public.tm_assignments where territory_id=p_territory)>=1000 then
  raise exception 'This territory has 1,000 history records already.';
 end if;
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

-- Quota: 100 people per workspace. The last admin cannot be removed or demoted.
create or replace function public.tm_set_member(p_ws uuid,p_email text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare e text=lower(trim(p_email));
begin
 perform ca_private.tm_need(p_ws,true);
 if not ca_private.tm_valid_email(e) then raise exception 'Enter a valid Google account email'; end if;
 if p_role is not null and p_role not in('admin','manager') then raise exception 'Choose admin or manager'; end if;
 perform 1 from public.tm_workspaces where id=p_ws for update;
 if p_role is not null and not exists(select 1 from public.tm_members where workspace_id=p_ws and email=e)
  and (select count(*) from public.tm_members where workspace_id=p_ws)>=100 then
  raise exception 'This workspace has 100 people already. Remove someone first.';
 end if;
 if coalesce(p_role,'')<>'admin' and exists(select 1 from public.tm_members where workspace_id=p_ws and email=e and role='admin')
  and (select count(*) from public.tm_members where workspace_id=p_ws and role='admin')<=1 then
  raise exception 'Keep at least one admin. Add another admin first.';
 end if;
 if p_role is null then delete from public.tm_members where workspace_id=p_ws and email=e;
 else insert into public.tm_members(workspace_id,email,role) values(p_ws,e,p_role) on conflict(workspace_id,email) do update set role=excluded.role;
 end if;
end $$;

-- Quota: 300 open issues per territory, so a shared link cannot be used to flood a territory.
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
 if (select count(*) from public.tm_reports where territory_id=t and resolved_at is null)>=300 then
  raise exception 'This territory has many open issues. Ask the territory servant to review them first.';
 end if;
 insert into public.tm_reports(territory_id,household,details,reporter,lat,lng,accuracy)
 values(t,trim(coalesce(p_household,'')),trim(p_details),trim(coalesce(p_reporter,'')),p_lat,p_lng,p_accuracy);
 return jsonb_build_object('received',true);
end $$;

-- Quota: at most 50 requests an hour and 500 waiting, across everyone.
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
 perform pg_advisory_xact_lock(hashtextextended('tm-application-rate',0));
 if (select count(*) from ca_private.tm_applications where created_at>now()-interval '1 hour')>=50
 or (select count(*) from ca_private.tm_applications where status='pending')>=500 then
  raise exception 'Requests are temporarily busy. Please try again later.';
 end if;
 if exists(select 1 from ca_private.tm_applications where admin_email=e and status='pending') then return jsonb_build_object('received',true); end if;
 insert into ca_private.tm_applications(contact_name,contact_email,admin_email,congregation_name,phone)
 values(trim(p_name),lower(trim(p_contact_email)),e,trim(p_congregation),nullif(trim(coalesce(p_phone,'')),'')) returning id into result;
 return jsonb_build_object('received',true,'reference',result);
end $$;
