# Retention and deletion

Current stored workspace records persist until an authorized deletion is processed. Publishers and assignments have no universal automatic expiry. Monthly service reports retain the current and previous complete service year, based on the congregation timezone; older rows are purged by the registered retention job. Report imports/restores outside that window are rejected. Provider backups and downloaded copies need separate handling. Bearer-link expiry/revocation follows the corresponding scoped-link contract. Import undo batches and saved drafts also require a documented cleanup policy before commercial launch.

Administrators can download a complete server export and an encrypted backup. Downloaded copies are outside service control: recipients must delete their own copies. Restoring a backup creates records again and requires authorization.

Self-service congregation deletion and propagation into provider backups are not yet verified. The current public policy therefore directs deletion requests to the administrator and support; it does not promise immediate erasure. A deletion procedure must first export if requested, revoke links and account access, remove active records atomically, and record completion without retaining deleted personal content. Provider backup retention depends on the actual Supabase plan/configuration and must be confirmed by the owner; backups can retain deleted records until expiry. Restores must reapply the deletion register.

Do not claim a 7/30/90-day backup purge without provider evidence and a tested deletion workflow. The service operator remains technically able to access Standard-mode database records.
