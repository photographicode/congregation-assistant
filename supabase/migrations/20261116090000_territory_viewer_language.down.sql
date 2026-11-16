-- Down path for 20261116090000_territory_viewer_language.sql.
-- Viewers become managers again (managers could change territories and assignments).
-- After this file, re-run the function sections of 20261111090000_territory_manager.sql (tm_need, tm_territory_image,
-- tm_workspace_data, tm_public_territory) and then 20261112100000_territory_hardening.sql (tm_public_form, tm_set_member).
drop function if exists public.tm_submit_report_v2(text,uuid,text,text,text,text,text,double precision,double precision,real,text);
drop function if exists public.tm_save_boundaries(uuid,jsonb);
drop function if exists public.tm_save_report_settings(uuid,text,text[]);
drop function if exists ca_private.tm_contains(jsonb,double precision,double precision);
drop function if exists ca_private.tm_ring_has(jsonb,double precision,double precision);
alter table public.tm_territories drop column if exists boundary;
alter table public.tm_reports drop column if exists language;
alter table public.tm_reports drop column if exists kind;
alter table public.tm_workspaces drop column if exists languages;
alter table public.tm_workspaces drop column if exists report_mode;
alter table public.tm_members drop constraint if exists tm_members_role_check;
update public.tm_members set role='manager' where role='viewer';
alter table public.tm_members add constraint tm_members_role_check check(role in('admin','manager'));
drop function if exists ca_private.tm_need_read(uuid);
