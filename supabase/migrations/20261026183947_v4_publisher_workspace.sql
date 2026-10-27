-- V4 additive publisher workspace. Existing records and RPCs are preserved.
create table ca_private.v4_announcements (
 id uuid primary key default gen_random_uuid(),
 cong_id text not null references public.congregations(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),created_by uuid not null,
 archived_at timestamptz
);
create index v4_announcements_feed on ca_private.v4_announcements(cong_id,created_at desc) where archived_at is null;
create table ca_private.v4_contact_notifications (
 id uuid primary key default gen_random_uuid(),
 cong_id text not null references public.congregations(id) on delete cascade,
 publisher_id text not null,publisher_name text not null,
 changed_fields text[] not null,created_at timestamptz not null default now(),
 read_at timestamptz,read_by uuid,
 foreign key(publisher_id,cong_id) references public.publishers(id,cong_id) on delete cascade
);
create index v4_contact_notifications_inbox on ca_private.v4_contact_notifications(cong_id,created_at desc);
alter table ca_private.v4_announcements enable row level security;
alter table ca_private.v4_contact_notifications enable row level security;
revoke all on ca_private.v4_announcements,ca_private.v4_contact_notifications from public,anon,authenticated;

-- Notification and contact update share the same transaction. No contact values
-- are copied into notifications. Changes by administrators do not notify themselves.
create function ca_private.v4_contact_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare fields text[];k text;begin
 if auth.uid() is null or not public.ca_has_role(new.cong_id,array['publisher']) then return new;end if;
 if not exists(select 1 from public.congregation_access a where a.cong_id=new.cong_id and a.publisher_id=new.id and a.email=lower(auth.jwt()->>'email') and a.role='publisher' and a.active) then return new;end if;
 fields='{}';
 foreach k in array array['phone','address','emergency_name','emergency_relationship','emergency_phone'] loop
  if coalesce(to_jsonb(new)->>k,'') is distinct from coalesce(to_jsonb(old)->>k,'') then fields=array_append(fields,k);end if;
 end loop;
 if cardinality(fields)>0 then insert into ca_private.v4_contact_notifications(cong_id,publisher_id,publisher_name,changed_fields) values(new.cong_id,new.id,new.name,fields);end if;
 return new;
end $$;
revoke all on function ca_private.v4_contact_changed() from public,anon,authenticated;
create trigger v4_publisher_contact_changed after update of phone,address,emergency_name,emergency_relationship,emergency_phone on public.publishers for each row execute function ca_private.v4_contact_changed();

create function public.ca_v4_announcements(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not (public.ca_google_identity() and public.ca_has_role(p_cong_id,array['admin','publisher','field_service','group_overseer','attendance','oclm','weekend','attendant','av','cleaning']) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email') and a.active)) then raise exception 'Approved congregation access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select id,title,body,created_at from ca_private.v4_announcements where cong_id=p_cong_id and archived_at is null order by created_at desc limit 100) a),'[]');
end $$;
create function public.ca_v4_publish_announcement(p_cong_id text,p_title text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null or not (public.ca_google_identity() and public.ca_has_role(p_cong_id,array['admin']) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email') and a.active and a.role='admin')) then raise exception 'Main admin access required' using errcode='42501';end if;
 if p_title is null or p_body is null or length(trim(p_title)) not between 1 and 120 or length(trim(p_body)) not between 1 and 4000 then raise exception 'Add a title (up to 120 characters) and message (up to 4000 characters)' using errcode='22023';end if;
 insert into ca_private.v4_announcements(cong_id,title,body,created_by) values(p_cong_id,trim(p_title),trim(p_body),auth.uid()) returning id into result;return result;
end $$;
create function public.ca_v4_archive_announcement(p_cong_id text,p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (public.ca_google_identity() and public.ca_has_role(p_cong_id,array['admin']) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email') and a.active and a.role='admin')) then raise exception 'Main admin access required' using errcode='42501';end if;
 update ca_private.v4_announcements set archived_at=coalesce(archived_at,now()) where cong_id=p_cong_id and id=p_id;
 if not found then raise exception 'Announcement not found' using errcode='P0002';end if;return true;
end $$;
create function public.ca_v4_admin_notifications(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not (public.ca_google_identity() and public.ca_has_role(p_cong_id,array['admin']) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email') and a.active and a.role='admin')) then raise exception 'Main admin access required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select id,publisher_name,changed_fields,created_at,read_at from ca_private.v4_contact_notifications where cong_id=p_cong_id order by created_at desc limit 100) n),'[]');
end $$;
create function public.ca_v4_read_notification(p_cong_id text,p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not (public.ca_google_identity() and public.ca_has_role(p_cong_id,array['admin']) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.email=lower(auth.jwt()->>'email') and a.active and a.role='admin')) then raise exception 'Main admin access required' using errcode='42501';end if;
 update ca_private.v4_contact_notifications set read_at=coalesce(read_at,now()),read_by=coalesce(read_by,auth.uid()) where cong_id=p_cong_id and id=p_id;
 if not found then raise exception 'Notification not found' using errcode='P0002';end if;return true;
end $$;
revoke all on function public.ca_v4_announcements(text),public.ca_v4_publish_announcement(text,text,text),public.ca_v4_archive_announcement(text,uuid),public.ca_v4_admin_notifications(text),public.ca_v4_read_notification(text,uuid) from public,anon,authenticated;
grant execute on function public.ca_v4_announcements(text),public.ca_v4_publish_announcement(text,text,text),public.ca_v4_archive_announcement(text,uuid),public.ca_v4_admin_notifications(text),public.ca_v4_read_notification(text,uuid) to authenticated;
