# Final bug bash

Status for the V3 final refinement candidate. Production records were not used.

| Area | Evidence | Result |
| --- | --- | --- |
| Data integrity and RLS | `scripts/check-supabase.sql`, AP revoke/undo, report-save and tenant/role contracts | Green locally and retained in CI |
| Assistant input fuzz | malformed numbers, XSS/CSV-shaped values, long Latin, Indic, RTL and zero-width names | 2 tests green |
| Load and dates | 500 publishers × 200 weeks; service-period checks across extreme timezone offsets | 2 tests green |
| Offline and failures | report draft, store, timeout, retry, stale session and offline browser checks | Retained in `e2e.yml` |
| Security | CSP, tracked-tree credential scan, full-history gitleaks and Semgrep | Local CSP/tree checks green; history scanners run in Actions |
| Accessibility and overlays | keyboard/focus lifecycle, dismissibility, reduced motion, contrast and nine-theme dialog computation | Green; dialog backgrounds opaque in 9/9 themes |
| Browsers | Chromium local critical flows; Chromium, Firefox and WebKit smoke | Chromium green locally; three-engine smoke runs in Actions |
| PDFs | V1 geometry, 49 geometry fixtures, 17 reviewed goldens, 3,433 retention assertions, 200 property runs | Green, 0 HARD findings |
| Hygiene | browser errors, failed demo cloud requests, orphaned overlays, legacy paths, workflow count | Green in targeted local checks |
| Sampled layout | 180 views: 320/390/768/1024/1440 px × 100/200% text × Mono Light/Lagoon/Aurora × six touched screens | 0 findings, 0 coverage errors |

Sev1 open: **0**. Sev2 open: **0**.

Open external verification: real phones, physical printers, WhatsApp attachment delivery, Razorpay and real-user Google sign-in. These require the relevant device or external account and are not represented as verified.
