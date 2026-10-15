V1 reference tag: `v1-final`, commit `76978c4fbe56658b8b856cb7218b5c4a212cd1f0`. The reference generators were captured before deletion.

# Native V2 parity

Release gate: **not satisfied**. A checked item means the stated scope has a local implementation and a specific local test. It does not imply real backend acceptance. No row relies on a V1 link or iframe in the generated app. Unchecked rows are missing work, not silently completed capabilities.

| V1 capability | Native V2 route/component | Evidence / remaining gate |
| --- | --- | --- |
| SuperAdmin congregation filters, provisioning/editing, notices, workspace requests, launch offer | OwnerConsole directory, create/edit/billing, requests and account management | Six local browser cases pass; deletion, notices, module switches and live owner-role acceptance remain |
| Monthly home, RP/AP logs, submission logs, bulk entry, missing reminders | Dashboard; Reports bulk/CSV/year logs; native user-initiated reminders | Real queries, filters and one-click bulk launch verified in fictional desktop/phone review. AP revoke/mapping, attendance/group trends, widgets and live role acceptance remain |
| Publishers search, add/edit, group selection, household login | People / Workspace | Existing V2 model/browser checks; extended fields and delete/undo missing |
| Family head, emergency fields, spiritual status and appointments | People → Household, emergency contact & publisher record | Native fields and atomic extended contract verified on isolated Postgres; additive migration applied to Supabase 14 October 2026 |
| Single/batch S-21, S-3, S-88 and emergency PDFs | Print & PDF; native real-template engine | 17 real golden fixtures, font/template contracts and eight-script generation pass; intentional Latin font delta documented in PDF-PARITY.md |
| Emergency contact table | Emergency Contacts; Print & PDF → Emergency contacts | Native search/household/phone/CSV and direct PDF selection; measured desktop two-click reachability passes. Mobile acceptance remains |
| Rolling analytics and detailed monthly roster | Reports summary and submitted list | Rolling analytics/filter/export missing |
| Weekly midweek/weekend counts | Reports → Attendance | Native repository and demo screen; live RLS/backend save contract unverified |
| Attendance calendar, exceptional meetings, attendants and public attendance | PublicForm attendance uses server-fixed meeting context | Calendar/attendant UI and abuse-limit acceptance missing |
| Monthly service reports, studies, hours, comments and corrections | Reports; existing save_congregation_reports RPC | Demo submission smoke; live duplicate/concurrency and RLS matrix pending |
| Publisher/household reports | PublisherHome, Reports; get_my_family_report + submit_family_report | Publisher demo smoke; real account/expected-record test pending |
| Group overseer view, bulk group reports | Reports bulk → assigned-group save_group_reports; Access group selection | Demo scoped roster and bulk browser check pass; real group RLS/concurrency acceptance remains |
| Approved roles and account management | Access, native RLS-controlled access rows | Demo UI; live role/revoke, assistant grants and last-admin protection pending |
| Scoped public report/attendance links | Access and PublicForm; token in fragment | Live expiry/abuse, report session reload and revocation UI pending |
| Midweek private draft, assignments and publish | Midweek; established get/save/publish RPCs | Demo smoke; live optimistic revision and full program/parity verification pending |
| Additional/custom duties and department ownership | Midweek additional duties draft | Full independent department adoption/approvals and permissions missing |
| Public schedule/name search; history/rollback | PublicForm schedule rendering | Name search, public polling, history and rollback UI missing |
| Weekend chairman, songs, custom title, speaker, conductor/reader, duties | Existing native Weekend editor; PublicForm weekend | Local demo/model and server SQL source tests; live public-session refresh/PDF/history pending |
| Appearance themes and accessibility | Settings → Experience/theme gallery, Layout Doctor | Calm/Balanced/Lively + 14 theme contrast sets in 83 unit checks; six dashboard cases pass. Account-scoped device persistence; real cross-device acceptance, interactive previews and complete performance matrix remain |
| CSV/vCard import review and undo | People → Import | Parser, import and formula-safe CSV checks; JSON/CSV records archive includes native groups/weekend/setup. Report CSV import reviews identity, month and totals; bulk/CSV/browser acceptance passes. |
| Subscription details, expiry, renewal and trial | Subscription details and server-backed lock screen | Server status and expired-admin export identity tested; operator renewal uses existing controlled billing contract. |
| Encrypted backup/restore and portable export | Settings → Backup; existing export/restore RPC + Argon2id AEAD | Cryptographic round-trip plus formula-safe native records archive; V2 recovery-format parity still pending |
| Feedback, wipe-data confirmation | Support mail link | Wipe transactional backend and native confirmation missing |
| Announcements and role-specific help | Website guide and support link | Announcements UI missing; guide still contains historical V1 instructions |
| Device reminders, notifications and calendar export | No complete native reminder settings | Unchecked |
| Install and About | Manifest, Settings instructions, website Android guide | Local manifest/static checks; install event/APK signing/store release missing |
| Admin/publisher fictional demo isolation | main, Reports, Midweek, PublisherHome | Browser rejects any backend request |
| E2EE Private mode | Cryptographic core only; flag off | Complete device/key/recovery/migration/revocation/sentinel lifecycle missing |
| Authorized official-content import | JW_IMPORT_ENABLED off | Authorization wording/pipeline and kill-switch acceptance missing |
| WhatsApp Smart Share | Existing native Messages template/queue | Full consent/opt-out/broadcast and account permission acceptance pending |

## Explicit remaining release checklist

- [x] App output is V2 at the root; production bundle has no bridge/V1 iframe or link.
- [x] Greeting boundaries, timezone rollover, DST and included language strings have unit tests.
- [x] Remove V1 reports and midweek iframe rendering from native screens.
- [x] Build separate app and website artifacts; centralize intended domain/support configuration.
- [ ] Complete every native capability in the matrix above.
- [ ] Remove all V1 repository files and duplicate trees after the native parity proof.
- [ ] Verify every real role and anonymous API, including group/department scope and abuse limits.
- [x] Prove old service-worker replacement and visible update through reduced browser tests.
- [ ] Pass the complete expanded layout, keyboard, visual and performance acceptance matrices.
- [x] Port and verify template PDFs and eight supported Indian scripts; review intentional font differences.
- [ ] Finish E2EE lifecycle before enabling its claims.
- [ ] Resolve PRs #7 and #37 and update issue #39 through a writable GitHub connection.
- [ ] Publish, verify root and /v2 redirects, attach custom domains, then verify TLS/OAuth.

## Revival acceptance — 15 October 2026

The current candidate is for owner review. Existing main/V1 remains the release default until all `v2.screen.*` flags pass. `v2-screen-flags.json` records whole-screen acceptance separately from partial implementation. No screen is declared complete merely because its route opens.

The frozen-tag inventory is `docs/review-evidence/v1-action-inventory.json`. The brief's explicitly named list contains 104 distinct handlers (after expanding shorthand groups; its heading says 109); five obsolete password handlers are intentionally replaced. `reachability.json` currently measures nine desktop actions in zero to two clicks, with 90 requested actions still lacking acceptance. Phone reachability remains separate. The harness exits nonzero with `--release` until the remaining rows are resolved.

`supabase/ALL-V2.sql` combines thirteen ordered additive migrations, excludes destructive auth removal, and passed first/repeat application against the isolated Postgres baseline. `ALL-V2.down.sql` intentionally blocks automatic rollback because a complete safe inverse of the shared function replacements has not been implemented; use a verified pre-migration backup. This does not satisfy the requested full reversible-down gate.


Experience profiles/defaults now have an additive server contract: own-account/congregation isolation, allowlisted presentation-only fields, stale-revision conflict, and admin-only default changes. Isolated SQL and fictional save/restore/default browser controls pass. Migration applied 15 October 2026. Real Google cross-device acceptance remains required. Device overrides are preserved; account saving is explicit.

Four dashboard-counter fixtures were captured by executing the original frozen V1 renderDashboard with synthetic snapshots; native counters match all four, including pioneer precedence, zero/missing reports and inferred legacy participation.
