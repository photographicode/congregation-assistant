-- Roll back V4 source first. Export V4 announcement/notification rows before running.
begin;
drop trigger if exists v4_publisher_contact_changed on public.publishers;
drop function if exists ca_private.v4_contact_changed();
drop function if exists public.ca_v4_announcements(text),public.ca_v4_publish_announcement(text,text,text),public.ca_v4_archive_announcement(text,uuid),public.ca_v4_admin_notifications(text),public.ca_v4_read_notification(text,uuid);
drop table if exists ca_private.v4_contact_notifications,ca_private.v4_announcements;
commit;
