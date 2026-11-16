-- Down path for 20261116110000_territory_naming.sql. Drops the naming links and everything written on them.
drop function if exists public.territory_naming_save(text,text,text,jsonb,text,boolean);
drop function if exists public.territory_naming_get(text);
drop function if exists public.territory_naming_results(uuid);
drop function if exists public.territory_naming_list();
drop function if exists public.create_territory_naming(uuid,text,jsonb);
drop function if exists ca_private.is_territory_owner();
drop table if exists ca_private.territory_naming_entries;
drop table if exists ca_private.territory_naming;
