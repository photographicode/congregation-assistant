-- Undoes 20261117120000_territory_review_naming.sql. Naming lists made from reviews stay, unlinked from their workspace.
drop function if exists public.tm_review_naming(uuid);
drop function if exists public.tm_review_naming_set(uuid,jsonb,boolean);
drop index if exists ca_private.territory_naming_workspace_idx;
alter table ca_private.territory_naming drop column if exists workspace_id;
