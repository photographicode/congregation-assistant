-- Stops scheduled mail delivery and the territory-request owner alert. Queued mail stays in ca_private.mail_outbox.
select cron.unschedule(jobid) from cron.job where jobname='ca-transactional-mail';
drop trigger if exists alert_owner on ca_private.tm_applications;
drop function if exists public.mail_worker_ok(text);
delete from vault.secrets where name='mail_worker_secret';
