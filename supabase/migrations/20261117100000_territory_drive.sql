-- Territory files on Google Drive, 2026-11-17 (owner request): the full map and the congregation's files live in a
-- Google Drive folder per congregation (owned by congregationassistant0@gmail.com, shared view-only by link).
-- The owner pastes the folder link and the full map link in Requests; the admin opens them from the dashboard.
-- Supabase Storage is no longer used: the territory-maps policies, helpers and the empty bucket are removed.
-- Needs 20261117090000_territory_review.sql. Safe to re-run. Down path: 20261117100000_territory_drive.down.sql.

alter table public.tm_workspaces add column if not exists drive_url text check(drive_url is null or (length(drive_url)<=500 and drive_url ~ '^https://(drive|docs)\.google\.com/[^[:space:]]+$'));
alter table public.tm_workspaces add column if not exists full_map_url text check(full_map_url is null or (length(full_map_url)<=500 and full_map_url ~ '^https://(drive|docs)\.google\.com/[^[:space:]]+$'));
alter table public.tm_workspaces drop column if exists full_map_path;

drop function if exists public.tm_set_full_map(uuid,text,text);
-- Owner: the congregation's Drive folder and its full map. A new full map link emails the admin and makes the
-- request ready for use. Empty text clears a link.
create or replace function public.tm_set_drive_links(p_ws uuid,p_folder text,p_full_map text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;folder text=nullif(trim(coalesce(p_folder,'')),'');map text=nullif(trim(coalesce(p_full_map,'')),'');was text;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if (folder is not null and folder !~ '^https://(drive|docs)\.google\.com/[^[:space:]]+$') or (map is not null and map !~ '^https://(drive|docs)\.google\.com/[^[:space:]]+$') then
  raise exception 'Paste Google Drive links (https://drive.google.com/...)';
 end if;
 select full_map_url into was from public.tm_workspaces where id=p_ws;
 update public.tm_workspaces set drive_url=folder,full_map_url=map,
  full_map_name=case when map is null then null else coalesce(full_map_name,'Full map') end,
  full_map_at=case when map is null then null when map is distinct from was then now() else full_map_at end
 where id=p_ws returning * into w;
 if w.id is null then raise exception 'Workspace not found. Refresh the list.'; end if;
 if map is not null and map is distinct from was then
  perform ca_private.tm_admin_mail(p_ws,'tm-full-map:'||p_ws||':'||md5(map),'Your full territory map is ready · '||w.name,
   'Dear brother,'||chr(10)||chr(10)||'The full map of every territory in '||w.name||' is ready.'||chr(10)||chr(10)||
   'Open it here: '||map||chr(10)||
   case when folder is not null then 'All your territory files (cards, boundary, guide): '||folder||chr(10) else '' end||chr(10)||
   'They are also on your dashboard: '||ca_private.tm_ws_link(p_ws)||chr(10)||chr(10)||
   'You can download every card there too, as one PDF or as images in a ZIP file.'||chr(10)||chr(10)||
   'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com');
  if w.request_id is not null then update ca_private.territory_requests set stage=4,status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 end if;
 return jsonb_build_object('drive_url',w.drive_url,'full_map_url',w.full_map_url,'full_map_at',w.full_map_at);
end $$;

create or replace function public.tm_request_workspaces() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'request_id',w.request_id,'review_state',w.review_state,'review_round',w.review_round,
   'cards',(select count(*) from public.tm_territories t where t.workspace_id=w.id and t.image is not null),
   'comments',(select count(*) from public.tm_territories t where t.workspace_id=w.id and t.review_comment<>''),
   'drive_url',w.drive_url,'full_map_url',w.full_map_url,'full_map_name',w.full_map_name,'full_map_at',w.full_map_at)),'[]'::jsonb)
  from public.tm_workspaces w where w.request_id is not null);
end $$;

-- Workspace data: the Drive links replace the Storage path.
create or replace function public.tm_workspace_data(p_ws uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need_read(p_ws);
 return jsonb_build_object(
  'workspace',(select jsonb_build_object('id',w.id,'name',w.name,'due_days',w.due_days,'recent_days',w.recent_days,'report_token',w.report_token,'report_mode',w.report_mode,'languages',to_jsonb(w.languages),
    'review_state',w.review_state,'review_round',w.review_round,'review_sent_at',w.review_sent_at,'approved_at',w.approved_at,
    'drive_url',w.drive_url,'full_map_url',w.full_map_url,'full_map_name',w.full_map_name,'full_map_at',w.full_map_at,
    'stage',(select r.stage from ca_private.territory_requests r where r.id=w.request_id)) from public.tm_workspaces w where w.id=p_ws),
  'role',ca_private.tm_role(p_ws),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('email',email,'role',role) order by role,email),'[]'::jsonb) from public.tm_members where workspace_id=p_ws),
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name,'notes',notes,'thumb',thumb,'has_image',image is not null,'has_boundary',boundary is not null,'map_url',map_url,'share_token',share_token,'updated_at',updated_at,
    'review_comment',review_comment,'review_comment_at',review_comment_at)),'[]'::jsonb) from public.tm_territories where workspace_id=p_ws),
  'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'territory_id',a.territory_id,'publisher',a.publisher,'taken_on',a.taken_on,'due_on',a.due_on,'returned_on',a.returned_on) order by a.taken_on desc),'[]'::jsonb) from public.tm_assignments a join public.tm_territories t on t.id=a.territory_id where t.workspace_id=p_ws),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'territory_id',r.territory_id,'kind',r.kind,'language',r.language,'household',r.household,'details',r.details,'reporter',r.reporter,'lat',r.lat,'lng',r.lng,'accuracy',r.accuracy,'created_at',r.created_at,'resolved_at',r.resolved_at) order by r.created_at desc),'[]'::jsonb) from public.tm_reports r join public.tm_territories t on t.id=r.territory_id where t.workspace_id=p_ws)
 );
end $$;

-- Supabase Storage is not used any more.
do $$ begin
 if exists(select 1 from pg_namespace where nspname='storage') then
  drop policy if exists "territory maps: owners write" on storage.objects;
  drop policy if exists "territory maps: members read" on storage.objects;
  -- Only an empty bucket is removed; Supabase may refuse direct deletes, which is fine (it then stays, unused and private).
  begin
   delete from storage.buckets b where b.id='territory-maps' and not exists(select 1 from storage.objects o where o.bucket_id=b.id);
  exception when others then null;
  end;
 end if;
end $$;
drop function if exists public.tm_map_owner();
drop function if exists public.tm_map_reader(text);

revoke all on function public.tm_set_drive_links(uuid,text,text),public.tm_request_workspaces() from public,anon,authenticated;
grant execute on function public.tm_set_drive_links(uuid,text,text),public.tm_request_workspaces() to authenticated;
