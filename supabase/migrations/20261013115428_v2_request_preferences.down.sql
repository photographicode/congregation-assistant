begin;
drop trigger v2_application_choices on ca_private.workspace_applications;
drop function ca_private.v2_approved_choices();
drop function public.submit_v2_workspace_application(text,text,text,text,text,boolean,jsonb,text);
drop function public.ca_v2_people(text);
alter table ca_private.workspace_applications drop column choices;
-- Retain congregation settings on rollback to preserve user choices.
commit;
