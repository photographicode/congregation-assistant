-- Down path for 20261116100000_territory_request_tracking.sql. Mail already queued stays in the outbox.
drop function if exists public.territory_request_progress(text);
drop function if exists public.set_territory_request_stage(uuid,integer);
drop trigger if exists mail_contact on ca_private.territory_requests;
drop trigger if exists sync_stage on ca_private.territory_requests;
drop function if exists ca_private.territory_request_mail();
drop function if exists ca_private.territory_request_sync();
alter table ca_private.territory_requests drop column if exists track_token;
alter table ca_private.territory_requests drop column if exists stage;
