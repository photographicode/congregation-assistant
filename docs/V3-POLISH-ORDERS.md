# V3 POLISH ORDERS — "make it shine" (refinement only)

**This is a refinement phase. No new features.** Fix, restore, align, simplify, test, translate, deploy. These orders override earlier ones where they conflict. Do not ask questions. Commit and push after **every numbered item**. You may merge to `main` and deploy both GitHub repositories when the gates in §9 pass.

## 0. Rules
1. **Allowed:** bug fixes, restoring V1 behavior that was lost, visual/UX polish, copy fixes, accessibility, performance, deleting dead code, tests, the pricing/translation changes in §6–§7.
2. **Forbidden:** new modules, new pages (except those named below), new integrations, new dashboards. If you find a missing capability, add it to `docs/FUTURE.md` and move on.
3. **Production data exists** (the status report mentions 116 publishers and 4 congregations). **Never wipe or reset it.** Before any migration, export a snapshot; migrations stay additive with `down`.
4. **Public website design is LOCKED** (§6). Do not change its layout, typography, colors, animation or imagery. Allowed changes: pricing section content, language/translate controls, copy corrections listed here, bug fixes.
5. Credit plan: read `docs/V3-PROGRESS.md` once; batch edits; run affected tests per item; full suite once at the end in GitHub Actions; **≤ 10 images total** (contact sheets only).
6. Be honest in `docs/POLISH-REPORT.md`: what was fixed, evidence (test names/counts), what is still wrong.

## 1. One front door (do first)
- Decide by evidence which UI customers see at the root URL. Produce a truthful `docs/PARITY.md` (✔/✖ per V1 capability: dashboard, reports, bulk entry, chase/remind, AP review log, S-21 / S-3 / S-88 / emergency PDFs, attendance, midweek, weekend, duties, access/roles, import/export, backup/restore, SuperAdmin). **V3 must be the only product** customers see; port any missing V1 capability as a *restoration* (allowed), then remove V1 files, `app-v2-bridge.js`, `v2/`, `v2-screen-flags.json`, `staging/`, `public-site-preview/`, `archive/`, `experiments/` and stale status docs (merge anything valuable into `docs/`). No "preview", "checkpoint", "V2", "V3 foundation" or "in progress" text anywhere in the UI.
- Make the base path configurable (`BASE_URL`) so the app can live at `https://app.congregationassistant.com/` **and** at the current GitHub Pages path; update service worker scope, manifest `start_url/scope/id`, links, QR codes and share links from config. The website links to `APP_URL` from config.
- Keep the old hosting working until the owner switches DNS (see `OWNER-MANUAL.md`).

## 2. Critic findings with exact fixes (all verified in the current code)

### F1 — "Male / Female" is asked twice when adding a publisher
**Evidence:** `apps/web/src/features/Workspace.tsx` renders two gender selects in the publisher editor (≈ lines 1492 and 1524).
**Fix:** one **Gender** control only, as a two-option segmented control ("Brother / Sister" label text, values `Male`/`Female` unchanged) in the *Basics* section, directly under Full name. Remove the second. **No default selection** for a new publisher (force a choice; validation message "Choose Brother or Sister"). Add a lint/unit test that fails if a form contains two controls bound to the same field. Check every other form for duplicate fields.

### F2 — Field service report submission became "boring": restore the V1 experience
**V1 flow to restore (same fields, same logic, V3 tokens + more personality):** title **Field Service Report**, subtitle "Securely submit your monthly activity below." → **Service Group** select (hidden when the link is group-bound) → **Publisher Name** select (only that group's people) → **Reporting Month** (read-only chip, previous month by default) → a large **"Shared in the ministry"** toggle card with the helper text "Turn this on if you shared in any form of the ministry during the month." → **Bible Studies** (stepper, helper "Number of different studies conducted") → **Hours** (step 0.25, `inputmode="decimal"`, helper) → optional **Comments** → big **Submit report** → success screen **"Report Submitted — Thank you. Your field service report has been securely recorded."** with an animated check and buttons *Submit another report* / *Done*.
**Port V1 exactly:** read V1's `s4-*` form code (`changePublicS4Group`, `loadS4`, `enforceS4Logic`, duplicate handling, auxiliary-pioneer flag, pioneer fields) and restore every field and rule that V3 dropped. When "Shared in the ministry" is off, hours/studies are zeroed and disabled (V1's `enforceS4Logic`).
**Look:** centered card on a soft gradient header with an icon, generous spacing, large touch targets (≥ 48 px), live validation, a 1.5 s submit state, offline queue ("Saved on this device — will send when you're online"), friendly duplicate message ("A report for this month was already received — update it?"). Works for the public group link **and** inside the app's *Enter report*. Use the active theme (public page default `mono-light` unless the link owner chose otherwise).
**Tests:** every field/rule parity with V1 (table-driven), 320–1440 px, text 100/130/200%, keyboard-only, offline submit then sync, duplicate month.

### F3 — Auxiliary Pioneer review log with **Revoke** is missing
**Restore V1's panel:** **"Auxiliary Pioneer Review Log"** (subtitle "Review mapped APs") on Home/Reports with columns **Publisher · Hours · Studies · Admin action** and a **Revoke** button per row. Revoke removes the AP mapping for that month with a confirmation, an **Undo** toast (10 s), an audit-log entry, and the same server rule as V1 (`revokeAP`). Admin/service overseer only. Phone layout = cards. Test permissions, undo, audit, empty state.

### F4 — Assign-people drop-down is the browser's native `<select>` → build our own
**Evidence:** `Midweek.tsx` `selectPerson()` renders `<label><select>`; ~20 other native selects exist.
**Build one `Select/PersonSelect` component** (ARIA combobox + listbox, themed with tokens; inside the OCLM view it uses the OCLM palette):
- Trigger shows the selected person (initials avatar + name) or "Choose a person". Opens as a **popover** (desktop/tablet) or a **bottom sheet** (phone) with a **search field**.
- Sections: **Suggested** (top 3, ranked by the agreed algorithm), **Everyone else**, **Needs a check** (already has another part — see F6), **Unavailable** (away/not qualified, disabled with the reason).
- Each row: avatar, name, subline **"Last used: 12 Aug · Initial Call"** or **"Never assigned"**, right-aligned small badge (e.g. "3× this year").
- Keyboard: ↑ ↓ Home End, type-ahead, Enter to choose, Esc to close, focus returns to the trigger; screen-reader labels and live count ("12 people"); virtualize beyond 100 rows; supports clear/"Unassign".
- Use this component for **every** person/group/month picker app-wide (replace native selects, keep a native fallback only if `Select` fails to mount). Visual tests in 5 themes + OCLM palette.

### F5 — Hide Auxiliary Classroom everywhere when the congregation doesn't use one
**Evidence:** classroom handling lives only in the PDF/i18n layer; the schedule UI and `autoAssign(…, auxiliary=false)` have no setting.
**Fix:** setting **Classrooms: Main hall only / + Auxiliary 1 / + Auxiliary 1 and 2** (default *Main hall only*). When there is no auxiliary classroom, **do not render** any auxiliary column, label, counselor field, S-89 "Auxiliary Classroom" option, print/PDF block, live-link block or auto-assign slot. When enabled, show them (counselor per classroom). Changing to a smaller count with existing auxiliary assignments shows a clear warning listing what will be hidden (data kept). Tests: schedule UI, auto-assign, S-140 PDF/print, live link, S-89 slips for 1/2/3 classrooms.

### F6 — The same person may do several parts in one meeting, with a caution
**Evidence:** `packages/core/meeting.ts` `candidates()` only sorts "busy" people last; nothing tells the user.
**Fix:** allow it, never block. In the picker show a **caution chip** "Already has: Bible Reading" (amber, text + icon, not color alone). After choosing, show an inline note under the slot: "Daniel is also on Bible Reading this week. Allowed — please check the workload." Auto-assign avoids doubling unless no one else qualifies, and marks any doubling with the caution icon in the review step. Apply the same rule to **weekend** roles, **duties** (including a duty on a day the person has a part) and student/assistant pairs. Add `sameDayLoad(personId, date)` to core with unit tests. Away dates remain a hard exclusion.

### F7 — Dialogs, toasts and banners that stay on screen
**Rules (apply to every overlay):**
- **Toasts auto-dismiss** after 5 s (8 s if they have Undo), pause while hovered/focused, always have a close button; never more than 3 stacked.
- **Banners** (install, update, trial, sync) are **dismissible**, remember the dismissal (24 h or until the state changes), and never overlap content or the bottom bar. Update banners reappear only when a new version exists.
- **Dialogs/sheets:** visible **Close** (44 px), **Esc**, backdrop click (non-destructive only), swipe-down on phone sheets; unsaved-changes guard; one modal at a time; **close automatically on route change/sign-out**; no orphaned overlays after save (verify with a test that opens/saves/navigates and asserts zero `[role=dialog]` remain).
- Prefer **inline panels, popovers or toasts** over modal dialogs for simple actions (confirm-less undoable changes, small pickers, "Review auto-assignment" can be an inline review panel with Accept/Undo). Keep modals only for forms and destructive confirmations.
- Add `scripts/overlay-audit.ts`: opens every dialog/toast/banner in the app and asserts each can be dismissed by mouse, keyboard and touch.

### F8 — Alignment and sizing problems (owner sees many)
Run the **alignment audit** from `V3-NEXT-ORDERS.md` §F if it exists; if it is missing or weak, write it now (`scripts/alignment-audit.ts`) and make **zero findings** the gate. Additionally test **font sizes**, not only zoom: browser default font size 16 → **20, 24, 32 px** (125%, 150%, 200%) and `text-size-adjust`. Matrix: widths **320, 360, 390, 430, 600, 768, 820, 1024, 1280, 1440, 1920**; heights including short landscape (**844×390, 667×375**); themes **mono-light, mono-dark, paper, lagoon-glass, neon-night**; every screen, dialog, sheet, dropdown and public page. Detect and fix: near-miss edges (1–7 px), unequal heights in rows, icon/label vertical offset > 1 px, mixed text alignment, spacing off the 4 px grid, clipping, overlap, content under notches/bars, wrapped buttons, truncated names with no tooltip, number columns without `tabular-nums`, orphans in headings. Fix **systematically** (shared `Row/Field/Section/Card` primitives, one container padding per breakpoint, `grid` with `align-items:stretch`, `text-wrap:balance|pretty`). Write before/after counts to `docs/qa/ALIGNMENT-REPORT.md`. Only then render contact sheets and look at them.

### F9 — Other things a critical reviewer would flag (fix all)
1. `Workspace.tsx` is ~72 KB in one file: split into route-level modules (no behavior change) to cut load time and risk; code-split PDF/OCR/charts.
2. Duplicate trees and legacy files (see §1) — delete; repo size should drop by > 10 MB.
3. Consistent wording: same noun for the same thing ("Service report", "Publisher", "Group"); Title Case only for page titles; verbs on buttons ("Save", "Download", "Send").
4. Forms: every input has a visible label, `autocomplete`, correct `inputmode`/`type`, required markers, inline errors that say how to fix, Enter submits, no double-submit, focus moves to the first error.
5. Every empty list has an illustration + one sentence + one button; every loading state is a skeleton (not a bare spinner); every error has a Retry.
6. Numbers/dates: one date format per locale, `tabular-nums`, time zone from the congregation.
7. Focus rings visible in every theme; tab order logical; no keyboard traps; touch targets ≥ 44 px (48 px in the public report form).
8. Zero console errors/warnings in the smoke suite; no layout shift on data load (reserve space); images have `width/height`.
9. Back-button/refresh keep context (route + filters); scroll position restored.
10. The **assistant** and every PDF button still behave as specified (direct download, no preview; zero network requests for the assistant).
11. Remove any remaining emoji/glyph icons; icon sizes consistent (20/24 px).
12. Print styles for schedules and rosters; `@media print` hides chrome.

## 3. Per-theme fonts and text
Verify each theme uses its own font pairing from `V3-NEXT-ORDERS.md` §G (including Indic scripts); fix any theme still using a default stack; check no layout shift when the font loads (metric-matched fallbacks). Applies to the public website only for the locked black-and-white typography.

## 4. Translations for the app
App UI strings through `t()` for: English, हिन्दी, தமிழ், മലയാളം, ಕನ್ನಡ, తెలుగు, ଓଡ଼ିଆ, অসমীয়া, मराठी, ગુજરાતી, বাংলা, ਪੰਜਾਬੀ. Missing keys fall back to English. Mark every machine-drafted locale `reviewed:false`. **Personal data must never be sent to a translation service:** put `translate="no"` on names, phone numbers, addresses, emails, report values and any user-entered text, and add `<meta name="google" content="notranslate">` to the public report page. Do **not** embed Google's translate widget in the app. Add a one-line note in Settings › Language: "Your browser's built-in translate may send page text to Google; names and numbers in this app are protected from it."

## 5. Pricing and plans in code (config-driven; owner may change numbers)
Implement exactly this in `plans` seeds / `pricing.json` and the plan page; no layout changes elsewhere.
- **Founding period:** everything free until `PAID_START_DATE=2027-05-01`.
- **Lite (free forever):** people/groups/households, manual report entry, single S-21 download, attendance entry, S-88/S-3 view, midweek + weekend schedules (manual assignment + automatic parts), emergency list, CSV import/export, security features (never paywalled), **export and delete everything**.
- **Complete (per congregation, tiered by declared size; user can change the size later):**
  | Tier | Publishers | Per year | Per month | 3 years prepaid (pay for 2) |
  |---|---|---|---|---|
  | Small | up to 50 | ₹1,999 | ₹199 | ₹3,998 |
  | Standard | 51–120 | ₹2,999 | ₹299 | ₹5,998 |
  | Large | 121+ | ₹4,499 | ₹449 | ₹8,998 |
  International (USD per year): Small $29 · Standard $49 · Large $79; display by region; 50% hardship discount by request.
  Adds: batch/ZIP PDFs and **CO Visit Pack**, S-21 Download Center filters, chase-missing-reports queue + scheduled reminders, group report links + household reporting, auto-assign (week/range), S-89 bulk send, duties with approved pools + rotation, field-service meetings, paper-scan import, > 2 admins, priority support.
- **Founders:** first 100 paying congregations get **30% off for 3 years** (Small ₹1,399 · Standard ₹2,099 · Large ₹3,149 per year), price-locked; show the live count of slots left (read from data).
- **Reverse trial:** after the founding period every new workspace gets **30 days of Complete**, then falls back to Lite — never locked, never deleted. Banners at −7/−3/−1 days. Expiry screen: **Keep Lite · Subscribe · Export & delete**.
- Payment: Razorpay Checkout (cards, UPI, UPI Autopay for monthly); invoice/receipt PDF; an **"Approval letter for the body of elders"** PDF and an **invoice in the congregation's name** (fields: legal name, address, optional GSTIN). Prices display GST-inclusive.
- Pricing page: three columns (Lite / Complete / Complete + 3-year), annual selected by default with "Save two months", size selector, founders badge with slots left, one line "Export or delete everything at any time." Keep the existing locked layout; swap only the content and numbers.

## 6. Public website — DESIGN LOCK
1. Create `site/DESIGN-LOCK.md` stating the lock and the allowed-change list (pricing content, translate controls, factual corrections).
2. Capture **baseline screenshots** of every page at 390 / 820 / 1440 px in light and dark from the currently deployed version into `tests/visual/site-baseline/`. Add a Playwright visual test (threshold ≤ 0.2% pixel diff) that **fails CI on any unintended change**; updating baselines requires a commit message containing `DESIGN-UNLOCK`.
3. **Allowed edits only:** pricing section (§5), language menu additions (below), copy fixes (remove "checkpoint/in progress/being verified" wording; stop saying ₹1,499; state "Free until 1 May 2027 · Lite stays free forever"), footer links, bug fixes.
4. **Languages:** keep the existing menu and make sure it lists English · हिन्दी · தமிழ் · മലയാളം · ಕನ್ನಡ · తెలుగు · ଓଡ଼ିଆ · অসমীয়া · मराठी · ગુજરાતી · বাংলা · ਪੰਜਾਬੀ · اردو. For languages without a reviewed translation add one line under the menu: **"Read this page in your language with Google Translate →"** linking to `https://translate.google.com/translate?sl=en&tl=<code>&u=<this page URL>` (opens Google; add a tiny note "Google Translate processes this public page's text"). Only on the public website; never in the app.
5. Re-run the alignment audit on the website at the same matrix; fix real defects without altering the design (spacing/alignment bugs only; baseline updates with `DESIGN-UNLOCK` and a note in the report).

## 7. Domain-readiness (code side; the owner does the DNS steps in `OWNER-MANUAL.md`)
- All URLs from config: `SITE_URL=https://congregationassistant.com`, `APP_URL=https://app.congregationassistant.com`, `SUPPORT_EMAIL=support@congregationassistant.com`. Keep GitHub Pages URLs as fallbacks until the owner confirms.
- `CNAME` files committed **only** when the owner sets `CUSTOM_DOMAIN_READY=true` in repo variables (document in OWNER-MANUAL).
- Supabase redirect URLs and CORS list updated in `docs/DOMAIN-SETUP.md`; Google OAuth origins listed there too.
- Cloudflare Pages workflows present and skipping cleanly without secrets; `_headers` with CSP/HSTS ready for when the owner moves hosting.

## 8. Verification
`npm run check`; unit/contract tests; E2E for F1–F7 (named specs); the alignment audit (app + site) with **zero findings**; overlay audit; contrast gate (real text/surface pairs); golden PDF parity (S-21, S-89, S-140, S-88/S-3, emergency list); downloads-in-one-tap tests; assistant zero-network test; layout matrix incl. font sizes 20/24/32 px; Lighthouse ≥ 90 (app) / ≥ 95 (site); visual lock test; post-deploy check on both live URLs.

## 9. Gates and finish
Merge/deploy only when §8 is green. Update `README.md`, `AGENTS.md`, `docs/V3-PROGRESS.md`, `docs/POLISH-REPORT.md`, `docs/OWNER-TODO.md` (**no EPUB/fixture requests**). Report live URLs and anything still wrong.

**Definition of done:** one product at the front door with no preview wording; gender asked once; the report form feels like V1 again (and nicer); AP review with Revoke is back; person pickers are our own dropdown with last-used hints; auxiliary classroom appears only when enabled; double-booking shows a caution but is allowed; every toast, banner and dialog can be dismissed and none lingers; the alignment audit reports zero findings at every size and font size; the website design is frozen by tests, shows the new pricing, and offers Google Translate for unreviewed languages; and everything is deployed and verified.