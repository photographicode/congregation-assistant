\set ON_ERROR_STOP on
begin;
-- Synthetic, temporary records exercise the actual production trigger function.
create temporary table ap_stamp_test (
 id text primary key, shared_in_ministry boolean, studies integer,
 hours numeric, comments text, is_ap boolean, submitted_at timestamptz
);
create trigger ap_stamp before insert or update on ap_stamp_test
for each row execute function ca_private.stamp_report_submission();
do $$
declare before_row jsonb; after_row jsonb; stamp timestamptz;
begin
 insert into ap_stamp_test values ('synthetic',true,2,12.25,'Retain this',true,null);
 select to_jsonb(r),submitted_at into before_row,stamp from ap_stamp_test r;
 if stamp is null then raise exception 'Insert must stamp a submission';end if;
 update ap_stamp_test set is_ap=false where id='synthetic';
 select to_jsonb(r) into after_row from ap_stamp_test r;
 if (before_row-'is_ap') is distinct from (after_row-'is_ap') then raise exception 'AP revoke changed report contents or timestamp';end if;
 update ap_stamp_test set is_ap=true,submitted_at='2000-01-01' where id='synthetic';
 if (select submitted_at from ap_stamp_test) is distinct from stamp then raise exception 'AP undo must retain original submission time';end if;
 update ap_stamp_test set hours=12.5 where id='synthetic';
 if (select submitted_at from ap_stamp_test)<=stamp then raise exception 'Report corrections must refresh submission time';end if;
 select submitted_at into stamp from ap_stamp_test;
 update ap_stamp_test set hours=hours where id='synthetic';
 if (select submitted_at from ap_stamp_test) is distinct from stamp then raise exception 'No-op must retain submission time';end if;
 raise notice 'PASS: insert, AP revoke, AP restore, correction and no-op timestamps';
end $$;
rollback;
