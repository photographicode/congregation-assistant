create table ca_private.talk_history(
 id uuid primary key default gen_random_uuid(),cong_id text not null references public.congregations(id) on delete cascade,
 date date not null,talk_no text not null check(talk_no ~ '^[0-9]{1,4}$'),title text not null default '',speaker text not null default '',speaker_congregation text not null default '',source text not null check(source in('published','manual')),source_week date,
 unique(cong_id,source_week)
);
alter table ca_private.talk_history enable row level security;
revoke all on ca_private.talk_history from public,anon,authenticated;
create unique index ca_talk_history_manual_unique on ca_private.talk_history(cong_id,date,talk_no,speaker) where source='manual';
create index ca_talk_history_lookup on ca_private.talk_history(cong_id,talk_no,date desc);
create function ca_private.record_published_talk() returns trigger language plpgsql security definer set search_path='' as $$declare d date;begin
 if coalesce(new.snapshot->>'outline','') !~ '^[0-9]{1,4}$' or coalesce(new.snapshot->>'exception','normal') in('assembly','convention','memorial','no_meeting','rescheduled') then delete from ca_private.talk_history where cong_id=new.cong_id and source_week=new.week;return new;end if;
 d=new.week+((coalesce((select weekend_day from public.ca_meeting_settings where cong_id=new.cong_id),0)+6)%7);
 insert into ca_private.talk_history(cong_id,date,talk_no,title,speaker,speaker_congregation,source,source_week) values(new.cong_id,d,new.snapshot->>'outline',left(coalesce(new.snapshot->>'talkTitle',''),300),left(coalesce(new.snapshot->>'speaker',''),200),left(coalesce(new.snapshot->>'speakerCongregation',''),200),'published',new.week)
 on conflict(cong_id,source_week) do update set date=excluded.date,talk_no=excluded.talk_no,title=excluded.title,speaker=excluded.speaker,speaker_congregation=excluded.speaker_congregation;
 return new;end $$;
revoke all on function ca_private.record_published_talk() from public,anon,authenticated;
create trigger ca_published_talk_history after insert or update of snapshot on ca_private.weekend_publications for each row execute function ca_private.record_published_talk();
create function public.ca_v3_talk_history(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform ca_private.v2_require(p_cong_id,array['weekend']);return(select coalesce(jsonb_agg(jsonb_build_object('date',date,'talk_no',talk_no,'title',title,'speaker',speaker,'speaker_congregation',speaker_congregation,'source',source) order by date desc),'[]') from ca_private.talk_history where cong_id=p_cong_id);end $$;
create function public.ca_v3_backfill_talks(p_cong_id text,p_rows jsonb) returns integer language plpgsql security definer set search_path='' as $$declare r jsonb;n integer=0;begin
 perform ca_private.v2_require(p_cong_id,array['weekend']);if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>500 then raise exception 'Import up to 500 date-number rows';end if;
 for r in select value from jsonb_array_elements(p_rows) loop
 if coalesce(r->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(r->>'talk_no','') !~ '^[0-9]{1,4}$' then raise exception 'Invalid date or talk number';end if;
 insert into ca_private.talk_history(cong_id,date,talk_no,source) values(p_cong_id,(r->>'date')::date,r->>'talk_no','manual') on conflict(cong_id,date,talk_no,speaker) where source='manual' do nothing;n=n+1;
 end loop;return n;end $$;
revoke all on function public.ca_v3_talk_history(text),public.ca_v3_backfill_talks(text,jsonb) from public,anon,authenticated;
grant execute on function public.ca_v3_talk_history(text),public.ca_v3_backfill_talks(text,jsonb) to authenticated;
-- Seed only already-published public schedule snapshots; no drafts or notes.
insert into ca_private.talk_history(cong_id,date,talk_no,title,speaker,speaker_congregation,source,source_week)
 select p.cong_id,p.week+((coalesce(s.weekend_day,0)+6)%7),p.snapshot->>'outline',left(coalesce(p.snapshot->>'talkTitle',''),300),left(coalesce(p.snapshot->>'speaker',''),200),left(coalesce(p.snapshot->>'speakerCongregation',''),200),'published',p.week
 from ca_private.weekend_publications p left join public.ca_meeting_settings s on s.cong_id=p.cong_id
 where coalesce(p.snapshot->>'outline','') ~ '^[0-9]{1,4}$' and coalesce(p.snapshot->>'exception','normal') not in('assembly','convention','memorial','no_meeting','rescheduled') on conflict do nothing;
