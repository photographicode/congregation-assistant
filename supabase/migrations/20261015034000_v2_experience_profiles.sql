-- Presentation preferences never authorize a tool or change account roles.
create table if not exists ca_private.v2_experience_profiles(user_id uuid not null references auth.users(id) on delete cascade,cong_id text not null references public.congregations(id) on delete cascade,preferences jsonb not null,revision bigint not null default 1,primary key(user_id,cong_id));
create table if not exists ca_private.v2_experience_defaults(cong_id text primary key references public.congregations(id) on delete cascade,admin_style text not null default 'balanced' check(admin_style in('calm','balanced','lively')),publisher_style text not null default 'calm' check(publisher_style in('calm','balanced','lively')));
create index if not exists v2_experience_profiles_cong_idx on ca_private.v2_experience_profiles(cong_id);
alter table ca_private.v2_experience_profiles enable row level security;
alter table ca_private.v2_experience_defaults enable row level security;
revoke all on ca_private.v2_experience_profiles,ca_private.v2_experience_defaults from public,anon,authenticated;
create or replace function ca_private.v2_experience_access(p_cong text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong,array['admin','publisher','field_service','group_overseer','attendance','oclm','weekend','attendant','av','cleaning']) then raise exception 'Approved congregation Google account required' using errcode='42501';end if;
end $$;
revoke all on function ca_private.v2_experience_access(text) from public,anon,authenticated;
create or replace function public.ca_v2_get_experience(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare profile ca_private.v2_experience_profiles;defaults ca_private.v2_experience_defaults;begin
 perform ca_private.v2_experience_access(p_cong_id);
 select * into profile from ca_private.v2_experience_profiles where user_id=auth.uid() and cong_id=p_cong_id;
 select * into defaults from ca_private.v2_experience_defaults where cong_id=p_cong_id;
 return jsonb_build_object('preferences',profile.preferences,'revision',coalesce(profile.revision,0),'adminStyle',coalesce(defaults.admin_style,'balanced'),'publisherStyle',coalesce(defaults.publisher_style,'calm'));
end $$;
create or replace function public.ca_v2_save_experience(p_cong_id text,p_preferences jsonb,p_revision bigint) returns bigint language plpgsql security definer set search_path='' as $$declare current_revision bigint;begin
 perform ca_private.v2_experience_access(p_cong_id);
 if jsonb_typeof(p_preferences) is distinct from 'object' or pg_column_size(p_preferences)>10000 or p_preferences - array['style','navigation','density','motion','colorIntensity','charts','background','theme','tone','size','weight','solid','auto','fit','clock']<>'{}'::jsonb then raise exception 'Invalid appearance preferences';end if;
 if coalesce(p_preferences->>'style','') not in('calm','balanced','lively') or coalesce(p_preferences->>'navigation','') not in('classic','rail','tabs') or coalesce(p_preferences->>'density','') not in('comfortable','compact') or coalesce(p_preferences->>'motion','') not in('full','reduced') or coalesce(p_preferences->>'colorIntensity','') not in('soft','vivid') or coalesce(p_preferences->>'background','') not in('static','ambient','off') or jsonb_typeof(p_preferences->'charts') is distinct from 'boolean' then raise exception 'Choose valid experience settings';end if;
 if coalesce(p_preferences->>'theme','') not in('auto','paper','daylight','lagoon','slate','midnight','dusk','glass-lagoon','glass-arctic','glass-aurora','glass-lagoon-dark','glass-sunset','glass-mint-air','glass-ocean-night','glass-graphite') or coalesce(p_preferences->>'tone','') not in('soft','standard','sharp') or coalesce(p_preferences->>'size','') not in('S','M','L','XL') or coalesce(p_preferences->>'weight','') not in('light','regular','bold') or coalesce(p_preferences->>'fit','') not in('auto','compact','comfortable','large') or coalesce(p_preferences->>'clock','') not in('locale','12','24') or jsonb_typeof(p_preferences->'solid') is distinct from 'boolean' or jsonb_typeof(p_preferences->'auto') is distinct from 'boolean' then raise exception 'Choose valid appearance settings';end if;
 perform pg_advisory_xact_lock(hashtextextended('v2-experience:'||auth.uid()::text||':'||p_cong_id,0));
 select revision into current_revision from ca_private.v2_experience_profiles where user_id=auth.uid() and cong_id=p_cong_id;
 if p_revision is distinct from coalesce(current_revision,0) then raise exception 'Appearance was changed on another device. Reload its saved profile before replacing it.' using errcode='40001';end if;
 insert into ca_private.v2_experience_profiles(user_id,cong_id,preferences,revision) values(auth.uid(),p_cong_id,p_preferences,coalesce(current_revision,0)+1) on conflict(user_id,cong_id) do update set preferences=excluded.preferences,revision=excluded.revision returning revision into current_revision;
 return current_revision;
end $$;
create or replace function public.ca_v2_set_experience_defaults(p_cong_id text,p_admin_style text,p_publisher_style text) returns void language plpgsql security definer set search_path='' as $$begin
 perform ca_private.v2_experience_access(p_cong_id);
 if not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator required' using errcode='42501';end if;
 if p_admin_style is null or p_publisher_style is null or p_admin_style not in('calm','balanced','lively') or p_publisher_style not in('calm','balanced','lively') then raise exception 'Choose an experience style';end if;
 insert into ca_private.v2_experience_defaults(cong_id,admin_style,publisher_style) values(p_cong_id,p_admin_style,p_publisher_style) on conflict(cong_id) do update set admin_style=excluded.admin_style,publisher_style=excluded.publisher_style;
end $$;
revoke all on function public.ca_v2_get_experience(text),public.ca_v2_save_experience(text,jsonb,bigint),public.ca_v2_set_experience_defaults(text,text,text) from public,anon,authenticated;
grant execute on function public.ca_v2_get_experience(text),public.ca_v2_save_experience(text,jsonb,bigint),public.ca_v2_set_experience_defaults(text,text,text) to authenticated;
