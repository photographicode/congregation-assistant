-- Mail templates link to APP_URL. It pointed at app.congregationassistant.com, which has no DNS record,
-- so welcome and reminder emails linked to a dead address. The app is served at /app/ on the main domain.
do $$
begin
 if to_regclass('ca_private.public_app_config') is not null then
  update ca_private.public_app_config
  set values=values||'{"APP_URL":"https://congregationassistant.com/app/"}'::jsonb
  where singleton;
 end if;
end $$;
