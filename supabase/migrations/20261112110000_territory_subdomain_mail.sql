-- The territory manager now lives at https://territory.congregationassistant.com/. New-workspace emails point there.
-- Down path: re-run ca_private.tm_welcome from 20261111090000_territory_manager.sql.
create or replace function ca_private.tm_welcome(p_ws uuid,p_email text,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into ca_private.mail_outbox(dedupe,email,subject,body) values('tm-welcome:'||p_ws||':'||p_email,p_email,'Your territory workspace is ready',
  'Dear brother,'||chr(10)||chr(10)||'The territory workspace for '||p_name||' is ready.'||chr(10)||chr(10)||
  'Open: https://territory.congregationassistant.com/'||chr(10)||'Choose Continue with Google and use '||p_email||'. No password is sent by email.'||chr(10)||chr(10)||
  'Add your territories, then give territory managers access under Settings. You can install it on your phone from Settings > App.'||chr(10)||chr(10)||'Warm regards,'||chr(10)||'Congregation Assistant')
 on conflict(dedupe) do nothing;
end $$;
revoke all on function ca_private.tm_welcome(uuid,text,text) from public,anon,authenticated;
