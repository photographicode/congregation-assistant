-- Territory requests can carry the congregation's boundary as KML or KMZ files, and territory owners
-- (ca_private.tm_superadmins, e.g. photographicode@ and congregationassistant0@) read and answer requests
-- from their dashboard on territory.congregationassistant.com.
-- Needs 20261104130000_audit_followups_territory_requests.sql and 20261112090000_territory_superadmins.sql.
-- Additive and safe to re-run. Down path: 20261114090000_territory_request_files.down.sql.

create table if not exists ca_private.territory_request_files(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references ca_private.territory_requests(id) on delete cascade,
 file_name text not null check(length(file_name) between 5 and 200),
 kind text not null check(kind in('kml','kmz')),
 size_bytes integer not null check(size_bytes between 1 and 4194304),
 content bytea not null,
 created_at timestamptz not null default now()
);
create index if not exists territory_request_files_request_idx on ca_private.territory_request_files(request_id);
create index if not exists territory_request_files_created_idx on ca_private.territory_request_files(created_at);
alter table ca_private.territory_request_files enable row level security;
revoke all on ca_private.territory_request_files from public,anon,authenticated;

-- Same request as submit_territory_request, with one to three boundary files (base64). Every file is checked
-- before anything is saved, so a bad file never leaves a request without its attachments.
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

-- Requests list for both kinds of owner, with the attached files' names and sizes (not their content).
create or replace function public.get_territory_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not (public.ca_is_superadmin() or ca_private.tm_is_superadmin()) then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('files',
   (select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.file_name,'kind',f.kind,'size',f.size_bytes) order by f.created_at),'[]'::jsonb)
    from ca_private.territory_request_files f where f.request_id=r.id)) order by r.created_at desc),'[]'::jsonb)
  from (select * from ca_private.territory_requests order by created_at desc limit 500) r);
end $$;

create or replace function public.update_territory_request(p_id uuid,p_status text,p_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not (public.ca_is_superadmin() or ca_private.tm_is_superadmin()) then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if p_status not in('new','in_progress','done','declined') then raise exception 'Choose a valid status'; end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'Keep the note under 2000 characters'; end if;
 -- A null note keeps the saved one; an empty note clears it.
 update ca_private.territory_requests set status=p_status,owner_note=case when p_note is null then owner_note else nullif(trim(p_note),'') end,updated_at=now() where id=p_id;
 if not found then raise exception 'Request not found. Refresh the list.'; end if;
 return jsonb_build_object('status',p_status);
end $$;

-- One attached file, base64, for download or to open in the territory generator.
create or replace function public.get_territory_request_file(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb;
begin
 if not (public.ca_is_superadmin() or ca_private.tm_is_superadmin()) then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 select jsonb_build_object('name',f.file_name,'kind',f.kind,'congregation',q.congregation_name,'data',translate(encode(f.content,'base64'),E'\n',''))
 into r from ca_private.territory_request_files f join ca_private.territory_requests q on q.id=f.request_id where f.id=p_id;
 if r is null then raise exception 'File not found. Refresh the list.'; end if;
 return r;
end $$;

revoke all on function public.submit_territory_request_with_files(text,text,text,text,text,text,jsonb),public.get_territory_requests(),
 public.update_territory_request(uuid,text,text),public.get_territory_request_file(uuid) from public,anon,authenticated;
grant execute on function public.submit_territory_request_with_files(text,text,text,text,text,text,jsonb) to anon,authenticated;
grant execute on function public.get_territory_requests(),public.update_territory_request(uuid,text,text),public.get_territory_request_file(uuid) to authenticated;
