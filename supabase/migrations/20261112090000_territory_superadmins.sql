-- Territory-only owners. These accounts approve territory workspaces and act as admin in every territory
-- workspace, without gaining any Congregation Assistant owner powers. Active main-app owners keep access too.
-- Needs 20261111090000_territory_manager.sql. Additive and safe to re-run.
-- Down path: 20261112090000_territory_superadmins.down.sql.

create table if not exists ca_private.tm_superadmins(
 email text primary key check(email=lower(email)),
 active boolean not null default true,
 added_at timestamptz not null default now()
);
alter table ca_private.tm_superadmins enable row level security;
revoke all on ca_private.tm_superadmins from public,anon,authenticated;
insert into ca_private.tm_superadmins(email) values('congregationassistant0@gmail.com'),('photographicode@gmail.com')
-- do nothing: re-running this file must not re-activate an owner who was switched off.
on conflict(email) do nothing;

-- Google sign-in only, like ca_is_superadmin().
create or replace function ca_private.tm_is_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select public.ca_is_superadmin() or (coalesce(auth.jwt()->'app_metadata'->>'provider'='google',false)
  and exists(select 1 from ca_private.tm_superadmins s where s.active and s.email=lower(auth.jwt()->>'email')))
$$;
revoke all on function ca_private.tm_is_superadmin() from public,anon,authenticated;

create or replace function public.tm_am_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select ca_private.tm_is_superadmin()
$$;
revoke all on function public.tm_am_superadmin() from public,anon,authenticated;
grant execute on function public.tm_am_superadmin() to authenticated;

create or replace function ca_private.tm_role(p_ws uuid) returns text language sql stable security definer set search_path='' as $$
 select case when ca_private.tm_is_superadmin() then 'admin'
  else (select m.role from public.tm_members m where m.workspace_id=p_ws and m.email=lower(auth.jwt()->>'email')) end
$$;

create or replace function public.tm_my_workspaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',ca_private.tm_role(w.id)) order by w.name),'[]'::jsonb)
 from public.tm_workspaces w
 where ca_private.tm_is_superadmin() or exists(select 1 from public.tm_members m where m.workspace_id=w.id and m.email=lower(auth.jwt()->>'email'))
$$;

create or replace function public.tm_owner_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.tm_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return jsonb_build_object(
  'workspaces',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'created_at',w.created_at,
    'admins',(select coalesce(jsonb_agg(m.email order by m.email),'[]'::jsonb) from public.tm_members m where m.workspace_id=w.id and m.role='admin'),
    'territories',(select count(*) from public.tm_territories t where t.workspace_id=w.id)) order by w.created_at desc),'[]'::jsonb) from public.tm_workspaces w),
  'applications',(select coalesce(jsonb_agg(to_jsonb(a)-'reviewed_by' order by a.created_at desc),'[]'::jsonb) from (select * from ca_private.tm_applications order by created_at desc limit 200) a));
end $$;

create or replace function public.tm_create_workspace(p_name text,p_admin_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare e text=lower(trim(p_admin_email));result uuid;
begin
 if not ca_private.tm_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if not ca_private.tm_valid_email(e) then raise exception 'Enter a valid Google account email for the admin'; end if;
 insert into public.tm_workspaces(name) values(trim(p_name)) returning id into result;
 insert into public.tm_members(workspace_id,email,role) values(result,e,'admin');
 perform ca_private.tm_welcome(result,e,trim(p_name));
 return result;
end $$;

create or replace function public.tm_review_application(p_id uuid,p_approve boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r ca_private.tm_applications;ws uuid;
begin
 if not ca_private.tm_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
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
