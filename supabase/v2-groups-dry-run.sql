-- Read only. Inspect normalization merges before applying the foundation migration.
select cong_id,lower(regexp_replace(btrim(service_group),'\s+',' ','g')) as normalized_group,
 count(*) as people,array_agg(distinct service_group) as original_names
from public.publishers where nullif(btrim(service_group),'') is not null and transferred_at is null
group by cong_id,lower(regexp_replace(btrim(service_group),'\s+',' ','g')) order by cong_id,normalized_group;
