-- Removes the workspace-request address limit and restores anonymous access to get_public_attendance.
-- The Google-only owner check is left in place: no earlier version should be restored.
do $do$
begin
 if to_regprocedure('ca_private.submit_workspace_application_unlimited(text,text,text,text,text,boolean,text)') is not null then
  drop function if exists public.submit_workspace_application(text,text,text,text,text,boolean,text);
  alter function ca_private.submit_workspace_application_unlimited(text,text,text,text,text,boolean,text) rename to submit_workspace_application;
  alter function ca_private.submit_workspace_application(text,text,text,text,text,boolean,text) set schema public;
  grant execute on function public.submit_workspace_application(text,text,text,text,text,boolean,text) to anon,authenticated;
 end if;
 if to_regprocedure('public.get_public_attendance(text,integer,integer)') is not null then
  grant execute on function public.get_public_attendance(text,integer,integer) to anon;
 end if;
end $do$;
