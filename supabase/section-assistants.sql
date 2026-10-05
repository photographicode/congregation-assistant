-- Assistants receive the same explicitly assigned section role, never admin access.
alter table public.congregation_access add column if not exists is_assistant boolean not null default false;
alter table public.congregation_access add constraint ca_assistant_section_only check(not is_assistant or role<>'admin');
