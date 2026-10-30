# Phase 3 — Today implementation report

Status: complete locally; ready for independent review and integration CI.

## Scope and history

Whole-task base: `1fa4fc2`. Continued the preserved Phase 3 implementation at `61052b7` and the `c4e5b42` / `5dd39b5` Phase 2 follow-ups. All pre-existing Phase 3 working changes were retained and completed. Branch: `v4/ux-today`.

No Supabase/schema/RPC, auth, PDF engine/template/golden, website-source, hosting/workflow, or public configuration changes. No production deployment/data operation was performed by this implementer. `CUSTOM_DOMAIN_READY` remains false. The untracked participant runbook was left untouched.

## Delivered behavior

- Publisher Today: localized date/title; next-assignment date and Assistant chips; programme/all-assignments links; calm assignment empty state; state-aware report action; direct `screen=reports&action=entry&month=…`; nonempty announcement feed; one Me row for details/time away; four-block skeleton and retry state.
- Main Admin Today: urgency-ordered Needs attention, five-row preview/See all, incomplete setup first, This month progress and tabular figures, and four shortcuts. Desktop uses two columns within 1200 px; publisher reading column is 720 px. Normal sync state is quiet; offline/query error gets a small pill.
- Department Today: attendance stepper/Save, department-specific next-duty/roster destination, OCLM/weekend assignment summary, scoped group missing reports/link actions, and field-service report summary. Several memberships compose in urgency order; publisher blocks follow staff blocks only for an actual publisher membership. Only Main Admin receives AdminToday (F6).
- Inbox: unread contact updates plus pending approval count in the single header control; existing atomic read/approve/reject RPCs retained. Pending requests have their own labeled group; contacts are newest first.
- Preserved tools: Dashboard KPI/submission/RP/AP/SFTS surfaces remain in Reports → Monthly overview; HomeGroupLinks also lives in People → Groups. Admin announcement management is hosted in Messages, reachable from More. Unused HomeAssistant/HomeSuggestions are removed; Main Admin's existing on-device Assistant remains first in Search. Phone Quick actions remain accessible through Account.
- Report submission immediately changes the demo Today state to View report on return. Embedded publisher reports use secondary actions beneath staff cards, leaving attendance as the single solid action.

## Regression evidence

### Toast interaction: RED → GREEN

With only the new Dialog notice exception removed, `node scripts/check-admin-assistant.cjs` failed at “Dismissing a success notice must keep Assistant open” (`false !== true`). The root cause is Radix treating the independently mounted app toast as an outside dialog interaction.

The minimal fix marks Toast and prevents dialog outside interaction only for that marked notice. The same browser test downloads an individual S-21, actively clicks Dismiss, confirms Assistant remains visible, runs the next attendance command, saves it, actively dismisses that success notice, then previews a publisher edit without writes. It does not wait for toast expiry. Zero command-preview network requests, browser errors or demo Supabase requests.

Independent dialog acceptance verifies Assistant Close, Escape, ordinary outside click and focus restoration. Setup acceptance moved from the intentionally removed completed-setup Today card to Settings, preserving all 11 wizard steps, dirty Keep editing, Discard and restoration assertions. The overlay audit additionally checks that an outside click preserves dirty sheet input.

### Embedded publisher action: RED → GREEN

A rendered-component regression failed because embedded publisher Report my service carried a primary class. After making embedded report actions secondary, the regression passes and independently confirms standalone publisher Today retains its primary report action. The same rendering check verifies an empty announcement section is omitted.

## Task budgets

Action taps exclude typing/field selection, matching Phase 0 measurement rules.

| Task | Result | Evidence |
|---|---:|---|
| T1 see next assignment | 0 | Today initial publisher block, screenshot + role matrix |
| T2 submit report | 2 | Report my service → Submit Report; inline form and month URL assertions; submitted-state return |
| T3 edit phone/address | 2 | Update → Save contact details; native publisher flow |
| T4 mark time away | 2 | Update → Add time away; native publisher flow |
| T10 record attendance | 1 | initial Today count input → Save attendance; stepper also exercised |
| T12 open next duty | 1 | View roster → matching duties tab and department URL |

No human usability study is claimed. No external message is sent by the reminder checks.

## Verification

| Command / check | Outcome | Evidence |
|---|---|---|
| `npm run check` | PASS | lint + web TypeScript + 257 unit tests / 40 files + 90 script contracts |
| `npm test` | PASS | public-safety + 257 unit tests |
| `npm run build` / `check:bundle` | PASS | native initial JS 199834 gzip bytes; no legacy references |
| `check:css` / `check:style` | PASS | 107868 / 108033 CSS bytes; style findings 191 / baseline 452 |
| `check:strict-types` | PASS | 404 / baseline 419, zero changed-file failures (prior phase 405) |
| `check:contrast` / `check:vercel-guidelines` | PASS | 429 checks / 11 themes / zero contrast failures; 0 HARD, 28 existing SOFT |
| `check:lint-ratchet` / `check:unused` | PASS | suppressions 631 → 613; knip clean |
| `npm run test:browser` | PASS | 48 cutover screens, zero failures; redirects, expired archive and worker migration retained |
| `check-v3-shell` / `check-short-navigation` | PASS | 15 native shell views; two short-landscape sizes at 200% |
| `scripts/v4-tests/today.cjs` | PASS | 30 views, ten roles × 390/320/1440; 320 at 200%; zero Axe/overflow/browser errors/demo cloud requests; admin phone has 2 content blocks above fold |
| `check-v4-ux-router` | PASS | refresh, Back/Forward, old links, dirty cancellation/discard, demo preservation, no navigation storage |
| `check-home-next` | PASS | synthetic own-group Today, direct review, People → Groups QR, rotate/revoke |
| `check-dashboard-browser` | PASS | six style/width cases; exact missing publisher, bulk entry, persistence, Axe |
| `check-v3-resume` | PASS | 60 responsive views plus S-21 entry/filter and on-device preview privacy |
| `check-direct-downloads` | PASS | 26 PDF/ZIP downloads, individual S-21 and emergency search retained |
| `check-admin-assistant` | PASS | real toast Dismiss keeps Assistant and next command works; preview privacy; non-admin access blocked |
| `node scripts/overlay-audit.ts` | PASS | component timers/pause/touch, dirty outside/swipe, 12 dialog lifecycles / 11 setup steps, picker and QR |
| `check-qr-refinement` | PASS | synthetic protected QR Close/Escape/outside/reopen/focus lifecycle |
| `npm run test:pdf` | PASS | unchanged templates, 17 goldens, 3433 retention assertions, eight Indian scripts |
| `build-pages` + `scripts/v4-tests/browser.cjs` | PASS | native publisher 390/1440, contact save, time-away add/remove, appearance, navigation, announcement publish/archive; zero Axe/cloud/errors |
| `check-pages-deploy` | PASS | packaged app controlled by service worker, unrelated cache retained, preview zero writes/network, manifest/version consistency |

Machine-readable verification history and exact failed attempts are retained in [verification.json](../../../docs/qa/v4-ux/phase-3/verification.json). The 30-view matrix, phone screenshots, toast RED/GREEN logs and Monthly diagnostic are in `docs/qa/v4-ux/phase-3/`. Native source/build checks ran after the final product change. Pages packaging temporarily changes generated dist; native dist is restored before handoff. Source configuration is restored byte-for-byte.

Failed intermediate attempts were not hidden: cutover/shell/short-navigation/QR waited for intentionally retired Home selectors; the Monthly raw-innerText assertion was isolated as render-skipping; the unsupported npx-tsx invocation failed before running the overlay test. Corrected checks retained their behavioral assertions. The literal obsolete V1 commands remain documented Phase 0 failures, not claimed passes.

## Intentional selectors

- Home Dashboard greeting/Monthly submissions → Today in cutover/shell/short-navigation/resume/alignment/refinement/Pages tests.
- Publisher My profile & time away → Update; Submit report + Enter report → direct Report my service. Router tests retain refresh, history, dirty Back keep/discard and demo preservation.
- Dashboard browser enters Reports → Monthly overview before retaining KPI filter, bulk-entry, persistence and Axe assertions.
- Scoped group links enter People → Groups; Today role assertions prove group overseers do not receive AdminToday.
- Completed setup's Open setup guide trigger is now tested from Settings; dirty wizard behavior remains unchanged.
- Assistant enters Search → Ask the assistant; actual success notices are dismissed and subsequent commands are asserted.

The old→new copy/navigation mapping is in docs/DECISIONS.md and selectors are listed in docs/POLISH-REPORT.md. The protected group QR check also moves its entry from Home to People → Groups and retains close/Escape/outside/focus/image assertions.

Monthly diagnostic: the filtered missing row contained the exact publisher name in textContent but had empty innerText because existing table rows use content-visibility:auto outside the rendered viewport. The filter test now retains its one-row assertion and compares the publisher cell’s exact textContent. No production behavior or timing workaround changed.

## Review and limits

Self-review covered role guards, query/demo branches, preserved routes/tools, new translation keys, layout hierarchy and single-primary behavior, error/empty/loading states, dialog event boundaries and changed-file diagnostics.

- Existing department RPCs do not expose approval request timestamps. Genuine cross-kind newest-first Inbox ordering therefore cannot be implemented in this UI-only phase. Pending approvals remain labeled before newest-first contact updates; no fabricated timestamps or backend change.
- Existing announcement RPCs expose published announcements rather than persisted drafts. No draft count is invented. Compose/archive capabilities remain reachable from Messages.
- Settings Display/account restructuring and remaining screen-copy work remain their later planned phases; Phase 3 does not claim those finished.
- Literal V1 publisher-portal/scheduling-simplicity/reachability commands remain obsolete failures recorded in Phase 0. Current native publisher, scheduling/resume, shell/cutover and direct-download contracts gate actual functionality; no CI test was removed or weakened.
- Production behavior against customer data, SonarQube and real participant observations are unverified. No deployment claim is made.
- Existing report records lack a submission timestamp; Today shows sent status and formats a sent date only when supplied by the API. It never substitutes the current date.
