-- Down path for 20261117090000_territory_review.sql. Keeps workspaces, cards and the uploaded maps (bucket and files stay).
-- Afterwards run 20261116090000_territory_viewer_language.sql (tm_workspace_data) and
-- 20261116100000_territory_request_tracking.sql (request emails) again to restore the earlier functions.
do $$ begin
 if exists(select 1 from pg_namespace where nspname='storage') then
  drop policy if exists "territory maps: owners write" on storage.objects;
  drop policy if exists "territory maps: members read" on storage.objects;
 end if;
end $$;
drop function if exists public.tm_map_owner();
drop function if exists public.tm_map_reader(text);
drop trigger if exists make_workspace on ca_private.territory_requests;
drop function if exists ca_private.territory_request_workspace();
drop function if exists public.tm_workspace_for_request(uuid);
drop function if exists public.tm_review_send(uuid);
drop function if exists public.tm_review_comment(uuid,text);
drop function if exists public.tm_review_submit(uuid);
drop function if exists public.tm_review_approve(uuid);
drop function if exists public.tm_set_full_map(uuid,text,text);
drop function if exists public.tm_request_workspaces();
drop function if exists ca_private.tm_request_workspace(uuid);
drop function if exists ca_private.tm_owner_mail(text,text,text);
drop function if exists ca_private.tm_admin_mail(uuid,text,text,text);
drop function if exists ca_private.tm_ws_link(uuid);
drop index if exists public.tm_workspaces_request_idx;
alter table public.tm_territories drop column if exists review_comment, drop column if exists review_comment_at;
alter table public.tm_workspaces drop column if exists request_id, drop column if exists review_state, drop column if exists review_round,
 drop column if exists review_sent_at, drop column if exists approved_at, drop column if exists full_map_path, drop column if exists full_map_name, drop column if exists full_map_at;
