-- Restores the definitions from before the 2026-11-14 security fixes. The download log is dropped with its rows.
create or replace function ca_private.client_ip() returns text language plpgsql stable set search_path='' as $$
declare h json;
begin
 begin h=nullif(current_setting('request.headers',true),'')::json; exception when others then h=null; end;
 return coalesce(nullif(h->>'cf-connecting-ip',''),nullif(btrim(split_part(h->>'x-forwarded-for',',',1)),''),'unknown');
end $$;
revoke all on function ca_private.client_ip() from public,anon,authenticated;

create or replace function public.submit_territory_request(p_name text,p_contact_email text,p_congregation text,p_phone text,p_details text,p_website text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare result_id uuid;
begin
 if coalesce(p_website,'')<>'' then raise exception 'Request could not be sent'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 100
 or p_congregation is null or length(trim(p_congregation)) not between 2 and 150
 or p_contact_email is null or length(p_contact_email)>150 or p_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(coalesce(p_phone,''))>30
 or p_details is null or length(trim(p_details)) not between 10 and 2000 then
  raise exception 'Check the form: name, congregation, email and at least a sentence about what you need';
 end if;
 if ca_private.rate_hit('submit_territory_request:ip',ca_private.client_ip(),3600)>3 then
  raise exception 'Too many requests. Please wait an hour and try again.' using errcode='PT429';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('territory-request-rate',0));
 if (select count(*) from ca_private.territory_requests where created_at>now()-interval '1 hour')>=50 then
  raise exception 'Requests are temporarily busy. Please try again later.';
 end if;
 insert into ca_private.territory_requests(contact_name,contact_email,congregation_name,phone,details)
 values(trim(p_name),lower(trim(p_contact_email)),trim(p_congregation),nullif(trim(coalesce(p_phone,'')),''),trim(p_details))
 returning id into result_id;
 return jsonb_build_object('received',true,'reference',result_id);
end $$;

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
 if p_files is null or jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files) not between 1 and 3 then
  raise exception 'Attach one to three KML or KMZ files' using errcode='22023';
 end if;
 for f in select value from jsonb_array_elements(p_files) loop
  if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'name') is distinct from 'string' or jsonb_typeof(f->'data') is distinct from 'string' then
   raise exception 'A file could not be read. Choose it again.' using errcode='22023';
  end if;
  -- Keep only the file's own name, without folders or characters that are unsafe in a download name.
  fname=trim(regexp_replace(regexp_replace(f->>'name','^.*[\\/]',''),'[[:cntrl:]:*?"<>|]','_','g'));
  ext=lower(substring(fname from '\.([A-Za-z]+)$'));
  if ext is null or ext not in('kml','kmz') or length(fname) not between 5 and 200 then
   raise exception 'Only KML or KMZ files can be attached (%).',left(fname,60) using errcode='22023';
  end if;
  raw=f->>'data';
  if length(raw)>5600000 then raise exception 'Each file must be 4 MB or smaller (%).',left(fname,60) using errcode='22023'; end if;
  begin
   bytes=decode(raw,'base64');
  exception when others then
   raise exception 'A file could not be read. Choose it again.' using errcode='22023';
  end;
  if octet_length(bytes) not between 1 and 4194304 then raise exception 'Each file must be 4 MB or smaller (%).',left(fname,60) using errcode='22023'; end if;
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
 if total>6291456 then raise exception 'The files together must be 6 MB or smaller.' using errcode='22023'; end if;
 -- Storage guard against floods from many addresses: at most 300 MB of new files a day.
 if (select coalesce(sum(size_bytes),0) from ca_private.territory_request_files where created_at>now()-interval '1 day')+total>314572800 then
  raise exception 'Requests are temporarily busy. Please try again later.';
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

create or replace function public.get_territory_request_file(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb;
begin
 if not (public.ca_is_superadmin() or ca_private.tm_is_superadmin()) then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select jsonb_build_object('name',f.file_name,'kind',f.kind,'congregation',q.congregation_name,'data',translate(encode(f.content,'base64'),E'\n',''))
 into r from ca_private.territory_request_files f join ca_private.territory_requests q on q.id=f.request_id where f.id=p_id;
 if r is null then raise exception 'File not found. Refresh the list.'; end if;
 return r;
end $$;

drop table if exists ca_private.territory_file_downloads;
revoke all on function public.submit_territory_request(text,text,text,text,text,text),public.submit_territory_request_with_files(text,text,text,text,text,text,jsonb),public.get_territory_request_file(uuid) from public,anon,authenticated;
grant execute on function public.submit_territory_request(text,text,text,text,text,text),public.submit_territory_request_with_files(text,text,text,text,text,text,jsonb) to anon,authenticated;
grant execute on function public.get_territory_request_file(uuid) to authenticated;
