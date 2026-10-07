-- Review only. Apply after department-drafts.sql. No notifications expose reports or contact details.
begin;
create or replace function public.get_admin_home_tasks(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_week date;missing jsonb;snapshot jsonb;begin
if auth.uid() is null or not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator access required' using errcode='42501';end if;
current_week=date_trunc('week',now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'))::date;
select p.snapshot into snapshot from public.ca_oclm_publications p where cong_id=p_cong_id;
-- Next three full weeks: an empty department-only notice is not an OCLM publication.
select coalesce(jsonb_agg(to_char(current_week+n*7,'IYYY-"W"IW') order by n),'[]') into missing from generate_series(1,3) n where not coalesce(snapshot->'assignments','{}') ? to_char(current_week+n*7,'IYYY-"W"IW');
return jsonb_build_object('publisherCount',(select count(*) from public.publishers where cong_id=p_cong_id and transferred_at is null),'missingScheduleWeeks',missing,'requests',(select coalesce(jsonb_agg(jsonb_build_object('publisherId',p.id,'name',p.name,'department',d.department,'status',d.status,'updatedAt',d.updated_at) order by d.updated_at desc),'[]') from ca_private.department_people d join public.publishers p on p.id=d.publisher_id and p.cong_id=d.cong_id and p.transferred_at is null where d.cong_id=p_cong_id),'attendance',ca_private.current_meeting(p_cong_id));end $$;
revoke all on function public.get_admin_home_tasks(text) from public,anon,authenticated;
grant execute on function public.get_admin_home_tasks(text) to authenticated;
-- Transferring is not deleting: retain previous weeks, revoke upcoming department work.
create or replace function ca_private.revoke_transferred_department_drafts() returns trigger language plpgsql security definer set search_path='' as $$
declare dept text;current_week text;begin
if new.transferred_at is null or old.transferred_at is not null then return new;end if;
select to_char(now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=new.cong_id),'Asia/Kolkata'),'IYYY-"W"IW') into current_week;
for dept in select department from ca_private.department_workspaces where cong_id=new.cong_id order by department loop
perform pg_advisory_xact_lock(hashtextextended('department:'||new.cong_id||':'||dept,0));
update ca_private.department_workspaces w set data=jsonb_set(w.data,'{assignments}',(select coalesce(jsonb_object_agg(week.key,case when week.key<current_week then week.value else (select coalesce(jsonb_object_agg(a.key,case when a.value->>'publisherId'=new.id then jsonb_build_object('personId',null,'publisherId',null,'status','cancelled') else a.value end),'{}') from jsonb_each(week.value) a) end),'{}') from jsonb_each(w.data->'assignments') week)),revision=w.revision+1,updated_at=clock_timestamp(),actor=auth.uid() where cong_id=new.cong_id and department=dept;end loop;return new;end $$;
revoke all on function ca_private.revoke_transferred_department_drafts() from public,anon,authenticated;
drop trigger if exists revoke_transferred_department_drafts on public.publishers;
create trigger revoke_transferred_department_drafts after update of transferred_at on public.publishers for each row execute function ca_private.revoke_transferred_department_drafts();
-- Week rollover changes the public revision even when nobody edits the schedule.
-- This is a read-only projection; it does not rewrite the original publication time.
create or replace function public.get_oclm_public_revision(p_token text) returns timestamptz language sql stable security definer set search_path='' as $$select greatest(p.updated_at,date_trunc('week',now() at time zone coalesce(s.timezone,'Asia/Kolkata')) at time zone coalesce(s.timezone,'Asia/Kolkata')) from public.ca_oclm_publications p join public.congregations c on c.id=p.cong_id left join public.ca_meeting_settings s on s.cong_id=p.cong_id where p.token::text=p_token and(c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now());$$;
create or replace function public.get_oclm_public_snapshot(p_token text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('snapshot',ca_private.noticeboard_snapshot(p.cong_id,p.snapshot),'updated_at',p.updated_at,'revision',public.get_oclm_public_revision(p_token)) from public.ca_oclm_publications p join public.congregations c on c.id=p.cong_id where p.token::text=p_token and(c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now());$$;
revoke all on function public.get_oclm_public_revision(text),public.get_oclm_public_snapshot(text) from public,anon,authenticated;
grant execute on function public.get_oclm_public_revision(text),public.get_oclm_public_snapshot(text) to anon,authenticated;
commit;
