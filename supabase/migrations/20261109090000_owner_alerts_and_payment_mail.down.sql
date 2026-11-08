-- Stops owner alerts and the getting-started letter. Mail already queued is kept.
do $$
begin
 if to_regclass('ca_private.workspace_applications') is not null then
  drop trigger if exists alert_owner on ca_private.workspace_applications;
  drop trigger if exists getting_started on ca_private.workspace_applications;
 end if;
 if to_regclass('ca_private.territory_requests') is not null then
  drop trigger if exists alert_owner on ca_private.territory_requests;
 end if;
end $$;
drop function if exists ca_private.send_getting_started();
drop function if exists ca_private.alert_owner_of_request();
drop function if exists ca_private.owner_alert_email();
