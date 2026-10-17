-- Only the authenticated account's session metadata; never bearer/refresh tokens.
create or replace function public.ca_v2_own_sessions() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to view your sessions' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'createdAt',s.created_at,'lastActiveAt',s.updated_at,'device',left(coalesce(s.user_agent,'Browser session'),300)) order by s.updated_at desc),'[]') from auth.sessions s where s.user_id=auth.uid() and(s.not_after is null or s.not_after>now()));
end $$;
revoke all on function public.ca_v2_own_sessions() from public,anon,authenticated;
grant execute on function public.ca_v2_own_sessions() to authenticated;
