-- Read-only. Provider-managed auth credentials are intentionally excluded.
do $$
declare found text;
begin
 select string_agg(format('%I.%I.%I',table_schema,table_name,column_name),', ')
 into found from information_schema.columns
 where (table_schema='public' or table_schema like 'ca\_%' escape '\')
 and column_name ilike '%password%';
 if found is not null then raise exception 'Application password storage remains: %',found;end if;
end $$;
