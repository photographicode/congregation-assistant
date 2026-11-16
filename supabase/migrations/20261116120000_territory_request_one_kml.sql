-- Territory request file, 2026-11-16 (owner request): exactly one .kml file (the congregation boundary from JW Hub),
-- up to 5 MB. Same function as 20261114100000_security_audit_fixes.sql otherwise. Safe to re-run.
-- Down path: 20261116120000_territory_request_one_kml.down.sql.

alter table ca_private.territory_request_files drop constraint if exists territory_request_files_size_bytes_check;
alter table ca_private.territory_request_files add constraint territory_request_files_size_bytes_check check(size_bytes between 1 and 5242880);

create or replace function public.submit_territory_request_with_files(p_name text,p_contact_email text,p_congregation text,p_phone text,p_details text,p_website text,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 f jsonb;
 raw text;
 bytes bytea;
 fname text;
 ext text;
 names text[]=array[]::text[];
 kinds text[]=array[]::text[];
 blobs bytea[]=array[]::bytea[];
 total integer=0;
 result jsonb;
 req uuid;
begin
 if coalesce(p_website,'')<>'' then raise exception 'Request could not be sent'; end if;
 -- Cheapest check first: refuse oversized payloads before decoding anything.
 if pg_column_size(p_files)>7500000 then raise exception 'The KML file must be 5 MB or smaller.' using errcode='22023'; end if;
 if p_files is null or jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files)<>1 then
  raise exception 'Attach one KML file' using errcode='22023';
 end if;
 for f in select value from jsonb_array_elements(p_files) loop
  if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'name') is distinct from 'string' or jsonb_typeof(f->'data') is distinct from 'string' then
   raise exception 'A file could not be read. Choose it again.' using errcode='22023';
  end if;
  -- Keep only the file's own name, without folders or characters that are unsafe in a download name.
  fname=trim(regexp_replace(regexp_replace(f->>'name','^.*[\\/]',''),'[[:cntrl:]:*?"<>|]','_','g'));
  ext=lower(substring(fname from '\.([A-Za-z]+)$'));
  if ext is distinct from 'kml' or length(fname) not between 5 and 200 then
   raise exception 'Only a .kml file can be attached (%).',left(fname,60) using errcode='22023';
  end if;
  raw=f->>'data';
  if length(raw)>7000000 then raise exception 'The KML file must be 5 MB or smaller (%).',left(fname,60) using errcode='22023'; end if;
  begin
   bytes=decode(raw,'base64');
  exception when others then
   raise exception 'A file could not be read. Choose it again.' using errcode='22023';
  end;
  if octet_length(bytes) not between 1 and 5242880 then raise exception 'The KML file must be 5 MB or smaller (%).',left(fname,60) using errcode='22023'; end if;
  -- The content must match the name: a KMZ is a ZIP archive, a KML is XML with a <kml> element near the start.
  if ext='kmz' and substring(bytes from 1 for 4)<>'\x504b0304'::bytea then
   raise exception '% is not a KMZ file.',left(fname,60) using errcode='22023';
  end if;
  if ext='kml' and position('<kml' in lower(encode(substring(bytes from 1 for 4096),'escape')))=0 then
   raise exception '% is not a KML file.',left(fname,60) using errcode='22023';
  end if;
  total=total+octet_length(bytes);
  names=names||fname;
  kinds=kinds||ext;
  blobs=blobs||bytes;
 end loop;
 if total>5242880 then raise exception 'The KML file must be 5 MB or smaller.' using errcode='22023'; end if;
 -- One upload at a time from here, so the storage caps below cannot be overshot by parallel calls.
 perform pg_advisory_xact_lock(hashtextextended('territory-request-files',0));
 -- Old files go: anything over 90 days, and files of requests finished or declined over 30 days ago.
 delete from ca_private.territory_request_files f where f.created_at<now()-interval '90 days'
  or f.request_id in (select r.id from ca_private.territory_requests r where r.status in('done','declined') and r.updated_at<now()-interval '30 days');
 -- Storage guards against floods from many addresses: 60 MB of new files a day, 200 MB kept in all.
 if (select coalesce(sum(size_bytes),0) from ca_private.territory_request_files where created_at>now()-interval '1 day')+total>62914560
 or (select coalesce(sum(size_bytes),0) from ca_private.territory_request_files)+total>209715200 then
  raise exception 'Requests are temporarily busy. Please try again later, or email the file.';
 end if;
 -- Validation, the per-address limit and the hourly limit are those of the plain request.
 result=public.submit_territory_request(p_name,p_contact_email,p_congregation,p_phone,p_details,p_website);
 req=(result->>'reference')::uuid;
 for i in 1..array_length(blobs,1) loop
  insert into ca_private.territory_request_files(request_id,file_name,kind,size_bytes,content)
  values(req,names[i],kinds[i],octet_length(blobs[i]),blobs[i]);
 end loop;
 return result||jsonb_build_object('files',array_length(blobs,1));
end $$;
