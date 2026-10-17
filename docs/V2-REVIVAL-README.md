# V2 REVIVAL README — bring back the life, bring back every feature, let each person choose their experience

> **Instruction to Codex:** Do **everything** in this file in **one continuous run**. No approvals, no questions. Decide, log in `docs/DECISIONS.md`, continue. Precedence: **this file > `V2-LAUNCH-README.md` > `V2-CUTOVER-README.md` > `V2-MASTER-README.md`**. Where earlier files said "≤5 controls per screen", "one primary action", "calm/empty" — **that guidance is withdrawn**; it produced a plain app. Follow this file instead. Everything about domain/hosting/trust/QA in the launch README still applies.

---

## 1. Honest diagnosis of the current repo (verified by reading the code)

| # | Finding | Evidence |
|---|---|---|
| R1 | **V2 is a thin shell, not a port.** The whole app is one file, `apps/web/src/v2/Workspace.tsx` (2,075 lines) + five tiny helpers (`store.ts` 45 lines, `client.ts` 30 lines…). V1 is a 1.2 MB `index.html` with 109 distinct user actions. | `apps/web/src/v2/*` |
| R2 | **Home is hard-coded filler**: title "Good to have you here.", card "Get this week ready." — no publisher counts, no pioneer stats, no submitted/pending, no charts, no real data. V1's Home had live KPI tiles, Regular Pioneer log, Auxiliary Pioneer review, Monthly Submissions table with per-row Remind, Bulk Entry and Missing-Reports buttons. | `Workspace.tsx:492-612` vs V1 `dash-stats`, `dash-rp-table`, `dash-ap-review-table`, `dash-reports-table` |
| R3 | **Reports, Midweek and Duties are hand-offs to V1** via `<Legacy>` (`../?ui=legacy&tab=…`). | `Workspace.tsx:124,1258,1266` |
| R4 | **Groups and Weekend show "Update pending"** because their database migrations were never applied. | `Workspace.tsx:712,1209` |
| R5 | **The PDF maker is missing from V2.** The only "PDF" is "Use your browser's Print or Save as PDF". No S-21, S-3-E, S-88-E, Emergency Contacts, batch downloads. These are the main selling points. | `Workspace.tsx:1241` |
| R6 | `app-v2-bridge.js` merely patches V1 (renames labels, injects close buttons) — V1 is still the real product. `staging/`, `public-site-preview/`, `archive/`, `experiments/`, `site/`, and V1 root files all remain. | repo root |
| R7 | **No "life":** appearance store is `auto/tone/size/weight/solid` only — no Glass/gradient themes, no color per section, no illustrations, no motion, no charts, no interactivity beyond buttons. | `store.ts` |
| R8 | `client.ts` hard-codes the Supabase URL/key (publishable keys are meant to be public, but must come from config). | `client.ts` |

**Root causes (own them):** earlier instructions over-optimized for "simple"; a one-run rewrite can't reach parity with a 109-action product; and migrations weren't applied so features rendered as "pending".

---

## 2. New strategy: **PORT, don't reinvent** — V1 is the spec and the engine

1. **Tag and freeze V1:** `git tag v1-final`. V1 is the functional specification. Re-generate the inventory (§9) from that tag so nothing is missed.
2. **Port V1's proven logic into typed V2 modules** (`apps/web/src/data/*`, `…/domain/*`, `…/pdf/*`): same calculations, same RPC calls, same rules (service-year, IST previous-month, reporting periods, pioneer hours, AP mapping, family reports, SFTS overrides, attendance, OCLM engine, public-link tokens, CSV import/export, recovery/backup). Where V1 logic is inside giant template strings, extract the pure functions first and unit-test them against V1 outputs.
3. **Per-screen feature flags** (`v2.screen.<name>`): a screen flips on **only when its parity tests pass**. **V1 remains the default and fully working until every screen passes**, then the root flips to V2 and V1 is deleted (cutover README A.2). The app must be deployable at every commit.
4. **No half-screens, no "Legacy" hand-offs, no "Update pending" cards in a release build.** If a DB migration is required, Codex generates one **combined, ordered, idempotent** file `supabase/ALL-V2.sql` (+ `down`) and `scripts/apply-migrations.sh`; the owner applies it once (there is no live data, so this is safe). Until applied, flagged screens stay off.
5. **If the run must end early:** leave `main` deployable (V1 default), ported screens behind flags, and an honest `docs/PARITY.md` + `docs/CUTOVER-REPORT.md` stating exactly what is done.
6. **Reachability rule (fixes "buttons were right there"):** every one of V1's actions must be reachable in **≤ 2 clicks/taps from Home**, with a **visible text label**. Enforced by a Playwright "reachability matrix" test (one row per V1 action).

---

## 3. Experience Styles — the interface adapts to the person (the owner's idea; build it as the core of V2)

**Principle:** *Styles change presentation, never capability.* Every style contains 100% of the features; Calm may tuck things under "More", but nothing disappears.

| Style | Who it's for | Look and behavior |
|---|---|---|
| **Calm** | simple, older users, publishers | Minimal Home (greeting, next task, 3 big actions), grouped navigation collapsed to essentials + "All tools" grid, larger type, soft solid colors, no ambient motion, no charts unless tapped |
| **Balanced** *(default for admins)* | most secretaries/overseers | Home with KPI strip, quick actions, this-week card, needs-attention list; full grouped sidebar; subtle motion; gentle color accents per section |
| **Lively** | younger users, power users, "like V1 but better" | Full dashboard: gradient/glass hero with greeting + live clock, animated KPI tiles with rings and sparklines, color-coded sections, rich tables with inline actions, illustrations, celebratory micro-moments, ambient gradient background, drag-to-arrange widgets |

**How it works (one component library, not three apps):**
- A `style` setting drives tokens (`--density`, `--motion`, `--color-intensity`, `--radius`, `--elevation`), **layout profile** (which Home widgets show, default sidebar expansion), and **richness flags** (charts, illustrations, ambient background, confetti-lite).
- **Fine-tune ("Customize")** below the presets: Navigation (**Classic grouped sidebar** like V1 · compact icon rail · bottom tabs), Density (Comfortable / Compact), Motion (Full / Reduced), Color intensity (Soft / Vivid), Charts (on/off), Background (static / ambient gradient / off). Presets are just saved combinations; users can mix.
- **First-run picker** (also reachable in Settings › Appearance › Experience): three large **live preview cards** of the real Home in each style; one tap chooses; "You can change this anytime."
- Persist per **user profile** and per device; Main Admin can set the **congregation default** and a **default for the publisher portal** (default Calm). Respect system settings: reduced motion/contrast/transparency and large text always override richness.
- Works with all themes (§5). Never makes the app slow: Lively must hold 60 fps on a mid-range Android (animate transform/opacity only; pause ambient animation when hidden/battery-saver/low-end).

---

## 4. The Home dashboard — rich, real, interactive (all styles; richness varies)

Build on **real data** ported from V1's `renderDashboard` (service-year month selector, IST previous-month logic). `?demo` uses fictional data.

**Hero (Lively/Balanced):** gradient/glass card with **time-based greeting + first name, full date, live clock** (launch README / cutover Track B rules), sync status pill ("Synced just now"), and the **service-year month selector**.

**KPI tiles (V1 parity + upgrades)** — each tile is a button that **drills into the filtered list**:
- **Publishers** (count) + total studies; **Regular Pioneers** (count, hours, studies); **Auxiliary Pioneers** (count, hours, studies); **Submitted x / y** with a **progress ring** and "n pending".
- Animated count-up (once, reduced-motion safe), delta vs last month, tiny sparkline.

**Front-and-center actions (V1 had them — bring them back, visible):** **Bulk entry**, **Missing reports / Remind**, **Download reports**, **Add publisher**, **Copy report link**, **Announcements**, **Install app**. Shown as a labeled action bar (not hidden in menus).

**Tables/cards (V1 parity):** **Regular Pioneer log**, **Auxiliary Pioneer review** (with Revoke/mapping), **Monthly submissions** (status chips, per-row **Remind** → WhatsApp/Share, "Awaiting data", shared-in-ministry/not-participated states, sorting, filters, search, group chips, pagination/virtualized).

**New interactive widgets (Balanced/Lively):** attendance trend (both meetings), group completion bars (tap → group), this-week schedule (midweek + weekend) with unassigned-parts badge, needs-attention list, recent activity feed, announcements, install/update card, "all reports in" celebration. **Customize Home:** drag to reorder, hide/show, resize (S/M/L), persisted per user.

**Interactivity standards (apply app-wide):** pressed/hover/focus states with spring, row hover reveal actions, swipe actions on mobile lists, inline edit, multi-select + bulk actions, undo toasts, optimistic updates, skeleton loaders, pull-to-refresh, keyboard shortcuts + `Ctrl/Cmd+K` palette, animated tab/route transitions (≤150 ms), live updates via realtime where available. Charts: custom lightweight SVG (≤10 KB), accessible (labels/tables on demand).

---

## 5. Make it alive: visual layer

- **Color with meaning:** each section has its own accent hue (People = teal, Reports = amber, Schedule = indigo, Attendance = green, Messages = violet, Access = rose, Settings = slate) used in nav icon tint, tile accents and chart series; always paired with text/icon (never color-only).
- **Themes:** keep the six solid themes and add the **Glass collection** from the launch README (**Lagoon Glass** — the V1-heritage teal, flagship — Aurora, Sunset, Mint Air, Ocean Night, Graphite Glass) as complete token sets with the **contrast-sampling CI** (text never directly on gradient). Add a theme gallery with live previews and a "Surprise me" button.
- **Glass & depth:** mesh gradients (3–4 blurred blobs), 1 px translucent borders, inner highlights, accent glow on primary actions, layered shadows. Solid mode / reduced transparency fallbacks.
- **Icons:** Lucide sprite, duotone tint using the section accent; **no emoji anywhere**.
- **Illustrations:** a small inline-SVG scene library (8 scenes: empty publishers, no reports yet, all caught up, schedule ready, import success, offline, error, welcome) themed by tokens — used for empty/success/error states so nothing ever looks blank.
- **Personality in microcopy:** warm, brief, encouraging ("All 42 reports are in — nicely done."), never childish, no emoji.
- **Motion tokens:** `--ease-spring`, `--dur-fast/base/slow`; count-ups, ring fills, list stagger, sheet springs; all disabled under reduced motion.

---

## 6. Navigation (V1's easy-to-find structure, upgraded)

**Classic grouped sidebar is the default for admins** (user can switch): all items visible with label + colored icon, grouped like V1:
- **MAIN:** Home · Publishers · Emergency Contacts · Access & Roles
- **FIELD SERVICE:** Groups · Analytics
- **ATTENDANCE:** Attendance
- **SCHEDULES:** Midweek (OCLM) · Weekend · Duties · Print & PDF
- **MORE:** Announcements · My reminders · Messages · Install app · How to use · About
Sidebar: independently scrollable (sticky, bounded height — fixes the old freeze), collapsible to icon rail, remembers state. **Phone:** bottom tabs (Home · Schedule · People · Reports · More) where **More is a visual grid of every tool with icon + label** (not a hidden list). Global search / command palette. Role-limited users see only what they can use.

---

## 7. Port milestones (execute in this order inside the single run; each ends with tests green and `docs/PARITY.md` updated)

**M0 Baseline:** tag `v1-final`; generate §9 inventory from the tag; build `docs/PARITY.md`; create PDF **golden files** from V1 (launch README §2); add per-screen flags; add reachability test harness.
**M1 Foundation:** design tokens, Glass themes + contrast CI, **Experience Styles engine**, adaptive layout (Layout Doctor), dialog component (visible Close everywhere), shell + classic grouped navigation, illustrations, motion tokens, theme/experience gallery.
**M2 Data layer + Home dashboard:** typed repositories + Zod; port V1 db logic; build §4 Home with real data and demo data.
**M3 Publishers:** list/filters/search, add/edit dialog (email field, group dropdown, household prompt), delete, spiritual status, SFTS, CSV import/export + samples (Import Center), **S-21 single + filtered batch**.
**M4 Reports:** bulk entry, missing reports + remind (WhatsApp/Share), AP review/revoke, RP log, public/group report form and links, family/household reporting, downloads.
**M5 PDF Studio:** **S-21, S-3-E, S-88-E, Emergency Contacts**, batch ZIP/merged PDF with progress, live preview, Web Share/WhatsApp, embedded Noto fonts for all scripts; schedule PDFs (midweek, weekend, rosters, large print, month grid). **Must pass golden parity vs V1** (launch README §2).
**M6 Attendance:** weekly entry, edit toggles, trends, public attendance form/link, S-3/S-88 downloads, attendants.
**M7 Midweek scheduler (OCLM):** weeks, parts, assign sheet, statuses, minutes/titles (titles read-only when import data exists), away periods, people editor, Additional Duties (+custom), publish/unpublish, publication history/rollback, public noticeboard (name search), feedback.
**M8 Weekend + Groups:** weekend module (chairman, songs, talk title, speaker incl. visitors, Watchtower, duties, exceptions), service groups table/dropdowns.
**M9 Access & Roles:** Google/magic-link/invites (no passwords), role presets, Links Hub, one-link, revoke/rotate, activity log, support-access toggle.
**M10 SuperAdmin / Command centre:** congregation list + filters, add/edit/delete, trial/renewal/status, enabled modules, notices to selected congregations, workspace requests review.
**M11 Settings & utilities:** appearance/experience, subscription, import/export, **encrypted backup/restore**, transfer, wipe (with export-first), feedback, announcements, reminders (device alerts + calendar export), notifications/push, install app, guide/how-to-use, about, demo mode.
**M12 Publisher portal:** Home/Assignments/Schedule/Report (+ household switcher), away dates, contact updates, reminders, scoped appearance (default Calm).
**M13 Finish:** remove V1 + bridge + legacy auth, DNS/deploy per launch README, E2EE per master §13 (flag-gated claims), full QA per launch README §6.

---

## 8. Quality gates for this revival
1. **Parity:** `docs/PARITY.md` has **zero** rows pointing to V1; every V1 action in §9 has a V2 location **and** a passing reachability test (≤2 clicks).
2. **PDF golden parity** passes (text, page count, field positions, image diff) and Indic-script names render.
3. **Liveliness review (credit-wise):** render **contact sheets** (≤ ~8 images total): Home in Calm/Balanced/Lively (phone + desktop), a Glass theme set, tables with inline actions, empty-state illustrations. Fix once, re-render only affected sheets.
4. **Performance:** Lively mode keeps ≥ 55 fps in a throttled-CPU trace on key interactions; Lighthouse mobile ≥ 85 (Lively) / ≥ 90 (Calm); initial JS ≤ 300 KB gz with route splitting (charts, PDF, OCR lazy).
5. Accessibility/adaptive/E2E/security gates from the launch README still apply (contrast sampling over gradients, layout detectors, axe, tenant isolation).
6. No emoji in UI source; no `Legacy`/`Pending` components in the release build; no hard-coded keys (use config).

---

## 9. V1 feature inventory (restore ALL of these — regenerate from `v1-final` to confirm)

**Handlers (109) grouped.** Rows marked ✗ are legacy auth, intentionally replaced by Google/magic-link/invites.
- **Auth/session:** `auth.googleLogin`, `auth.activateGoogleRole`, `ui.confirmLogout`; ✗ `db.changeAdminPassword`, `db.changeGroupPassword`, `db.setGroupPassword`, `ui.checkPassword`, `ui.openGroupPasswordModal`.
- **App chrome:** `ui.switchTab`, `ui.openModal/closeModal`, `ui.closeSysPrompt`, `ui.setTheme`, `ui.setAppFont`, `CAReadability.set`, `installCongregationApp`, `CAGuide.open`, `ui.startHowToUse`, `CADemo.start`.
- **Dashboard/reports:** `ui.renderDashboard`, `ui.openBulkEntry`, `ui.saveBulkEntry`, `ui.toggleBulkRow`, `ui.openMissingReportsModal`, `ui.sendReminder`, `db.revokeAP`, `ui.downloadReports`, `ui.copyGroupLink`, `ui.showGroup`.
- **Publishers:** `ui.renderPublishers`, `ui.editPublisher`, `ui.savePublisher`, `db.deletePublisher`, `ui.downloadContacts`, `CAImports.template/preview/combined`, `ui.filterAccessPublishers`, `CAPublisherLogin.load`.
- **Emergency/analytics:** `ui.renderEmergencyContacts`, `ui.printEmergencyContacts`, `ui.renderAnalytics`.
- **Attendance:** `ui.renderAttendance`, `db.saveAttendance`, `db.savePublicAttendance`, `ui.toggleAttEdit`, `ui.toggleAttInput`, `ui.saveAttendanceStateLocally`, `ui.copyAttendanceLink`.
- **Access & roles:** `ui.openAccessManager`, `ui.saveAccountAccess`, `ui.removeRoleAccess`, `ui.copyOverseerLink`.
- **OCLM scheduler:** `ui.openOCLM`, `setSchedulerWeek`, `openAssign`, `setAssignment`, `clearAssignment`, `setAssignmentStatus`, `setPartTitle`, `setPartMinutes`, `saveMeetingDetails`, `toggleAdditionalDuty`, `renameAdditionalDuty`, `addAwayPeriod`, `editPerson`, `deletePerson`, `unpublishWeek`, `loadPublicationHistory`, `ui.renderPublicOCLMBoard`, `ui.editOCLMPart`, `ui.editOCLMAssignment`, `ui.openOCLMPartEditor`, `ui.toggleOCLMPart`, `ui.removeOCLMPair`, `ui.deleteOCLMAssignment`, `ui.saveOCLMAssignmentEditor`, `ui.cancelOCLMAssignmentEdit`, `ui.refreshOCLMAssignmentForm`, `ui.submitOCLMFeedback`, `CAOCLMCloud.recovery`.
- **SuperAdmin:** `ui.renderSuperAdmin`, `db.createCongregation`, `db.updateCongregation`, `db.deleteCongregation`, `ui.editCongregation`, `ui.selectAllSuperAdmin`, `ui.toggleSuperAdminSelection`, `ui.sendSuperAdminNotification`, `ui.openNotificationComposer`.
- **Messaging/notify:** `ui.openAnnouncements`, `CAReminders.open/save/download`, `CANotifications.enable/guide/test`, `CAPush.disable`.
- **Data safety:** `CARecovery.export/restore/mode`, `CATransfer.open`, `ui.confirmWipeDatabase`, `ui.cancelWipe`.
**RPCs (19):** `ca_is_congregation_admin`, `ca_is_superadmin`, `get_my_family_report`, `get_my_publisher_portal`, `get_oclm_public_snapshot`, `get_oclm_roster`, `get_oclm_state`, `get_publisher_login`, `provision_congregation`, `save_congregation_reports`, `save_my_publisher_away`, `save_my_publisher_reminders`, `save_oclm_state`, `set_publisher_login`, `submit_family_report`, `submit_my_attendance`, `update_congregation_owner`, `update_my_publisher_contact`, `upsert_oclm_public_snapshot`.
**Tables:** `congregation_access`, `congregations`, `group_access` (legacy, drop), `meeting_attendance`, `publishers`, `reports`, `wipe_requests`.
**Dialogs (23):** about, access manager, add/edit congregation, announcements, bulk entry, google congregation picker, group/overseer password (✗), how-to-use, install app, missing reports, mobile menu, OCLM feedback, OCLM parts editor, profile menu, publisher editor, reminders, settings, superadmin notification, coming soon.
**Also keep:** public report/attendance/noticeboard pages, subscription lock screen, trial banner, launch-offer banner, demo mode, offline page, service-worker update flow, all three sample CSVs.

---

## 10. Deploy and finish
Follow the launch README for domain/headers/CI (`congregationassistant.com`, `app.` subdomain) and trust/QA reports. Open one PR, merge when the gates pass, deploy (or "skipped — add secret" notice). Final docs: `docs/PARITY.md`, `docs/CUTOVER-REPORT.md`, `docs/AUDIT-v2.md`, `docs/OWNER-TODO.md`, rewritten `README.md`.

**Owner step (one-time, no live data so safe):** run `scripts/apply-migrations.sh` (or paste `supabase/ALL-V2.sql` into the Supabase SQL editor) so weekend, groups and capability checks exist.

**Definition of done:** a user opens the app, picks **Calm, Balanced or Lively** on first run, and lands on a **real, interactive dashboard** (stats, rings, tables, visible actions) that feels at least as alive as V1; every V1 action works natively in V2 within two clicks — **including all PDFs, matching V1's output**; Glass themes look striking and stay readable; and no V1 code, bridge, hand-off or "update pending" card remains.