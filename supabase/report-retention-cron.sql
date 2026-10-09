-- Authorized recurring cleanup, using each congregation's configured meeting timezone.
-- Runs daily for reliable catch-up; the cutoff changes only on September 1 locally.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ca-complete-service-year-retention','10 0 * * *','select ca_private.purge_expired_service_reports();');
