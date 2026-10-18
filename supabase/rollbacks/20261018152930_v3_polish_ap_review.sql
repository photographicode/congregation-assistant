-- Restores the previous trigger behavior; does not rewrite any report rows.
create or replace function ca_private.stamp_report_submission()
returns trigger language plpgsql set search_path='' as $$
begin new.submitted_at=clock_timestamp();return new;end $$;
revoke all on function ca_private.stamp_report_submission() from public,anon,authenticated;
