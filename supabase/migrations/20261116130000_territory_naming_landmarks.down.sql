-- Down path for 20261116130000_territory_naming_landmarks.sql. Keeps every naming link and what was written on it.
-- Afterwards run 20261116110000_territory_naming.sql again (safe to re-run) to restore the earlier functions.
drop function if exists public.set_territory_naming_landmarks(uuid,boolean);
drop function if exists public.create_territory_naming(uuid,text,jsonb,boolean);
drop function if exists public.territory_naming_list();
drop function if exists public.territory_naming_get(text);
alter table ca_private.territory_naming drop column if exists landmarks_editable;
