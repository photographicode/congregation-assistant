-- Undoes 20261118090000_territory_review_link.sql. Afterwards re-run 20261117090000_territory_review.sql (submit, approve,
-- request emails), 20261117130000_territory_review_checks.sql (mark, comment) and 20261117150000_territory_review_wording.sql
-- (send) to restore the earlier functions.
drop trigger if exists mail_ack on ca_private.territory_requests;
drop function if exists ca_private.territory_request_ack();
drop function if exists public.tm_review_link(uuid);
drop function if exists public.tm_review_link_get(text);
drop function if exists public.tm_review_link_image(text,uuid);
drop function if exists public.tm_review_link_naming(text);
drop function if exists public.tm_review_link_mark(text,uuid,boolean);
drop function if exists public.tm_review_link_comment(text,uuid,text);
drop function if exists public.tm_review_link_submit(text);
drop function if exists public.tm_review_link_approve(text);
drop function if exists ca_private.tm_review_mark_do(uuid,uuid,boolean);
drop function if exists ca_private.tm_review_comment_do(uuid,uuid,text);
drop function if exists ca_private.tm_review_submit_do(uuid);
drop function if exists ca_private.tm_review_approve_do(uuid);
drop function if exists ca_private.tm_review_open(uuid);
drop function if exists ca_private.tm_review_link_ws(text);
drop function if exists ca_private.tm_review_token(uuid);
drop function if exists ca_private.tm_review_url(text);
alter table public.tm_workspaces drop column if exists review_token;
