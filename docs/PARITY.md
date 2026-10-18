# Customer front door and V1 parity

The generated Pages artifact serves the public website at `/` and the sole native product at `/app/`. Both current repositories use this structure. Evidence: `scripts/build-pages.mjs`, `docs/qa/NEXT-DEPLOYMENT.json`, successful deployment runs 39073120817 and 39073165965. Repository-root `index.html` is retained legacy source, not the Actions artifact. Competing branch publishing remains a risk until the owner selects Actions in Pages settings; the workflow cannot change that setting (HTTP 403).

✔ means the stated capability has implementation and recorded tests. ✖ means complete V1 acceptance remains unproved; partial implementation is described. Neither a demo nor a route proves backend permissions.

| V1 capability | Acceptance | Evidence or remaining work |
|---|---|---|
| Dashboard | ✖ | Four frozen V1 counter fixtures match; full role/widget parity remains open. |
| Service reports | ✖ | Quarter hours, participation, correction and failed-submit retention pass targeted browser tests. V1 offline/duplicate/whole-flow parity remains open. |
| Bulk entry | ✖ | Native bulk/CSV review exists; complete group/role acceptance remains open. |
| Chase/remind | ✖ | Native user-initiated reminders exist; full consent and scheduled-reminder parity remains open. |
| AP review log | ✖ | Monthly review and CAS revoke preserve report data; Undo/audit acceptance from POLISH orders remains open. |
| S-21 / S-3 / S-88 / emergency PDFs | ✔ | Seventeen real-template golden fixtures and native PDF/font contracts; 26 direct-download browser cases. |
| Attendance | ✖ | Native entry and scoped public meeting contract exist; full calendar/abuse/attendant acceptance remains open. |
| Midweek | ✖ | Source import, draft persistence, picker/repeats and conditional auxiliary outputs tested; expanded classroom/picker parity remains open. |
| Weekend | ✖ | Native editor, public/PDF output and talk-history checks; same-day caution restoration remains open. |
| Duties | ✖ | Approved pools and assignments implemented; cross-module same-day caution acceptance remains open. |
| Access/roles | ✖ | Native access and SQL isolation fixtures; complete approved-account/provider/revocation acceptance remains open. |
| Import/export | ✖ | CSV/JSON native export and import validation exist; complete V1 acceptance remains open. |
| Backup/restore | ✖ | Encryption round-trip passes; full recovery-format parity remains open. |
| SuperAdmin | ✖ | Native directory/provisioning/billing/request editor; full deletion/notices/module-switch acceptance remains open. |

Frozen V1 reference: `v1-final` at `76978c4fbe56658b8b856cb7218b5c4a212cd1f0`. It is immutable. Detailed historical acceptance and reference inventory remain in `history/PARITY-before-polish.md` and `review-evidence/v1-action-inventory.json`.

Legacy removal is not complete: the owner requires missing V1 behavior to be restored before removing its implementation. No legacy files are copied into the native production bundle. Section 1 remains open until restoration, repository cleanup and all gates pass. No complete-product claim is made.
