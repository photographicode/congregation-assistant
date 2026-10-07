# Independent weekly notice board — reviewed rollout and recovery plan

**Draft only. No live migration or deployment performed.** The uploaded master prompt §2.3 authorizes draft work, not merging, deploying, changing real records or production encryption keys. Latest product instructions are implemented for review; Cleaning now also requires eligibility approval.

## Data and permission boundaries

Each of AV, Attendant and Cleaning has a separate private workspace and revision, and per-week publication version/history. Its overseer and authorized assistants can edit its own draft; assistants cannot publish without an ordinary overseer grant. Only the main administrator approves publisher eligibility. People must already belong to the congregation and not be transferred. All direct private table access is denied to anon/authenticated; guarded functions provide the limited projection.

OCLM remains independently revision-checked. Department saves neither update nor increment OCLM drafts. Publishing a department takes the OCLM publication lock only to create/touch the existing stable shared token, not to publish meeting parts. OCLM publication cannot overwrite department snapshots. The public board merges published snapshots only, shows Not assigned where a department is absent, and removes finished ISO weeks in congregation time without deleting stored history. Its polling revision also changes at week rollover. Recovery downloads are optional for ordinary publishing; stale writes cannot bypass review.

## Additive adoption

- Apply against the verified current schema, in order: existing required baseline modules; `independent-noticeboard.sql`; `transfer-public-links.sql`; `workspace-applications.sql` if included in this release; `department-drafts.sql`; `noticeboard-attention.sql`.
- Original OCLM JSON, roster identities, revisions, stable tokens and published week records remain. Existing department duties are adopted with the same IDs and legacy scheduler identity, linked to its actual publisher ID.
- Already published Cleaning schedules are preserved. Future Cleaning choices/publications now require approved eligibility; they are not automatically granted approval during migration.
- New exports include independent workspaces/publications/history. Recovery advances counters and preserves current public tokens. Restoring cannot reactivate a transferred publisher.
- Date-specific events are not implemented in the weekly UI. An inactive events dataset is preserved; publishing refuses unsupported dated events rather than hiding them. Complete separate midweek/weekend/custom sessions before advertising that broader feature.

## Before any live activation

1. Recheck main/draft commit hashes, deployed assets, actual schema and advisors. Record table/revision/token counts without exposing real records. Complete current-commit hosted Chromium/WebKit tests and younger/older human acceptance.
2. Export a full operator database backup and the congregation's password-encrypted export using their authorized process. Verify restoration in an isolated authorized environment. No real record copies enter public CI or screenshots.
3. Review the exact SQL and hosting diffs, access changes, maintenance window and recovery owner. Apply no SQL until that concrete release is authorized. Never run `scripts/check-*.sql` or `scripts/seed-*.sql` against a real database: they are fictional acceptance fixtures.
4. During the reviewed maintenance window, pause affected editing, install all required modules, verify additive adoption/guards, and publish the matching client bundle. The module files have explicit transactions; they are not an automatically atomic bundle. Do not allow clients to use partially installed RPCs.
5. Smoke test existing token, previously published OCLM week, own-department drafts, main-admin eligibility, failed/stale save retention, transferred exclusion, own backup/restore and an empty workspace's help link. Enable writes only after passing. Preserve sender inactivity and encryption-disabled state.

## Recovery boundaries

Before any new independent department writes, the retained original OCLM JSON provides an adoption rollback source. Restore the reviewed prior compatible function/client definitions only after comparing counts and hashes; do not drop the added tables/columns or revoke records/history.

After new independent writes, the old coupled functions would edit stale legacy JSON and are **not** a safe rollback. Keep the new stored drafts, publication snapshots/history and tokens. Pause the affected editor, keep the public board/read access available, and restore a reviewed compatible independent RPC version or roll forward a repair. If a schema/API issue prevents that, use the verified isolated restore to prepare a concrete recovery plan and obtain authorization before changing live data. Never delete the new department data to make a rollback appear successful.

Encryption has its own separate review plan in `docs/encryption/review-plan.md`; no encryption migration is included here. Queue readiness is not delivery: sender/domain/VAPID configuration and actual delivery tests remain separate prerequisites.
