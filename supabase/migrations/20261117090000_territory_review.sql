-- Territory card review, 2026-11-17 (owner request).
-- 1. Accepting a request creates its workspace, with the request's contact email as the admin (Google sign-in).
-- 2. The owner saves the cards into it from the generator and sends them for review. Until the admin approves,
--    the workspace opens on a review screen: every card, a comment on any card, then "Send comments" or "Approve all".
-- 3. Once approved the workspace is used as normal (download all cards as ZIP or PDF in the app).
-- 4. The owner uploads the full map (Storage bucket territory-maps); the request becomes "Ready for use" and the admin is emailed.
-- Stage updates name status too (status=status): the request email trigger fires only when status is in the SET list.
-- Emails go through ca_private.mail_outbox. Needs 20261116100000_territory_request_tracking.sql. Safe to re-run.
-- Down path: 20261117090000_territory_review.down.sql.

alter table public.tm_workspaces add column if not exists request_id uuid references ca_private.territory_requests(id) on delete set null;
-- none: no review (workspaces made before this, or by hand). review: waiting for the admin. changes: comments sent back. approved.
alter table public.tm_workspaces add column if not exists review_state text not null default 'none' check(review_state in('none','review','changes','approved'));
alter table public.tm_workspaces add column if not exists review_round integer not null default 0;
alter table public.tm_workspaces add column if not exists review_sent_at timestamptz;
alter table public.tm_workspaces add column if not exists approved_at timestamptz;
alter table public.tm_workspaces add column if not exists full_map_path text check(full_map_path is null or length(full_map_path)<=300);
alter table public.tm_workspaces add column if not exists full_map_name text check(full_map_name is null or length(full_map_name)<=200);
alter table public.tm_workspaces add column if not exists full_map_at timestamptz;
create unique index if not exists tm_workspaces_request_idx on public.tm_workspaces(request_id) where request_id is not null;
alter table public.tm_territories add column if not exists review_comment text not null default '' check(length(review_comment)<=1000);
alter table public.tm_territories add column if not exists review_comment_at timestamptz;

-- Owners: main-app SuperAdmins and territory-only owners.
create or replace function ca_private.tm_owner_mail(p_dedupe text,p_subject text,p_body text) returns void language sql security definer set search_path='' as $$
 insert into ca_private.mail_outbox(dedupe,email,subject,body)
 select p_dedupe||':'||s.email,s.email,p_subject,p_body from ca_private.tm_superadmins s where s.active
 on conflict(dedupe) do nothing
$$;
create or replace function ca_private.tm_admin_mail(p_ws uuid,p_dedupe text,p_subject text,p_body text) returns void language sql security definer set search_path='' as $$
 insert into ca_private.mail_outbox(dedupe,email,subject,body)
 select p_dedupe||':'||m.email,m.email,p_subject,p_body from public.tm_members m where m.workspace_id=p_ws and m.role='admin'
 on conflict(dedupe) do nothing
$$;
create or replace function ca_private.tm_ws_link(p_ws uuid) returns text language sql immutable set search_path='' as $$
 select 'https://territory.congregationassistant.com/?territory&ws='||p_ws
$$;

-- The workspace for a request, made on first use: named after the congregation, its contact email the admin.
create or replace function ca_private.tm_request_workspace(p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare r ca_private.territory_requests;ws uuid;e text;
begin
 select id into ws from public.tm_workspaces where request_id=p_request;
 if ws is not null then return ws; end if;
 select * into r from ca_private.territory_requests where id=p_request;
 e=lower(trim(r.contact_email));
 if r.id is null or not ca_private.tm_valid_email(e) then return null; end if;
 insert into public.tm_workspaces(name,request_id) values(left(trim(r.congregation_name),150),r.id) returning id into ws;
 insert into public.tm_members(workspace_id,email,role) values(ws,e,'admin') on conflict do nothing;
 return ws;
end $$;
create or replace function ca_private.territory_request_workspace() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='in_progress' and old.status is distinct from 'in_progress' then perform ca_private.tm_request_workspace(new.id); end if;
 return new;
end $$;
drop trigger if exists make_workspace on ca_private.territory_requests;
create trigger make_workspace after update of status on ca_private.territory_requests for each row execute function ca_private.territory_request_workspace();

-- Owner: the request's workspace (made now if it is missing, e.g. for requests accepted before this change).
create or replace function public.tm_workspace_for_request(p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare ws uuid;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 ws=ca_private.tm_request_workspace(p_request);
 if ws is null then raise exception 'This request has no valid contact email for the admin'; end if;
 return ws;
end $$;

-- Owner: send the cards in the workspace to its admin for review (again after changes).
create or replace function public.tm_review_send(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;n integer;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select count(*) into n from public.tm_territories where workspace_id=p_ws and image is not null;
 if n=0 then raise exception 'Save the cards into this workspace first (generator: Print, then Send all to the territory manager)'; end if;
 update public.tm_workspaces set review_state='review',review_round=review_round+1,review_sent_at=now() where id=p_ws returning * into w;
 if w.id is null then raise exception 'Workspace not found. Refresh the list.'; end if;
 perform ca_private.tm_admin_mail(p_ws,'tm-review:'||p_ws||':'||w.review_round,
  case when w.review_round=1 then 'Your territory cards are ready to review · ' else 'Your corrected territory cards are ready · ' end||w.name,
  'Dear brother,'||chr(10)||chr(10)||
  case when w.review_round=1 then 'The '||n||' Territory Map Cards for '||w.name||' are ready for you to check.'
   else 'We have made the changes you asked for. The cards for '||w.name||' are ready to check again.' end||chr(10)||chr(10)||
  '1. Open '||ca_private.tm_ws_link(p_ws)||chr(10)||
  '2. Choose Sign in, and use this Google account.'||chr(10)||
  '3. Look at each card. Write a comment on any card that needs a change.'||chr(10)||
  '4. Press "Send comments", or "Approve all cards" when everything is right.'||chr(10)||chr(10)||
  'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com');
 if w.request_id is not null then update ca_private.territory_requests set stage=greatest(stage,2),status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 return jsonb_build_object('review_state',w.review_state,'review_round',w.review_round,'cards',n);
end $$;

-- Admin: a comment on one card while it is in review. An empty comment removes it.
create or replace function public.tm_review_comment(p_territory uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);c text=trim(coalesce(p_comment,''));
begin
 perform ca_private.tm_need(ws,true);
 if (select review_state from public.tm_workspaces where id=ws)<>'review' then raise exception 'These cards are not open for review right now'; end if;
 if length(c)>1000 then raise exception 'Keep the comment under 1000 characters'; end if;
 update public.tm_territories set review_comment=c,review_comment_at=case when c='' then null else now() end where id=p_territory;
end $$;

-- Admin: send the comments to us; the cards come back corrected.
create or replace function public.tm_review_submit(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;n integer;list text;
begin
 perform ca_private.tm_need(p_ws,true);
 select count(*),string_agg(number||': '||review_comment,chr(10) order by number) into n,list from public.tm_territories where workspace_id=p_ws and review_comment<>'';
 if n=0 then raise exception 'Write a comment on the cards that need a change, or approve all cards'; end if;
 update public.tm_workspaces set review_state='changes' where id=p_ws and review_state='review' returning * into w;
 if w.id is null then raise exception 'These cards are not open for review right now'; end if;
 perform ca_private.tm_owner_mail('tm-review-changes:'||p_ws||':'||w.review_round,'Card changes asked · '||w.name,
  w.name||' asked for changes on '||n||' card(s), round '||w.review_round||':'||chr(10)||chr(10)||left(list,6000)||chr(10)||chr(10)||
  'Fix them in the generator, save them into the workspace again, then press "Send for review" in Requests.'||chr(10)||ca_private.tm_ws_link(p_ws));
 return jsonb_build_object('review_state',w.review_state,'comments',n);
end $$;

-- Admin: approve every card. Comments are cleared; the workspace opens as normal.
create or replace function public.tm_review_approve(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 perform ca_private.tm_need(p_ws,true);
 update public.tm_workspaces set review_state='approved',approved_at=now() where id=p_ws and review_state='review' returning * into w;
 if w.id is null then raise exception 'These cards are not open for review right now'; end if;
 update public.tm_territories set review_comment='',review_comment_at=null where workspace_id=p_ws;
 if w.request_id is not null then update ca_private.territory_requests set stage=greatest(stage,3),status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 perform ca_private.tm_owner_mail('tm-review-approved:'||p_ws,'Cards approved · '||w.name,
  w.name||' approved all their territory cards. Next: the full map. Upload it in Requests when it is ready.'||chr(10)||ca_private.tm_ws_link(p_ws));
 return jsonb_build_object('review_state',w.review_state);
end $$;

-- Owner: the full map is uploaded (Storage: territory-maps/<workspace id>/<file>). The request becomes ready for use,
-- which emails the contact (see territory_request_mail); the workspace admins are emailed too.
create or replace function public.tm_set_full_map(p_ws uuid,p_path text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if p_path is null or p_path not like p_ws||'/%' or length(p_path)>300 or p_path ~ '\.\.' then raise exception 'Upload the full map into this workspace''s folder'; end if;
 update public.tm_workspaces set full_map_path=p_path,full_map_name=left(coalesce(nullif(trim(p_name),''),'full-map.pdf'),200),full_map_at=now() where id=p_ws returning * into w;
 if w.id is null then raise exception 'Workspace not found. Refresh the list.'; end if;
 perform ca_private.tm_admin_mail(p_ws,'tm-full-map:'||p_ws||':'||extract(epoch from w.full_map_at)::bigint,'Your full territory map is ready · '||w.name,
  'Dear brother,'||chr(10)||chr(10)||'The full map of every territory in '||w.name||' is ready.'||chr(10)||chr(10)||
  'Open '||ca_private.tm_ws_link(p_ws)||' and sign in with this Google account. Download it from the dashboard, under "Full map".'||chr(10)||chr(10)||
  'You can also download every card there, as one PDF or as images in a ZIP file.'||chr(10)||chr(10)||
  'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com');
 if w.request_id is not null then update ca_private.territory_requests set stage=4,status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 return jsonb_build_object('full_map_at',w.full_map_at);
end $$;

-- Owner Requests list: each request's workspace and review state.
create or replace function public.tm_request_workspaces() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'request_id',w.request_id,'review_state',w.review_state,'review_round',w.review_round,
   'cards',(select count(*) from public.tm_territories t where t.workspace_id=w.id and t.image is not null),
   'comments',(select count(*) from public.tm_territories t where t.workspace_id=w.id and t.review_comment<>''),
   'full_map_name',w.full_map_name,'full_map_at',w.full_map_at)),'[]'::jsonb)
  from public.tm_workspaces w where w.request_id is not null);
end $$;

-- Workspace data, now with the review state, the request's milestone and each card's comment.
create or replace function public.tm_workspace_data(p_ws uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need_read(p_ws);
 return jsonb_build_object(
  'workspace',(select jsonb_build_object('id',w.id,'name',w.name,'due_days',w.due_days,'recent_days',w.recent_days,'report_token',w.report_token,'report_mode',w.report_mode,'languages',to_jsonb(w.languages),
    'review_state',w.review_state,'review_round',w.review_round,'review_sent_at',w.review_sent_at,'approved_at',w.approved_at,
    'full_map_path',w.full_map_path,'full_map_name',w.full_map_name,'full_map_at',w.full_map_at,
    'stage',(select r.stage from ca_private.territory_requests r where r.id=w.request_id)) from public.tm_workspaces w where w.id=p_ws),
  'role',ca_private.tm_role(p_ws),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('email',email,'role',role) order by role,email),'[]'::jsonb) from public.tm_members where workspace_id=p_ws),
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name,'notes',notes,'thumb',thumb,'has_image',image is not null,'has_boundary',boundary is not null,'map_url',map_url,'share_token',share_token,'updated_at',updated_at,
    'review_comment',review_comment,'review_comment_at',review_comment_at)),'[]'::jsonb) from public.tm_territories where workspace_id=p_ws),
  'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'territory_id',a.territory_id,'publisher',a.publisher,'taken_on',a.taken_on,'due_on',a.due_on,'returned_on',a.returned_on) order by a.taken_on desc),'[]'::jsonb) from public.tm_assignments a join public.tm_territories t on t.id=a.territory_id where t.workspace_id=p_ws),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'territory_id',r.territory_id,'kind',r.kind,'language',r.language,'household',r.household,'details',r.details,'reporter',r.reporter,'lat',r.lat,'lng',r.lng,'accuracy',r.accuracy,'created_at',r.created_at,'resolved_at',r.resolved_at) order by r.created_at desc),'[]'::jsonb) from public.tm_reports r join public.tm_territories t on t.id=r.territory_id where t.workspace_id=p_ws)
 );
end $$;

-- Storage policies run as the signed-in user, who cannot use ca_private; these answer only about that user.
create or replace function public.tm_map_owner() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(ca_private.is_territory_owner(),false)
$$;
create or replace function public.tm_map_reader(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(split_part(p_name,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and ca_private.tm_role(split_part(p_name,'/',1)::uuid) is not null,false)
$$;
revoke all on function public.tm_map_owner(),public.tm_map_reader(text) from public,anon,authenticated;
grant execute on function public.tm_map_owner(),public.tm_map_reader(text) to authenticated;

-- Full maps: a private bucket. Owners upload; members of the workspace (the first folder) download.
do $$ begin
 if exists(select 1 from pg_namespace where nspname='storage') then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('territory-maps','territory-maps',false,52428800,array['application/pdf','image/png','image/jpeg'])
  on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
  drop policy if exists "territory maps: owners write" on storage.objects;
  create policy "territory maps: owners write" on storage.objects for all to authenticated
   using(bucket_id='territory-maps' and public.tm_map_owner()) with check(bucket_id='territory-maps' and public.tm_map_owner());
  drop policy if exists "territory maps: members read" on storage.objects;
  create policy "territory maps: members read" on storage.objects for select to authenticated
   using(bucket_id='territory-maps' and public.tm_map_reader(name));
 end if;
end $$;

-- The "ready for use" email now points at the workspace, the card downloads and the full map.
create or replace function ca_private.territory_request_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare
 track text='https://territory.congregationassistant.com/?territory-track#token='||new.track_token;
 hello text='Dear '||new.contact_name||','||chr(10)||chr(10);
 bye text=chr(10)||chr(10)||'Follow your request here: '||track||chr(10)||chr(10)||'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com';
 kind text;subject text;body text;
begin
 if new.status is not distinct from old.status then return new; end if;
 if new.status='in_progress' then
  kind='accepted';subject='Your territory request is accepted · '||new.congregation_name;
  body=hello||'Thank you for your request for '||new.congregation_name||'. We have accepted it and started the work.'||chr(10)||chr(10)||
   'What happens next:'||chr(10)||'1. We draw the territories from your boundary, and you name them on one link.'||chr(10)||
   '2. We make the Territory Map Cards. You check them after signing in with Google as '||new.contact_email||', and approve them or ask for changes.'||chr(10)||
   '3. We make the full map and email you when everything is ready for use.'||chr(10)||chr(10)||
   'You can see each step on the link below. If we need anything from you, we will write to this address.'||chr(10)||chr(10)||
   'There is no fee. We accept only voluntary donations.';
 elsif new.status='declined' then
  kind='declined';subject='About your territory request · '||new.congregation_name;
  body=hello||'Thank you for your request for '||new.congregation_name||'. We are sorry, but we cannot take it on at this time.'||chr(10)||chr(10)||
   'If something was missing, such as the boundary KML file, you are welcome to send a new request with it:'||chr(10)||
   'https://territory.congregationassistant.com/?request=territory'||chr(10)||chr(10)||
   'For questions, reply to this email.';
 elsif new.status='done' then
  kind='ready';subject='Your territories are ready for use · '||new.congregation_name;
  body=hello||'Good news: the territories for '||new.congregation_name||' are ready for use.'||chr(10)||chr(10)||
   'How to start:'||chr(10)||
   '1. Open https://territory.congregationassistant.com/ and choose Sign in.'||chr(10)||
   '2. Use the Google account '||new.contact_email||'. It is the first admin and can add other admins and viewers.'||chr(10)||
   '3. On the dashboard, download every card (one PDF, or images in a ZIP file) and the full map.'||chr(10)||
   '4. Open a territory to assign it, share its card by link, and keep the S-13 record.'||chr(10)||chr(10)||
   'The guide shows every step (PDF):'||chr(10)||'https://territory.congregationassistant.com/app/assets/territory-guide.pdf'||chr(10)||chr(10)||
   'There is no fee. We accept only voluntary donations.';
 else
  return new;
 end if;
 insert into ca_private.mail_outbox(dedupe,email,subject,body) values('territory-request-'||kind||':'||new.id,new.contact_email,subject,body||bye)
 on conflict(dedupe) do nothing;
 return new;
end $$;

revoke all on function ca_private.tm_owner_mail(text,text,text),ca_private.tm_admin_mail(uuid,text,text,text),ca_private.tm_ws_link(uuid),
 ca_private.tm_request_workspace(uuid),ca_private.territory_request_workspace() from public,anon,authenticated;
revoke all on function public.tm_workspace_for_request(uuid),public.tm_review_send(uuid),public.tm_review_comment(uuid,text),public.tm_review_submit(uuid),
 public.tm_review_approve(uuid),public.tm_set_full_map(uuid,text,text),public.tm_request_workspaces() from public,anon,authenticated;
grant execute on function public.tm_workspace_for_request(uuid),public.tm_review_send(uuid),public.tm_review_comment(uuid,text),public.tm_review_submit(uuid),
 public.tm_review_approve(uuid),public.tm_set_full_map(uuid,text,text),public.tm_request_workspaces() to authenticated;
