-- Undoes 20261117130000_territory_review_checks.sql: re-run 20261117100000_territory_drive.sql (tm_workspace_data) and
-- 20261117090000_territory_review.sql (tm_review_comment) after this to restore the earlier functions.
drop function if exists public.tm_review_mark(uuid,boolean);
alter table public.tm_territories drop column if exists review_ok_at;
