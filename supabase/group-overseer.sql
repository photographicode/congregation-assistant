-- Secure backend only: authenticated group accounts get read-only, exact-group access.
begin;
alter table public.congregation_access add column if not exists service_group text;
alter table public.congregation_access drop constraint if exists congregation_access_role_check;
alter table public.congregation_access add constraint congregation_access_role_check check(role in ('admin','field_service','attendance','oclm','group_overseer'));
alter table public.congregation_access add constraint ca_access_group_required check(role<>'group_overseer' or service_group is not null and length(trim(service_group)) between 1 and 100);
create or replace function public.ca_can_read_group(p_cong_id text,p_group text) returns boolean language sql stable security definer set search_path='' as $$
 select public.ca_google_identity() and public.ca_has_role(p_cong_id,array['group_overseer']) and exists(
  select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email')
   and a.active and a.role='group_overseer' and a.service_group=p_group);
$$;
revoke all on function public.ca_can_read_group(text,text) from public,anon;
grant execute on function public.ca_can_read_group(text,text) to authenticated;
alter policy congregations_read on public.congregations using(public.ca_has_role(id,array['admin','field_service','attendance','oclm','group_overseer']));
create policy publishers_group_read on public.publishers for select to authenticated using(public.ca_can_read_group(cong_id,service_group));
create policy reports_group_read on public.reports for select to authenticated using(exists(select 1 from public.publishers p where p.id=reports.pub_id and p.cong_id=reports.cong_id and public.ca_can_read_group(p.cong_id,p.service_group)));
create or replace function public.create_public_link(p_cong_id text,p_kind text,p_group text default null,p_pub_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare t uuid;
 begin
 if p_kind not in ('report','attendance') then raise exception 'Access denied' using errcode='42501';end if;
 if not public.ca_has_role(p_cong_id,case when p_kind='report' then array['field_service'] else array['attendance'] end) then
  if p_kind<>'report' or p_group is null or not public.ca_can_read_group(p_cong_id,p_group) then raise exception 'Access denied' using errcode='42501';end if;
 end if;
 if p_pub_id is not null and not exists(select 1 from public.publishers p where p.id=p_pub_id and p.cong_id=p_cong_id and (p_group is null or p.service_group=p_group)) then raise exception 'Publisher is outside link scope' using errcode='42501';end if;
 insert into public.ca_public_links(cong_id,kind,service_group,pub_id) values(p_cong_id,p_kind,nullif(p_group,''),nullif(p_pub_id,'')) returning token into t;
 return jsonb_build_object('token',t);
 end $$;
revoke all on function public.create_public_link(text,text,text,text) from public,anon;
grant execute on function public.create_public_link(text,text,text,text) to authenticated;
commit;
