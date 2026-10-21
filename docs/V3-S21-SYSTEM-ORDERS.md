# V3 — S-21 FIXES (measured), SYSTEM PAGES, AND THE FINISH LIST

Read `DESIGN.md` first. This adds to `V3-EXPERIENCE-ORDERS.md` and `V3-FINAL-ORDERS.md`. No new product features beyond the system pages below. No questions. Push after every numbered item; deploy when §5 gates pass.

## 0. Resume rules
`git status`, `git log -3`, read `docs/V3-PROGRESS.md` and the "Owner redesign pass" block of `docs/POLISH-REPORT.md` once. Do not redo finished work (consolidated workflows, Select/Combobox, weeks-ago recency, CBS reader, Home assistant/links/suggestions are done). Credit rules: grep/ranges, last 20 log lines, one spec at a time, sampled audits ≤ 300 views, full matrix only in CI, images ≤ 6, a fix that fails twice → log and continue.

## 1. S-21 — fix the three real defects (measured on the owner's downloaded sample)
Measured with poppler on the owner's `S-21_<name>_2027.pdf` (A5, Noto Sans ✔, title centred ✔, month labels uniform size ✔). **Still wrong:**
| # | Defect (measured) | Root cause in code |
|---|---|---|
| S1 | **Check marks are off-centre, too heavy, and poke outside the box** (visible at 400 dpi in Male and the "Shared in Ministry" column) | `packages/pdf/engine.mjs` hard-codes box centres and calls `tools.checkbox(page,{x:cx-5,y:cy-5,width:10,height:10})`; the printed squares are template **font glyphs** (`ornament` cells in `template-cells.json`) whose ink square differs from the advance box, so the tick is centred on the wrong rectangle; `layout.mjs tick()` strokes 1.1 pt lines past the square |
| S2 | **Header labels start at different x**: `Name:` x = 16.7 pt, `Date of birth:` x = 19.3, `Date of baptism:` x = 19.5 (template: all 17.03) | labels drawn with an extra ≈ 2.5 pt offset instead of the template x |
| S3 | **Month labels have ragged left edges**: x0 ranges 21.24–23.56 pt (2.3 pt spread; J-words sit right, M-words left) | text positioned from measured ink/centre per word instead of one fixed left x |
**Fix (do all):**
1. **Measure the real checkbox squares once** and store them: render the S-21 template at 600 dpi (or read the operator list with pdf.js), detect each square's bounding box, and save `{x,y,w,h}` for every checkbox (Male, Female, Other sheep, Anointed, Elder, Ministerial servant, Regular pioneer, Special pioneer, Field missionary, and the 12×2 table boxes) in `template-cells.json`. Never derive centres from the glyph's advance width.
2. **Draw every tick relative to its measured square:** polyline at fractions of the box — `(0.20w,0.52h) → (0.42w,0.26h) → (0.82w,0.82h)` (y measured from the box top), stroke **0.9 pt**, round caps/joins, **clipped to the square** so no ink falls outside. One function, used for the header boxes and table columns alike. Remove the hard-coded `checkboxCenters` and the `±5` box.
3. **Draw all header labels at the template x** (17.03 pt) and values on the template baseline; **draw all 12 month labels at one left x** from the template (left-aligned, same baseline rule as the numbers).
4. **Tests (add to `pdf.yml`):** render the sample fixture at 400 dpi → for **every checked box** the tick's ink bbox centre is within **0.4 pt** of the square's centre and the tick lies inside the square (± 0.2 pt); the three header labels share x within 0.2 pt; month-label x0 spread ≤ 0.25 pt; row text centres within ±1.0 pt of row centres; fonts all `NotoSans*`. Use a **fictional** fixture (do not commit the owner's real sample). Keep `scripts/pdf-vs-v1.mjs` green.
5. Re-run the same checks on S-88, S-3, S-89, S-140 and the batch ZIP/merged S-21; fix anything the numbers show.

## 2. SYSTEM PAGES (what every SaaS needs) — build, theme-aware, accessible
Create `packages/ui/SystemPage.tsx` (illustration slot, title, one sentence, primary + secondary action, optional reference code) and `apps/web/src/system/`. Follow DESIGN.md: centred column, inline-SVG line illustration coloured by tokens, display-font title, `--text-2` body, tonal/primary buttons, no emoji. Every page: `<h1>` receives focus on mount, `role="alert"` (errors) or `role="status"` (offline/slow), `noindex`, strings through `t()`, tested at 320–1440 px × text 100/200% × 3 themes.
| Page / state | When | Copy (English) | Actions |
|---|---|---|---|
| **404 Not found** | unknown route in the app; `404.html` for the site and for deep links under `/app/` (GitHub Pages serves it with HTTP 404) | "We can't find that page" — "The link might be old or mistyped, or you may not have access." | **Go to Home** · **Search** (opens the command bar) |
| **Offline** | `offline` event / failed `version.json` probe; service-worker navigation fallback `offline.html` | "You're offline" — "What you enter is saved on this device and will be sent when you're back online." | **Try again** · **See what's saved** (queue count) |
| **Slow connection** | a request > 6 s → inline notice; > 15 s → stronger notice; `navigator.connection.effectiveType` 2g/slow-2g or `saveData` → **lighter mode** | "This is taking longer than usual…" → "Still working — nothing you typed is lost." | **Keep waiting** · **Cancel** · **Try again later** |
| **Something went wrong (500)** | route-level React error boundaries + global `error`/`unhandledrejection` | "Something went wrong" — "We couldn't finish that. Your data is safe." + reference `CA-7F3K` | **Try again** · **Reload page** · **Copy details** (no personal data, no stack trace; **nothing is sent automatically**) |
| **Session expired** | HTTP 401 / token refresh failure | "Please sign in again" — "For your security your session ended. Unsent changes are kept." | **Sign in** (returns to the same route, restores drafts) |
| **No access (403)** | role/RLS denial | "You don't have access to this" — "Ask your administrator to give you access." | **Go back** · **Home** |
| **Link not active** | revoked/expired/rotated public report, attendance or schedule link | "This link isn't active" — "It may have expired or been replaced. Ask your group overseer for the new link." | **Contact support** |
| **Maintenance (503)** | flag `MAINTENANCE=true` (static `maintenance.html`) or backend 503 | "We're making an update" — "Congregation Assistant will be back in a few minutes." | **Check status** · auto-retry every 30 s |
| **Too many tries (429)** | rate-limit response | "Too many tries" — "Please wait {n} seconds and try again." (live countdown) | **Try again** (enabled at 0) |
| **Free period ended / read-only** | plan expiry (never locks or deletes data) | "Your free period has ended" — "Your records are safe. Choose how to continue." | **Keep Lite** · **Subscribe** · **Export & delete** |
| **Browser too old / no JavaScript** | feature detection (IndexedDB, WebCrypto, service worker) / `<noscript>` | "Your browser needs an update" / "JavaScript is turned off" — short fix steps | links to current browsers |
| **Storage blocked / full** | IndexedDB failure, private mode | "Can't save on this device" — "Your browser is blocking storage. Turn off private mode or allow storage for this site." | **Try again** · **How to fix** |
**Plumbing:**
- `useNetworkStatus()` = `online/offline` events **plus** an active probe (HEAD `version.json`, 3 s timeout, every 20 s while offline) because `navigator.onLine` lies; on recovery show a toast "Back online — syncing" and flush queues.
- `fetchWithPatience()` wrapper: `AbortController`, timers at 6 s and 15 s, exponential-backoff retries for idempotent calls only, never retries non-idempotent submits (report/attendance) automatically; inputs and drafts are kept.
- **Lighter mode** (slow/`saveData`): disable ambient background and blur, reduce motion, lazy-load heavy modules (PDF, charts), smaller images; one-line banner with an "Undo lighter mode" toggle.
- Service worker: precache shell + `offline.html`; navigation falls back to it; cache-first static assets; stale-while-revalidate for static meeting JSON. No silent skipWaiting.
- The **public website** gets matching pages in its locked black-and-white style (adding pages, not changing existing ones): `404.html`, `offline.html`, `maintenance.html`, `<noscript>` notice, and a footer "Status" link.
- **Tests:** Playwright `setOffline`, CDP slow-3G throttling, route-intercepted 401/403/429/500/503, unknown route, revoked-link RPC, `javaScriptEnabled:false`, blocked IndexedDB; axe on each; layout detector; copy checked in `t()`; no personal data in "Copy details".

## 3. FINISH LIST (from your own report; do in this order)
1. **Duplicate themes:** `noir-pop` and `eclipse`/`eclipse-night` both exist. **Keep Eclipse + Eclipse Night** (verified contrast, overlay tokens); delete `noir-pop.css` and its registry entry; migrate any saved `noir-pop` preference to `eclipse`.
2. **Assistant handlers (registered but not wired):** publisher edits (name, gender, **date of birth, date of baptism**, appointment, pioneer status/SFTS, group, contact fields), meeting/duty assignment, AP revoke/restore, link create/rotate/revoke. Same registry `run()` as the UI; preview + Confirm; Undo where available; role-gated; zero network. Add the phrase fixtures and permission tests from `V3-EXPERIENCE-ORDERS.md` §2.
3. **Fix the cutover browser harness** that still expects the old report-save label/route (update the harness to the restored report form; do not weaken checks).
4. **Finish the select/disclosure migration evidence:** assert `<select>` = 0 and `<details>` = 0 in `apps/web/src` and `packages/ui` via lint (`no-native-select`, `no-details`), and run `scripts/vercel-guidelines-audit.mjs` in CI.
5. **One site, one repo:** confirm the workflow set is `ci, e2e, pdf, deploy, scheduled`; deploy the **canonical** Pages site (website `/`, app `/app/`); then convert `Congregation-Assistant_Public` to the redirect stub (FINAL §1.2).
6. **Taste/visual pass:** one contact sheet each (≤ 6 images): Home 390 & 1440, People table, print section cards, open dialog in 11 themes, system pages (404/offline/error), S-21 + S-140 PDFs. Fix the top three issues once.

## 4. Owner action you must flag in `docs/OWNER-TODO.md`
**GitHub → source repository → Settings → Pages → Source: "GitHub Actions"** (without it the deploy workflow cannot publish). Also list DNS/Cloudflare/Razorpay steps from `OWNER-MANUAL.md`.

## 5. Gates and report
HARD gates: S-21 tick/label/month tests · all PDFs `NotoSans*` · system-page tests (every state reachable, accessible, no data loss) · no native select/details · assistant permission + zero-network tests · FINAL gates (overflow, clipping, overlays, console, contrast, data/RLS, interaction audit) · Sev1/Sev2 = 0. Deploy, run the post-deploy browser check on `/` and `/app/`, update `docs/POLISH-REPORT.md` (commits, URLs, counts, open items, **not verified**: real phones/printers/WhatsApp/Razorpay).

**Done when:** the S-21 ticks sit centred inside their boxes, labels and month names align to the template, every system state has a calm designed page, the duplicate theme is gone, the assistant can edit publishers (DOB, baptism date) and more with confirmation, and the single canonical site is deployed and verified.