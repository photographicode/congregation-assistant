-- Undoes 20261118100000_territory_auto_draft.sql. Stored auto-draft.kml request files stay; the vault secrets stay
-- (delete them in Vault if wanted).
drop trigger if exists auto_draft on ca_private.territory_request_files;
drop function if exists ca_private.tm_auto_dispatch();
drop function if exists public.tm_auto_request(text,uuid);
drop function if exists public.tm_auto_draft_save(text,uuid,text,text);
drop function if exists ca_private.tm_auto_ok(text);
drop table if exists ca_private.tm_auto_drafts;
