-- Back to the first review email wording.

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
