# Schema and code data map

Generated from tracked create-table statements by scripts/build-data-map.mjs. ALTER statements and operational configuration require review; this inventory is not a live production-schema assertion.

| Table | Declared fields | Source |
|---|---|---|
| ca_private.department_duties | cong_id, id, department | supabase/collaborative-departments.sql |
| ca_private.department_people | cong_id, department, publisher_id, status, requested_by, decided_by, updated_at | supabase/collaborative-departments.sql |
| ca_private.department_publication_history | cong_id, department, week, version, snapshot, created_at, actor | supabase/department-drafts.sql |
| ca_private.department_publications | cong_id, department, week, version, snapshot, updated_at, actor | supabase/independent-noticeboard.sql |
| ca_private.department_workspaces | cong_id, department, revision, data, updated_at, actor | supabase/department-drafts.sql |
| ca_private.mail_outbox | id, dedupe, email, subject, body, created_at, available_at, state, attempts, lease, provider_id, sent_at | supabase/onboarding-mail.sql |
| ca_private.owner_bootstrap | username, password_digest | supabase/owner-bootstrap.sql |
| ca_private.public_app_config | singleton, values | supabase/migrations/20261014121628_v2_configured_mail_links.sql |
| ca_private.publisher_preferences | cong_id, publisher_id, revision, reminders, updated_at | supabase/publisher-portal.sql |
| ca_private.publisher_report_access | cong_id, email, publisher_id, active, created_at | supabase/publisher-family.sql |
| ca_private.push_outbox | id, subscription_id, dedupe, title, body, attempts, next_attempt, lease, leased_at, delivered_at | supabase/server-push.sql |
| ca_private.push_subscriptions | id, user_id, cong_id, email, endpoint, subscription, preferences, created_at | supabase/server-push.sql |
| ca_private.trial_requests | id, user_id, email, congregation_name, created_at, cong_id, status | supabase/onboarding-mail.sql |
| ca_private.v2_import_batches | id, cong_id, actor, people, created_at, undone_at | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.v2_public_limits | token_hash, bucket, hits | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.v2_setup | cong_id, step, data, updated_at | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.weekend_history | id, cong_id, week, revision, snapshot, actor, created_at | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.weekend_publications | cong_id, week, token_hash, snapshot, revision, updated_at | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.weekend_sessions | token_hash, publication_hash, expires_at | supabase/migrations/20261013123305_v2_weekend_sessions.sql |
| ca_private.weekend_weeks | cong_id, week, revision, data, updated_at, updated_by | supabase/migrations/20261013112323_v2_foundation.sql |
| ca_private.workspace_applications | id, contact_name, contact_email, admin_email, congregation_name, phone, created_at, status, cong_id, reviewed_by | supabase/workspace-applications.sql |
| ca_private.workspace_mail | cong_id, email, enabled, published, reports, oclm, oclm_day, timezone | supabase/onboarding-mail.sql |
| public.ca_meeting_calendar | cong_id, meeting_date, kind | supabase/attendance-calendar.sql |
| public.ca_meeting_settings | cong_id, timezone, midweek_day, weekend_day | supabase/attendance-calendar.sql |
| public.ca_memorial_attendance | cong_id, meeting_date, service_year, attendance | supabase/attendance-calendar.sql |
| public.ca_oclm_assignment_events | id, cong_id, revision, week, slot, assignment_type, previous_person, person_id, status, created_at, actor | supabase/shared-oclm.sql |
| public.ca_oclm_publication_history | cong_id, version, snapshot, action, week, created_at, actor | supabase/shared-oclm.sql |
| public.ca_oclm_publications | cong_id, token, snapshot, updated_at | supabase/fresh-project.sql |
| public.ca_oclm_workspaces | cong_id, revision, data, updated_at, updated_by | supabase/shared-oclm.sql |
| public.ca_public_links | token, cong_id, kind, service_group, pub_id, active, expires_at, created_at | supabase/fresh-project.sql |
| public.ca_superadmins | email, active | supabase/fresh-project.sql |
| public.congregation_access | id, cong_id, email, role, active, created_at | supabase/google-access.sql |
| public.congregations | id, name, admin_password, status, trial_days, created_at, payment_date, feature_attendance, feature_emergency_contacts, feature_oclm, email, notes, wipe_requested_at, wipe_device_info | supabase/fresh-project.sql |
| public.group_access | id, cong_id, service_group, password | supabase/fresh-project.sql |
| public.meeting_attendance | id, cong_id, service_year, month, w1_mid, w1_end, w2_mid, w2_end, w3_mid, w3_end, w4_mid, w4_end, w5_mid, w5_end | supabase/fresh-project.sql |
| public.publishers | id, cong_id, name, service_group, gender, hope, dob, baptized, is_elder, is_ms, is_rp, is_sp, is_fm, phone, address, emergency_name, emergency_relationship, emergency_phone, spiritual_status, family_head_id | supabase/fresh-project.sql |
| public.reports | id, cong_id, pub_id, service_year, month, shared_in_ministry, studies, hours, comments, is_ap | supabase/fresh-project.sql |
| public.service_groups | id, cong_id, name, name_key, overseer_publisher_id, assistant_publisher_id, archived_at, created_at | supabase/migrations/20261013112323_v2_foundation.sql |
| public.wipe_requests | id, cong_id, requested_at, device_info | supabase/fresh-project.sql |

## Purpose, access and retention

Publisher records contain identity, contact details, date of birth, baptism and congregation/household information. Ministry reports, attendance and assignments support authorized congregation administration and can reveal sensitive religious association. Account/access rows hold approved Google emails and role scope. Scoped tokens are used for limited reporting or schedules. Encrypted backup exports are processed on the user's device.

App code uses Supabase for persistence and Google sign-in; repository boundaries scope queries by congregation and validate key contracts. Assigned roles, household grants and public-link context restrict application access. The Standard-mode service operator remains technically able to reach stored records through production credentials.

Supabase: database/Auth, configured Mumbai region. Cloudflare: planned domain hosting. Sites: owner-only fictional review. Google: account identity. Titan: support correspondence. User-chosen WhatsApp/sharing app: receives only what the user shares. No advertising or analytics tracker is loaded by native app/site code.

Publishers/assignments have no universal automatic expiry. Monthly reports retain the current and previous complete service year; a registered purge job removes older rows. See DATA-RETENTION.md for active records, exported copies, backups and deletion gaps. The administrator must minimize entries, obtain appropriate authorization and act on access/correction/deletion requests.
