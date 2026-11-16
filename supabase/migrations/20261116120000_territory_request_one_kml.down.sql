-- Down path for 20261116120000_territory_request_one_kml.sql: re-run the submit_territory_request_with_files section of
-- 20261114100000_security_audit_fixes.sql (one to three KML/KMZ files, 4 MB each), then restore the 4 MB column check
-- (it fails while a stored file is larger than 4 MB; remove or shrink such files first).
alter table ca_private.territory_request_files drop constraint if exists territory_request_files_size_bytes_check;
alter table ca_private.territory_request_files add constraint territory_request_files_size_bytes_check check(size_bytes between 1 and 4194304);
