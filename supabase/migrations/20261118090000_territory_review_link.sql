-- Card review by link, and a simpler request flow (2026-11-18, owner request).
-- 1. The congregation's admin checks the cards from one private link, with no sign-in. The owner can copy the link
--    (Requests, or the import page) and share it by email or WhatsApp; the review email carries it too. The link stays
--    the same for every round, and works only while the cards wait for review (afterwards it shows where things stand).
--    Anyone with the link can tick, comment, send changes or approve, so it is shared only with the admin.
-- 2. A request gets an acknowledgement email as soon as it is sent, with its tracking link.
-- 3. The "accepted" email no longer asks the admin to sign in with Google to check the cards.
-- 4. Approving is refused while a card still has a change written on it (the page already turns the button into
--    "Send changes"; before, approving silently cleared those comments).
-- The signed-in review keeps working as before; its functions now share one body with the link's.
-- Needs 20261117130000_territory_review_checks.sql and 20261117150000_territory_review_wording.sql. Safe to re-run.
-- Down path: 20261118090000_territory_review_link.down.sql.

alter table public.tm_workspaces add column if not exists review_token text unique;

-- The workspace a review link belongs to. Unknown links raise; a short or empty token never matches.
create or replace function ca_private.tm_review_link_ws(p_token text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare ws uuid;
begin
 if p_token is null or length(p_token)<32 then raise exception 'This review link is not valid. Ask us for a new one.'; end if;
 select id into ws from public.tm_workspaces where review_token=p_token;
 if ws is null then raise exception 'This review link is not valid. Ask us for a new one.'; end if;
 return ws;
end $$;

-- The workspace's review link token, made the first time it is needed (two random UUIDs, 244 bits).
create or replace function ca_private.tm_review_token(p_ws uuid) returns text language plpgsql security definer set search_path='' as $$
declare t text;
begin
 update public.tm_workspaces set review_token=coalesce(review_token,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''))
  where id=p_ws returning review_token into t;
 return t;
end $$;

create or replace function ca_private.tm_review_url(p_token text) returns text language sql immutable set search_path='' as $$
 select 'https://territory.congregationassistant.com/?territory-review#token='||p_token
$$;

-- ---- One body for each review action (signed in, or by link) ----------------------------------------------------
create or replace function ca_private.tm_review_open(p_ws uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if (select review_state from public.tm_workspaces where id=p_ws) is distinct from 'review' then raise exception 'These cards are not open for review right now'; end if;
end $$;

create or replace function ca_private.tm_review_mark_do(p_ws uuid,p_territory uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform ca_private.tm_review_open(p_ws);
 update public.tm_territories set review_ok_at=case when p_ok then now() end,
  review_comment=case when p_ok then '' else review_comment end,review_comment_at=case when p_ok then null else review_comment_at end
  where id=p_territory and workspace_id=p_ws;
end $$;

create or replace function ca_private.tm_review_comment_do(p_ws uuid,p_territory uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare c text=trim(coalesce(p_comment,''));
begin
 perform ca_private.tm_review_open(p_ws);
 if length(c)>1000 then raise exception 'Keep the comment under 1000 characters'; end if;
 update public.tm_territories set review_comment=c,review_comment_at=case when c='' then null else now() end,
  review_ok_at=case when c='' then review_ok_at end where id=p_territory and workspace_id=p_ws;
end $$;

create or replace function ca_private.tm_review_submit_do(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;n integer;list text;
begin
 select count(*),string_agg(number||': '||review_comment,chr(10) order by number) into n,list from public.tm_territories where workspace_id=p_ws and review_comment<>'';
 if n=0 then raise exception 'Write a comment on the cards that need a change, or approve all cards'; end if;
 update public.tm_workspaces set review_state='changes' where id=p_ws and review_state='review' returning * into w;
 if w.id is null then raise exception 'These cards are not open for review right now'; end if;
 perform ca_private.tm_owner_mail('tm-review-changes:'||p_ws||':'||w.review_round,'Card changes asked · '||w.name,
  w.name||' asked for changes on '||n||' card(s), round '||w.review_round||':'||chr(10)||chr(10)||left(list,6000)||chr(10)||chr(10)||
  'Fix them in the generator, then use "Save and send for review" again. The admin keeps the same review link.'||chr(10)||ca_private.tm_ws_link(p_ws));
 return jsonb_build_object('review_state',w.review_state,'comments',n);
end $$;

create or replace function ca_private.tm_review_approve_do(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 if exists(select 1 from public.tm_territories where workspace_id=p_ws and review_comment<>'') then
  raise exception 'Some cards still have a change written on them. Send the changes, or clear those comments first.';
 end if;
 update public.tm_workspaces set review_state='approved',approved_at=now() where id=p_ws and review_state='review' returning * into w;
 if w.id is null then raise exception 'These cards are not open for review right now'; end if;
 if w.request_id is not null then update ca_private.territory_requests set stage=greatest(stage,3),status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 perform ca_private.tm_owner_mail('tm-review-approved:'||p_ws,'Cards approved · '||w.name,
  w.name||' approved all their territory cards. Next: the full map. Upload it in Requests when it is ready; that marks the request ready for use and emails them.'||chr(10)||ca_private.tm_ws_link(p_ws));
 return jsonb_build_object('review_state',w.review_state);
end $$;

-- ---- Signed in (admin or owner): same behaviour as before ---------------------------------------------------------
create or replace function public.tm_review_mark(p_territory uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);
begin perform ca_private.tm_need(ws,true);perform ca_private.tm_review_mark_do(ws,p_territory,p_ok); end $$;

create or replace function public.tm_review_comment(p_territory uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_workspace_of(p_territory);
begin perform ca_private.tm_need(ws,true);perform ca_private.tm_review_comment_do(ws,p_territory,p_comment); end $$;

create or replace function public.tm_review_submit(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform ca_private.tm_need(p_ws,true);return ca_private.tm_review_submit_do(p_ws); end $$;

create or replace function public.tm_review_approve(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform ca_private.tm_need(p_ws,true);return ca_private.tm_review_approve_do(p_ws); end $$;

-- The workspace's admin or an owner: the review link to share.
create or replace function public.tm_review_link(p_ws uuid) returns text language plpgsql security definer set search_path='' as $$
begin perform ca_private.tm_need(p_ws,true);return ca_private.tm_review_url(ca_private.tm_review_token(p_ws)); end $$;

-- ---- By link, no sign-in ------------------------------------------------------------------------------------------
-- The cards to check, in the shape of tm_workspace_data (no members, assignments, reports or share links).
create or replace function public.tm_review_link_get(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ws uuid;
begin
 perform ca_private.rate_guard('tm_review_link_get',p_token,60,240,60);
 ws=ca_private.tm_review_link_ws(p_token);
 return jsonb_build_object(
  'workspace',(select jsonb_build_object('id',w.id,'name',w.name,'due_days',w.due_days,'recent_days',w.recent_days,'report_token','','report_mode',w.report_mode,'languages',to_jsonb(w.languages),
    'review_state',w.review_state,'review_round',w.review_round,'review_sent_at',w.review_sent_at,'approved_at',w.approved_at,
    'drive_url',null,'full_map_url',null,'full_map_name',null,'full_map_at',null,
    'stage',(select r.stage from ca_private.territory_requests r where r.id=w.request_id)) from public.tm_workspaces w where w.id=ws),
  'role','admin','members','[]'::jsonb,
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name,'notes',notes,'thumb',thumb,'has_image',image is not null,'has_boundary',boundary is not null,'map_url',map_url,'share_token','','updated_at',updated_at,
    'review_comment',review_comment,'review_comment_at',review_comment_at,'review_ok_at',review_ok_at)),'[]'::jsonb) from public.tm_territories where workspace_id=ws),
  'assignments','[]'::jsonb,'reports','[]'::jsonb);
end $$;

create or replace function public.tm_review_link_image(p_token text,p_territory uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 perform ca_private.rate_guard('tm_review_link_image',p_token,600,1200,60);
 return (select image from public.tm_territories where id=p_territory and workspace_id=ca_private.tm_review_link_ws(p_token));
end $$;

-- The naming token for the review screen's name and landmark editor, only while the cards are in review.
create or replace function public.tm_review_link_naming(p_token text) returns text language plpgsql security definer set search_path='' as $$
declare ws uuid=ca_private.tm_review_link_ws(p_token);
begin
 if not exists(select 1 from public.tm_workspaces where id=ws and review_state='review') then return null; end if;
 return (select token from ca_private.territory_naming where workspace_id=ws order by created_at desc limit 1);
end $$;

create or replace function public.tm_review_link_mark(p_token text,p_territory uuid,p_ok boolean) returns void language plpgsql security definer set search_path='' as $$
begin perform ca_private.rate_guard('tm_review_link_edit',p_token,600,1200,60);perform ca_private.tm_review_mark_do(ca_private.tm_review_link_ws(p_token),p_territory,p_ok); end $$;

create or replace function public.tm_review_link_comment(p_token text,p_territory uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
begin perform ca_private.rate_guard('tm_review_link_edit',p_token,600,1200,60);perform ca_private.tm_review_comment_do(ca_private.tm_review_link_ws(p_token),p_territory,p_comment); end $$;

create or replace function public.tm_review_link_submit(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform ca_private.rate_guard('tm_review_link_finish',p_token,10,30,60);return ca_private.tm_review_submit_do(ca_private.tm_review_link_ws(p_token)); end $$;

create or replace function public.tm_review_link_approve(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform ca_private.rate_guard('tm_review_link_finish',p_token,10,30,60);return ca_private.tm_review_approve_do(ca_private.tm_review_link_ws(p_token)); end $$;

-- ---- Sending for review: the email carries the link -------------------------------------------------------------
create or replace function public.tm_review_send(p_ws uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.tm_workspaces;n integer;link text;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select count(*) into n from public.tm_territories where workspace_id=p_ws and image is not null;
 if n=0 then raise exception 'Save the cards into this workspace first (generator: Print, then Send all to the territory manager)'; end if;
 update public.tm_workspaces set review_state='review',review_round=review_round+1,review_sent_at=now() where id=p_ws returning * into w;
 if w.id is null then raise exception 'Workspace not found. Refresh the list.'; end if;
 link=ca_private.tm_review_url(ca_private.tm_review_token(p_ws));
 perform ca_private.tm_admin_mail(p_ws,'tm-review:'||p_ws||':'||w.review_round,
  case when w.review_round=1 then 'Your territory cards are ready to check · ' else 'Your corrected territory cards are ready · ' end||w.name,
  'Dear brother,'||chr(10)||chr(10)||
  case when w.review_round=1 then 'The '||n||' Territory Map Cards for '||w.name||' are ready for you to check.'
   else 'We have made the changes you asked for. The cards for '||w.name||' are ready to check again.' end||chr(10)||chr(10)||
  '1. Open your review link (no sign-in needed):'||chr(10)||link||chr(10)||
  '2. Look at each card. Press "Mark as right", or write what should change.'||chr(10)||
  '3. Press "Send changes", or "Approve all cards" when everything is right.'||chr(10)||chr(10)||
  'Please keep this link to yourself: anyone with it can approve the cards.'||chr(10)||chr(10)||
  'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com');
 if w.request_id is not null then update ca_private.territory_requests set stage=greatest(stage,2),status=status,updated_at=now() where id=w.request_id and status<>'declined'; end if;
 return jsonb_build_object('review_state',w.review_state,'review_round',w.review_round,'cards',n,'link',link);
end $$;

-- ---- Request emails: acknowledgement on arrival; "accepted" without the sign-in step ---------------------------
create or replace function ca_private.territory_request_ack() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.contact_email is null or new.contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return new; end if;
 insert into ca_private.mail_outbox(dedupe,email,subject,body) values('territory-request-received:'||new.id,new.contact_email,
  'We have your territory request · '||new.congregation_name,
  'Dear '||new.contact_name||','||chr(10)||chr(10)||
  'Thank you for your territory request for '||new.congregation_name||'. It has reached us safely.'||chr(10)||chr(10)||
  'What happens next:'||chr(10)||
  '1. We look at your boundary file and reply within a few days.'||chr(10)||
  '2. We draw the territories, and you can give each one its local name on one private link.'||chr(10)||
  '3. We make the Territory Map Cards. You check them on one private link and approve them or ask for changes.'||chr(10)||
  '4. We make the full map and email you when everything is ready for use.'||chr(10)||chr(10)||
  'Follow your request here: https://territory.congregationassistant.com/?territory-track#token='||new.track_token||chr(10)||chr(10)||
  'There is no fee. We accept only voluntary donations. If you have a question, reply to this email.'||chr(10)||chr(10)||
  'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com')
 on conflict(dedupe) do nothing;
 return new;
end $$;
drop trigger if exists mail_ack on ca_private.territory_requests;
create trigger mail_ack after insert on ca_private.territory_requests for each row execute function ca_private.territory_request_ack();

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
   'What happens next:'||chr(10)||'1. We draw the territories from your boundary, and you can name them on one private link.'||chr(10)||
   '2. We make the Territory Map Cards. We email you a private link to check them: approve them, or ask for changes. No sign-in is needed.'||chr(10)||
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

revoke all on function ca_private.tm_review_link_ws(text),ca_private.tm_review_token(uuid),ca_private.tm_review_url(text),ca_private.tm_review_open(uuid),
 ca_private.tm_review_mark_do(uuid,uuid,boolean),ca_private.tm_review_comment_do(uuid,uuid,text),ca_private.tm_review_submit_do(uuid),
 ca_private.tm_review_approve_do(uuid),ca_private.territory_request_ack() from public,anon,authenticated;
revoke all on function public.tm_review_link(uuid),public.tm_review_link_get(text),public.tm_review_link_image(text,uuid),public.tm_review_link_naming(text),
 public.tm_review_link_mark(text,uuid,boolean),public.tm_review_link_comment(text,uuid,text),public.tm_review_link_submit(text),public.tm_review_link_approve(text) from public,anon,authenticated;
grant execute on function public.tm_review_link(uuid) to authenticated;
grant execute on function public.tm_review_link_get(text),public.tm_review_link_image(text,uuid),public.tm_review_link_naming(text),
 public.tm_review_link_mark(text,uuid,boolean),public.tm_review_link_comment(text,uuid,text),public.tm_review_link_submit(text),public.tm_review_link_approve(text) to anon,authenticated;
