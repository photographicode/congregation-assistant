-- Explicitly approved publisher accounts only; no new direct table access.
create or replace function public.send_congregation_reminder(p_cong_id text,p_publisher_id text,p_request_id text,p_title text,p_date text,p_time text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare recipient record;existing jsonb;reminder jsonb;prior jsonb;version bigint;counted integer=0;begin
 if auth.uid() is null or not public.ca_is_congregation_admin(p_cong_id) or not public.ca_google_identity() or not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=lower(auth.jwt()->>'email')) then raise exception 'Main administrator Google sign-in required.' using errcode='42501';end if;
 if coalesce(p_request_id,'') !~ '^[A-Za-z0-9_-]{1,64}$' or length(trim(coalesce(p_title,''))) not between 1 and 75 or coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a short reminder title, date and time.';end if;
 perform p_date::date;
 reminder=jsonb_build_object('id','admin_'||p_request_id,'title','Congregation reminder: '||trim(p_title),'date',p_date,'time',p_time);
 for recipient in select p.id from public.publishers p where p.cong_id=p_cong_id and p.transferred_at is null and (p_publisher_id is null or p.id=p_publisher_id) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.publisher_id=p.id and a.role='publisher' and a.active) order by p.id for share of p loop
  perform pg_advisory_xact_lock(hashtextextended('publisher-preferences:'||p_cong_id||':'||recipient.id,0));
  select pref.reminders,pref.revision into existing,version from ca_private.publisher_preferences pref where pref.cong_id=p_cong_id and pref.publisher_id=recipient.id;
  existing=coalesce(existing,'[]');
  select value into prior from jsonb_array_elements(existing) where value->>'id'=reminder->>'id';
  if prior is not null then if prior<>reminder then raise exception 'This reminder request already has different details. Start a new reminder.';end if;
  else
   if jsonb_array_length(existing)>=12 then raise exception 'A selected publisher already has 12 reminders. Ask them to remove an old reminder, then try again. No reminders were added.';end if;
   insert into ca_private.publisher_preferences(cong_id,publisher_id,revision,reminders) values(p_cong_id,recipient.id,coalesce(version,0)+1,existing||jsonb_build_array(reminder)) on conflict(cong_id,publisher_id) do update set revision=excluded.revision,reminders=excluded.reminders,updated_at=clock_timestamp();
  end if;
  counted=counted+1;
 end loop;
 if counted=0 then raise exception 'No approved publisher account is available. Approve publisher login first.';end if;
 return jsonb_build_object('recipients',counted);
end $$;
revoke all on function public.send_congregation_reminder(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.send_congregation_reminder(text,text,text,text,text,text) to authenticated;
