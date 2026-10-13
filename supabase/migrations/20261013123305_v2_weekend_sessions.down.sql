begin;
drop function public.ca_v2_exchange_weekend(text),public.ca_v2_weekend_session(text);
drop table ca_private.weekend_sessions;
commit;
