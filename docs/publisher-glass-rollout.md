# Publisher appearance, recovery and complete-service-year retention release

Start from app main eb562f46be26c72a5646835a6095908849d34694 and website main b8b8eeaa77b96cc63392f4c0c16e06ed2f7c354c. Preserve unrelated repository changes.

## Authorized report policy

The user confirmed permanent removal of older complete service years each September. Keep the current service year and previous service year, using each congregation’s meeting timezone (Asia/Kolkata when unset). No rolling-month deletion. As of 9 October 2026, live reports contain two rows in ending year 2026 and two in 2027; no expired rows. Two private release snapshots contain report-row copies, all also within these years. No publisher information was read for this count.

Core installation adds a server write trigger, private cutoff/cleanup helpers and approved-account policy-status RPC. Backup exports exclude expired years. Restores/imports cannot reintroduce them. The UI leaves expired backup rows out and reports this at review. A named pg_cron task checks daily at 00:10 UTC so missed September runs can catch up; its cutoff changes only each local September 1. It removes expired live report rows and report copies in app-managed private rollback snapshots. It changes no publishers, attendance, schedules, access or links. Hosting-provider backups follow provider cycles; downloaded files are outside app control. Do not claim universal immediate deletion from every backup.

## Other release changes

Scoped publisher appearances (default neutral glass), subtle motion with reduced-motion support, separate publisher palette, public-website referral, congregation name and group-overseer record-correction guidance. Modern admin navigation and SuperAdmin panels. Main interface font Noto Sans with self-hosted WOFF2 files; original official document fonts stay in place.

Main-admin reminder RPC targets only approved active publisher personal accounts, excluding transferred records. It preserves personal reminders, uses revision conflict protection and idempotent request IDs. Email and push delivery remain inactive.

Backup/recovery allows one operation at a time, preserves inputs after failure and suppresses stale-session results. Combined CSV uses the existing atomic workspace-restore transaction and current export fingerprint. The merge keeps all unrelated snapshot fields; a conflict rolls back the import. Sample CSV files contain fictional values and grant no account access.

## Release procedure

1. Pass isolated application, Chromium/WebKit, accessibility and PostgreSQL contracts, including restoration and September-boundary cases. Inspect screenshots containing fictional fixtures only.
2. Apply docs/publisher-glass-atomic.sql with the source commit inserted. The transaction takes a private function rollback snapshot, locks affected workspace writes briefly, and checks all existing table fingerprints and policies are unchanged. It does not clean up live records during installation.
3. Apply supabase/report-retention-cron.sql only after core installation. Confirm the named task is active and private helpers are not executable by public clients. Run a monitored cleanup check: initial expected removal count is zero. Recheck report counts and security advisors.
4. Merge the tested app and site changes through existing GitHub Pages hosting. Root and staging assets must agree with their manifests. Verify live PDF, font and CSV bytes as well as phone/desktop flows.
5. Keep policy publication separate until the owner approves the revised Privacy Policy and Terms. Actual email/push activation and physical-device/human testing remain separate acceptance work.

## Rollback limits

Before any scheduled deletion, UI changes can revert to the previous commit. Disable only the named cleanup job if it fails; do not disable pg_cron or unrelated tasks. Dropping the write trigger and new functions requires reviewing dependencies first. Restore the previous export function from the private release snapshot if required. Scheduled permanent report removal cannot be undone without an authorized backup still within the retention policy; do not keep an indefinite copy to defeat the retention decision.
