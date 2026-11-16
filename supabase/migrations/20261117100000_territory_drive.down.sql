-- Down path for 20261117100000_territory_drive.sql. Drops the Drive links (the Drive folders themselves stay).
-- Afterwards run 20261117090000_territory_review.sql again to restore Storage and the earlier functions.
drop function if exists public.tm_set_drive_links(uuid,text,text);
alter table public.tm_workspaces drop column if exists drive_url, drop column if exists full_map_url;
alter table public.tm_workspaces add column if not exists full_map_path text check(full_map_path is null or length(full_map_path)<=300);
