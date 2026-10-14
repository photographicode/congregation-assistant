# Incident response

1. Record detection time, impacted services and known facts. Preserve platform logs with restricted access; do not copy private records into issues.
2. Contain: revoke exposed links/sessions, disable affected entry points, rotate compromised credentials in Supabase/Cloudflare/Google/email/GitHub as applicable. Deploy a verified fix or rollback.
3. Determine scope: tenants, record categories, time window, evidence of access and whether exports or backups were affected. Separate confirmed facts from unknowns.
4. Notify affected administrators promptly. Aim for initial notification within 72 hours of awareness where applicable; assess legal/regulatory notification obligations rather than assuming a universal rule. Explain what happened, what data may be involved, actions taken and user actions.
5. Verify containment with isolated regression tests, production read-only checks and account review. Do not restore deleted records from backup without reapplying deletion decisions.
6. Publish a factual post-mortem with dates, cause, impact and preventive actions. Retain only the minimum incident evidence required.

Owner verifies dashboard access, backup restoration, alert routing and staffing before launch. This runbook does not prove those operational controls are already active.
