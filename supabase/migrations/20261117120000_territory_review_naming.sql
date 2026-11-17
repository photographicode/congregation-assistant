-- Card review with naming, 2026-11-17 (owner request): one portal for the congregation's admin. While checking the
-- drawn cards they can also suggest each territory's locality name and rename, move, add or remove its landmarks.
-- Sending cards for review from the generator also makes a naming list for the workspace (no separate email: the review
-- email covers it). The admin edits it from the review screen; the owner pulls the names into the generator from
-- Requests, as with any naming link. Sending again keeps what the admin already suggested for the same numbers.
-- The portal is temporary: names and landmarks can be suggested only while the cards wait for the admin's review.
-- Needs 20261116130000_territory_naming_landmarks.sql and 20261117090000_territory_review.sql. Safe to re-run.
-- Down path: 20261117120000_territory_review_naming.down.sql.

alter table ca_private.territory_naming add column if not exists workspace_id uuid references public.tm_workspaces(id) on delete set null;
create index if not exists territory_naming_workspace_idx on ca_private.territory_naming(workspace_id) where workspace_id is not null;

-- Owner: the workspace's naming list, from the territories just sent for review (number, geometry, locality, points).
create or replace function public.tm_review_naming_set(p_ws uuid,p_territories jsonb,p_landmarks_editable boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;made jsonb;fresh uuid;old uuid;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select * into w from public.tm_workspaces where id=p_ws;
 if w.id is null then raise exception 'Workspace not found. Refresh the list.'; end if;
 select id into old from ca_private.territory_naming where workspace_id=p_ws order by created_at desc limit 1;
 -- No request passed: that would send the naming email; the review email tells the admin instead. Checks the territories.
 made=public.create_territory_naming(null,w.name,p_territories,p_landmarks_editable);
 fresh=(made->>'id')::uuid;
 update ca_private.territory_naming set workspace_id=p_ws,request_id=w.request_id where id=fresh;
 if old is not null then
  insert into ca_private.territory_naming_entries(naming_id,number,locality,points,note,submitted_at,updated_at)
   select fresh,e.number,e.locality,e.points,e.note,e.submitted_at,e.updated_at from ca_private.territory_naming_entries e
   where e.naming_id=old and exists(select 1 from jsonb_array_elements(p_territories) t where t->>'number'=e.number);
  delete from ca_private.territory_naming where id=old;
 end if;
 return jsonb_build_object('id',fresh);
end $$;

-- The workspace's admin (or an owner): the naming token for the review screen, only while the cards are in review.
-- The portal is temporary: once the cards are approved it gives nothing, and the workspace is used as normal.
create or replace function public.tm_review_naming(p_ws uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need(p_ws,true);
 if not exists(select 1 from public.tm_workspaces where id=p_ws and review_state='review') then return null; end if;
 return (select token from ca_private.territory_naming where workspace_id=p_ws order by created_at desc limit 1);
end $$;

revoke all on function public.tm_review_naming_set(uuid,jsonb,boolean),public.tm_review_naming(uuid) from public,anon,authenticated;
grant execute on function public.tm_review_naming_set(uuid,jsonb,boolean),public.tm_review_naming(uuid) to authenticated;
