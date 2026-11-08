-- Retired 6 Nov 2026. This file used to let the owner sign in with a password, which the owner check no
-- longer allows (see supabase/migrations/20261104120000_security_hardening.sql). It now refuses to run.
do $$ begin
 raise exception 'superadmin-password.sql is retired: owner sign-in is Google only. Run supabase/migrations/20261104120000_security_hardening.sql instead.';
end $$;
