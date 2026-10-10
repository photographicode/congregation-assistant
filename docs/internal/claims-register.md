# Claims register — first review, not release approval

This register records verified implementation evidence and gaps. A working local fixture is not proof of live delivery or universal accessibility. WP5 remains incomplete until all public copy, About/sign-in copy and catalogue claims have been inventoried.

| Claim | Evidence | Finding / permitted wording |
| --- | --- | --- |
| Independent development by a brother based in India serving full-time | Owner-provided founder information in conversation | Attribute only these supplied facts; do not add names, affiliations, endorsements or spreadsheet biography. |
| Official or organisation-endorsed application | No evidence; owner explicitly requests unofficial status | Say it is independent, not official and not endorsed. |
| Account requests submit directly | site.js submit_workspace_application; scripts/check-site.cjs intercepted success fixture; supabase/workspace-applications.sql | Old email-draft instruction removed. Live success requires existing backend availability; do not promise instant approval. |
| Welcome email delivery works | Existing mail outbox implementation; owner confirms sender/domain unconfigured | Not verified. State queued/prepared, not delivered. |
| Background push works on every device/browser | Provider setup and real delivery not verified; browser/platform restrictions exist | Unsupported. Keep activation and device limitations explicit. |
| Two service years retained | Existing retention logic and service-year tests; owner authorized complete older-year deletion each September | Say current and previous service year, not two complete years or rolling 36 months. Downloaded copies require separate handling. |
| Original printed record/attendance exports | record-exports.js; check-app.cjs; PDF raster/bounds tests and original-form inventory | Original software-generated layouts, not official forms. Printer/physical and legal acceptance pending. |
| Encrypted backups mean end-to-end encrypted database | Record-envelope/export implementation does not establish E2EE | False equivalence. Distinguish export encryption; production E2EE inactive. |
| Developer/service administrators can only access records on request | Existing privileged backend paths; enforcement changes not completed | Unsupported restriction. Preserve truthful privileged-access disclosure. |
| Larger text always works on all phones | Chromium samples and prior accessible-layout tests only | Describe supported larger text and tested configurations; do not claim every device or zero flaws. |
| Domain, mailbox and sign-in are ready | Owner confirms purchase only; nothing configured | Domain purchased. DNS, mailbox, OAuth rotation and redirect tests pending. |
| Strict CSP / all anti-abuse protection active | WP7 not completed or deployed | Do not advertise as active. |
| Privacy Policy / Terms approved | Owner requested changes before publication | Draft only. No unapproved retention, deletion, refund or incident-response promises. |

## Outstanding review

Inventory every factual sentence in the website, practical guide/catalogue, app About, sign-in, README and demonstration screens. Link specific source/test evidence; mark unsupported claims removed or needs proof. Trial authorization identity/role/date persistence must be server-backed and reviewed before publication. Payment/price and legal commitments remain WP9 owner decisions. No testimonials, certifications, guarantees or endorsements may be inferred from software features.
