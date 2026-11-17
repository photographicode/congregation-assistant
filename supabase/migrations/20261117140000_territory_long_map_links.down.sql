-- Back to 500-character map links. Fails if a longer link is saved; shorten or clear those first.
alter table public.tm_territories drop constraint if exists tm_territories_map_url_check;
alter table public.tm_territories add constraint tm_territories_map_url_check check(map_url is null or (length(map_url)<=500 and map_url ~ '^https://[^[:space:]]+$'));
