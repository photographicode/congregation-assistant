-- Map links up to 2,000 characters: the generator's own map page carries the outline and the locality in the link,
-- and with long locality names it runs past 500.
alter table public.tm_territories drop constraint if exists tm_territories_map_url_check;
alter table public.tm_territories add constraint tm_territories_map_url_check check(map_url is null or (length(map_url)<=2000 and map_url ~ '^https://[^[:space:]]+$'));
