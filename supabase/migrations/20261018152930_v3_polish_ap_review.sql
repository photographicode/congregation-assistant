-- Administrative AP changes must not rewrite the publisher's submission time.
-- No report rows are rewritten by this migration.
create or replace function ca_private.stamp_report_submission()
returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP = 'INSERT' then
  new.submitted_at = clock_timestamp();
 elsif row(new.shared_in_ministry,new.studies,new.hours,new.comments)
       is distinct from row(old.shared_in_ministry,old.studies,old.hours,old.comments) then
  new.submitted_at = clock_timestamp();
 else
  new.submitted_at = old.submitted_at;
 end if;
 return new;
end $$;
revoke all on function ca_private.stamp_report_submission() from public,anon,authenticated;
