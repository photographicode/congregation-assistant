# Native V2 parity

Release gate: **not satisfied**. A checked item means the stated scope has a local implementation and a specific local test. It does not imply real backend acceptance. No row relies on a V1 link or iframe in the generated app. Unchecked rows are missing work, not silently completed capabilities.

| V1 capability | Native V2 route/component | Evidence / remaining gate |
| --- | --- | --- |
| SuperAdmin congregation filters, provisioning/editing, notices, workspace requests, launch offer | No native command centre yet | Unchecked; migrate established owner RPCs and test approved Google-only owner |
| Monthly home, RP/AP logs, submission logs, bulk entry, missing reminders | Home greeting; Reports summary/list/editor | Bulk entry, RP/AP maps and real reminder delivery missing |
| Publishers search, add/edit, group selection, household login | People / Workspace | Existing V2 model/browser checks; extended fields and delete/undo missing |
| Family head, emergency fields, spiritual status and appointments | No complete native extended person form | Unchecked; atomic expanded person contract needed |
| Single/batch S-21, S-3, S-88 and emergency PDFs | Browser-print schedule/roster/attendance only | Unchecked; official-form PDF pipeline and Indic shaping not ported |
| Emergency contact table | No native dedicated route yet | Unchecked |
| Rolling analytics and detailed monthly roster | Reports summary and submitted list | Rolling analytics/filter/export missing |
| Weekly midweek/weekend counts | Reports → Attendance | Native repository and demo screen; live RLS/backend save contract unverified |
| Attendance calendar, exceptional meetings, attendants and public attendance | PublicForm attendance uses server-fixed meeting context | Calendar/attendant UI and abuse-limit acceptance missing |
| Monthly service reports, studies, hours, comments and corrections | Reports; existing save_congregation_reports RPC | Demo submission smoke; live duplicate/concurrency and RLS matrix pending |
| Publisher/household reports | PublisherHome, Reports; get_my_family_report + submit_family_report | Publisher demo smoke; real account/expected-record test pending |
| Group overseer view, bulk group reports | Existing server group access remains; no complete native UI | Unchecked; group-scoped contract needed |
| Approved roles and account management | Access, native RLS-controlled access rows | Demo UI; live role/revoke, assistant grants and last-admin protection pending |
| Scoped public report/attendance links | Access and PublicForm; token in fragment | Live expiry/abuse, report session reload and revocation UI pending |
| Midweek private draft, assignments and publish | Midweek; established get/save/publish RPCs | Demo smoke; live optimistic revision and full program/parity verification pending |
| Additional/custom duties and department ownership | Midweek additional duties draft | Full independent department adoption/approvals and permissions missing |
| Public schedule/name search; history/rollback | PublicForm schedule rendering | Name search, public polling, history and rollback UI missing |
| Weekend chairman, songs, custom title, speaker, conductor/reader, duties | Existing native Weekend editor; PublicForm weekend | Local demo/model and server SQL source tests; live public-session refresh/PDF/history pending |
| Appearance themes and accessibility | Settings, Layout Doctor | Unit contrast checks and browser matrix |
| CSV/vCard import review and undo | People → Import | Existing parser/model tests; comprehensive report CSV and sample download integration pending |
| Subscription details, expiry, renewal and trial | No complete native billing/lock screen | Unchecked |
| Encrypted backup/restore | Settings → Backup; existing export/restore RPC + Argon2id AEAD | Cryptographic round-trip test; complete live backup schema/restore acceptance pending |
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
- [ ] Port and verify official-form PDFs for English, Hindi, Malayalam and Tamil.
- [ ] Finish E2EE lifecycle before enabling its claims.
- [ ] Resolve PRs #7 and #37 and update issue #39 through a writable GitHub connection.
- [ ] Publish, verify root and /v2 redirects, attach custom domains, then verify TLS/OAuth.
