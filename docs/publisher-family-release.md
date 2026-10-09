# Publisher simplicity and approved family reporting

Existing report-link forms retain their markup and styling. The signed-in report page clones that same form, excludes the unnecessary congregation-wide service-group selector, and limits its publisher dropdown to approved report recipients. A lasting saved confirmation prevents repeated submissions; corrections remain available.

## Access boundaries

The first publisher connected to an approved Google email remains that email's personal account. An administrator may put the same email in another publisher record to approve reporting for that person. This permission covers only the selected person's current reporting month and report submission. It does not grant contacts, away dates, private reminders, attendance permissions, appointments, or dates. The private approval table is not exposed through the Data API. Tenant membership, verified Google identity, principal revocation, target transfer status and optimistic report conflicts are enforced on the server. Existing links and roles remain supported.

Transferred principals lose account access, including family reporting. A transferred family member is removed from the report list. Clearing that person's approved email revokes their report permission. Backups list report approvals for review, but restoring an older backup cannot reactivate revoked approvals.

## Interface

Publisher pages use Home, Assignments, Schedule and Report, with Settings at the top. A compact next-assignment card and one obvious report action replace the stacked all-purpose page. Seven existing themes and larger-text settings remain available. Navigation wraps into two columns for large text, and notifications remain above it. OCLM part titles are readable headings; the title-edit field is secondary. Repeated last-assignment history lookups are cached within each scheduling render without changing qualification, availability or recency ordering.

The design uses familiar labelled navigation and text settings, informed by JW Library's Android help and W3C reflow/resize guidance:
- https://www.jw.org/en/online-help/jw-library/android/features/
- https://www.jw.org/en/online-help/jw-library/android/customize-reading/
- https://www.w3.org/WAI/WCAG21/Understanding/reflow
- https://www.w3.org/WAI/WCAG21/Understanding/resize-text

## Rollout and recovery

`docs/publisher-family-atomic.sql` installs the reviewed module inside one transaction. It takes a private snapshot of the four replaced function definitions and existing policy definitions, briefly locks congregation tables against writes, and verifies every existing public/private row fingerprint and policy before commit. The new private report-approval table starts empty. No existing grants, records, history, publications or personal account bindings are rewritten. The release source commit is supplied at deployment.

Before merge, run SQL contracts, meaningful app/PDF/recovery checks, Chromium/WebKit browser checks and hosted readiness. Apply the tested database release before shipping its client. A failed transaction rolls back. For a later rollback, restore the four saved definitions and revoke new report-function execution before considering deletion of new objects. Retain any newly created approvals for review; do not drop their table after users have begun approving access. Restoring an earlier client does not revoke approvals by itself.

## Validation and limits

Fixtures contain fictional people only. Tests cover tenant isolation, selected-report authorization, principal and delegated transfers, revocation, stale-save protection, existing report IDs, older backup restore, failed-save recovery, slow saves, double submission, navigation during saving, enlarged text, themes and searchable schedules. Browser handler timing measures local UI work, not end-to-end network latency.

Background email/push delivery remains inactive pending provider configuration. This release does not activate encryption, migrate publisher data, change providers or billing, or publish unapproved policy wording. Physical Realme 12/iPhone testing and acceptance by younger and older users remain separate release acceptance work; browser simulation does not prove every device or browser combination.
