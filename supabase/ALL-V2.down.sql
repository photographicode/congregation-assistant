-- Deliberate rollback guard: this set contains shared authorization/function replacements.
-- The earlier per-migration down scripts do not safely reverse the complete current set.
-- Restore a tested pre-migration database backup into an isolated project, verify it, then switch
-- the application endpoint. Do not run partial historical down scripts on the current database.
do $$begin raise exception 'Automatic full V2 rollback is blocked: use a verified pre-migration backup. No records were changed.';end $$;
