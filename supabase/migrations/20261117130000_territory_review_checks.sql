-- Card review checks, 2026-11-17 (owner request): the admin ticks each card that is right, so they see which cards are
-- done and which are not. A tick clears that card's comment; a comment clears its tick. A card saved again after its tick
-- shows as not checked (the app compares updated_at). Checks, like comments, can change only while the cards are in review.
-- Needs 20261117100000_territory_drive.sql (tm_workspace_data). Safe to re-run.
-- Down path: 20261117130000_territory_review_checks.down.sql.

alter table public.tm_territories add column if not exists review_ok_at timestamptz;

-- Admin: tick (or untick) one card while it is in review.
create or replace function public.tm_review_mark(p_territory uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);
begin
 perform ca_private.tm_need(ws,true);
 if (select review_state from public.tm_workspaces where id=ws)<>'review' then raise exception 'These cards are not open for review right now'; end if;
 update public.tm_territories set review_ok_at=case when p_ok then now() end,
  review_comment=case when p_ok then '' else review_comment end,review_comment_at=case when p_ok then null else review_comment_at end where id=p_territory;
end $$;

-- Admin: a comment on one card while it is in review. An empty comment removes it; a comment removes the card's tick.
create or replace function public.tm_review_comment(p_territory uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);c text=trim(coalesce(p_comment,''));
begin
 perform ca_private.tm_need(ws,true);
 if (select review_state from public.tm_workspaces where id=ws)<>'review' then raise exception 'These cards are not open for review right now'; end if;
 if length(c)>1000 then raise exception 'Keep the comment under 1000 characters'; end if;
 update public.tm_territories set review_comment=c,review_comment_at=case when c='' then null else now() end,
  review_ok_at=case when c='' then review_ok_at end where id=p_territory;
end $$;

-- Workspace data, now with each card's tick.
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
    'review_comment',review_comment,'review_comment_at',review_comment_at,'review_ok_at',review_ok_at)),'[]'::jsonb) from public.tm_territories where workspace_id=p_ws),
  'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'territory_id',a.territory_id,'publisher',a.publisher,'taken_on',a.taken_on,'due_on',a.due_on,'returned_on',a.returned_on) order by a.taken_on desc),'[]'::jsonb) from public.tm_assignments a join public.tm_territories t on t.id=a.territory_id where t.workspace_id=p_ws),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'territory_id',r.territory_id,'kind',r.kind,'language',r.language,'household',r.household,'details',r.details,'reporter',r.reporter,'lat',r.lat,'lng',r.lng,'accuracy',r.accuracy,'created_at',r.created_at,'resolved_at',r.resolved_at) order by r.created_at desc),'[]'::jsonb) from public.tm_reports r join public.tm_territories t on t.id=r.territory_id where t.workspace_id=p_ws)
 );
end $$;

revoke all on function public.tm_review_mark(uuid,boolean) from public,anon,authenticated;
grant execute on function public.tm_review_mark(uuid,boolean) to authenticated;
