# V2 MASTER README — Congregation Assistant

> **Implementation status, 2026-10-13:** This specification remains in force. The owner subsequently authorized deploying available unpaid features before completion; see [current deployment status](CURRENT-STATUS.md). The current branch implements a V2 foundation/preview, not the complete release. See [requirement-by-requirement verification](v2-release-checklist.md), [credential requirements](REQUIREMENTS.md) and [SQL rollout](DB-ROLLOUT.md). Private mode/default UI flags remain off until the original release gates pass. Additive SQL was applied after the owner explicitly authorized SQL updates; existing data was preserved.

> **Instruction to Codex:** Do **everything** in this document in **one continuous run**. Do not stop between sections, do not ask for approval, do not wait for the owner. Make the best decision, write it in `docs/DECISIONS.md`, and keep going. Only skip an item if it needs a credential you don't have — in that case build it behind a feature flag so it shows "Not set up yet" and never errors, and list it in `docs/OWNER-TODO.md`.

Product: **Congregation Assistant** (congregationassistant.com) — a PWA for congregations of Jehovah's Witnesses: publishers, service reports, attendance, midweek (OCLM) and weekend meeting schedules, duties, access control. Independent and unofficial.
Business goal: hundreds of paying congregations by end of 2027. **Headline goal of this release: UI/UX excellence + true opt-in end-to-end encryption (E2EE).**

---

## 0. Autonomy contract, deployment, and credit-saving

### 0.1 Deployment (the owner authorizes you to ship)
- Work on branch `v2/all`. Commit in small logical commits. Open **one** PR. When every gate in §16 passes, **merge to `main` and let the existing GitHub Actions / hosting deploy it**. The owner will correct anything afterwards.
- **Front-end and database ship separately, so the app must never break when a migration isn't applied yet.** Add a *capability probe* (call a harmless RPC / check a `schema_version` row at startup). If a required migration is missing, the related feature shows "Update pending" and falls back to legacy behavior. This makes it safe to deploy the front-end first.
- Keep `?ui=legacy` as an escape hatch for 30 days. New UI (`ui=v2`) becomes the default **only** when §16 gates pass.
- **Database:** all migrations go in `supabase/migrations/` as additive, reversible files (`up` + `down`) with a dry-run report. Never run destructive SQL against production project `ejosykrxjvwrhxfnputo`. If you have credentials for a *staging* project, apply and test there. The owner applies production migrations with a one-command script you provide (`scripts/apply-migrations.sh`) and a `docs/DB-ROLLOUT.md`.
- No secrets in the repo. Missing key ⇒ feature hidden, not broken.

### 0.2 Credit-saving protocol (important — the owner has limited Codex credits)
1. **Read once, plan once.** Read the repo structure and this README, write a short plan to `docs/DECISIONS.md`, then implement. Don't re-read whole files repeatedly; use `grep`/ranges.
2. **Batch edits.** Make all edits for a component/screen in one pass, then test once. Don't run the whole test suite after each small change — run only affected tests (`--grep`), then the full suite **once at the end** (preferably in GitHub Actions, which is free, not in Codex).
3. **Text-based verification first.** Prefer automated checks (axe, contrast script, DOM overflow script, Lighthouse CI, unit tests) over looking at images.
4. **Visual review budget: at most ~10 images in total.** Render screenshots with Playwright, stitch them into **contact sheets** (e.g. one PNG showing 6–12 screens as a grid, per theme group / viewport) with `sharp`/ImageMagick, and look only at those: (a) phone light theme, (b) phone dark theme, (c) phone at 200% text, (d) tablet, (e) desktop light, (f) desktop dark, (g) dialogs/sheets sheet, (h) weekend + schedule screens, (i) setup wizard, (j) E2EE flows. Fix issues found, re-render **only** the affected sheet once.
5. Stop when gates are green. No extra polish loops.
6. Heavy browser matrices (all themes × sizes × viewports) run in **CI nightly**, not locally.

### 0.3 Free-first rule
Prefer free/open-source: Cloudflare Pages (free), GitHub Actions, Supabase (free tier for staging; Pro recommended for production), libsodium (ISC), Lucide icons (ISC), Radix UI (MIT), Tesseract.js (Apache-2.0, on-device OCR), Web Push, Brevo free email, WhatsApp share links (no API). Paid items (WhatsApp Business API, Play Store $25 fee, LLM key) are **optional add-ons behind flags**.

---

## 1. Verified audit — every micro-issue found (fix ALL of them)

Static scan of the repo (counts are real). After you finish, run your own deeper audit (axe, Lighthouse, Playwright overflow checks), append new findings to `docs/AUDIT-v2.md`, and fix what you can.

### 1.1 Dialogs
| # | Issue | Evidence |
|---|---|---|
| D1 | **The close button looks "missing".** On *Add publisher* the close control exists but is an unlabeled 24 px SVG at 50% opacity (`text-teal-200/50`) with no hit area and no `aria-label`. Other dialogs use a text `✕`. Styles are inconsistent across 23 modals. | `index.html` ~2060 |
| D2 | 13 of 23 `modal-*` containers lack `role="dialog"` / `aria-modal`. | scan |
| D3 | `closeModal()` only adds `hidden` — no focus return, no scroll-lock cleanup, no unsaved-changes guard. No focus trap. Escape is wired only for `assignModal`/`personModal` (verify global Esc). | `index.html:4569, :2823` |
| D4 | Id collision: inner element `modal-oclm-parts-body` and title `modal-pub-title` match the CSS rule `[id^="modal-"]` (overflow/limits meant for dialog roots). Rename inner ids. | `app.css:17-18` |
| D5 | z-index chaos: ~29 distinct values from 1 to 100003. Replace with a token scale (base 0 / sticky 10 / nav 20 / overlay 30 / dialog 40 / toast 50 / critical 60). | scan |

### 1.2 Icons and visuals
| # | Issue |
|---|---|
| I1 | **111 emoji/symbol glyphs** used as UI (❌ ✓ ✕ ✅ ⚠ ♧ ♙ …) in `index.html`, plus emoji on buttons (⬇️ 🔒 🔗 ⚙️ 🔔) and glyph nav icons (⌂ △ !). Replace **all** with one minimal inline SVG icon set (Lucide, local sprite). Add a CI check that fails on emoji/pictographs in UI source. |
| I2 | Opacity-based text colors everywhere (`/45`, `/50`, `/60`, `/80`) produce low contrast and make themes impossible to control. Replace with semantic tokens. |
| I3 | Theme sprawl (`bw-light`, `bw-dark`, `light`, `dark`, `blue`, `crimson`, `scheduler`, `super-admin-theme`, README's seven). Consolidate (§3.4). |

### 1.3 Sizing, accessibility, layout
| # | Issue |
|---|---|
| A1 | **347 `px` font-size declarations vs 58 `rem`** — enlarged system text won't scale the UI properly. Convert to `rem`/`em`/`clamp()`. |
| A2 | Large text is a **manual checkbox** (`ca-large-text`). The app does **not detect** system settings: only `prefers-reduced-motion` is read. No `prefers-contrast`, `forced-colors`, `prefers-color-scheme`, `prefers-reduced-transparency`, text-scale detection. (§10) |
| A3 | 92 fixed pixel `height/min-height/max-height` rules and 10 `vh` heights (should be `dvh`/content-driven) — break at large text and on mobile browser chrome. |
| A4 | Form labels in *Add publisher* are not programmatically associated (`<label>` without `for`; e.g. Full Name, Service Group). Fix everywhere; add lint. |
| A5 | Tap targets: checkboxes/radios 16 px (`w-4 h-4`), icon buttons without padding. Minimum 44 px (48 px in publisher portal). |
| A6 | Jargon labels: "Gender Matrix", "Hope Designation", "Ecclesiastical Privileges". Plain wording; move rare fields into a collapsed "More details". |
| A7 | Desktop sidebar can't scroll when maximized: `app.css:82` forces `height:auto !important` on the list that needs bounded height; hover-expand logic fights the fixed width. Mobile: fixed Publish button overlaps content; desktop: subtitle clipped under header; inconsistent content widths (screenshots). |
| A8 | ~513 `!important` in `index.html`, ~272 in `app.css`; `--ca-sidebar-fixed` defined twice. |

### 1.4 Security / robustness
| # | Issue |
|---|---|
| S1 | ~134 `innerHTML` assignments + ~202 inline `onclick` handlers: XSS review needed and strict CSP is impossible. An escape helper exists (`oclmEscape`) but isn't universal. |
| S2 | Legacy overseer password path writes `password` from the browser into `group_access`. Replace with invites (§7). Remove plaintext handling. |
| S3 | 5 anonymous-executable RPCs (public report/attendance/schedule/application submit) with **no visible abuse throttling**. Add per-IP/per-token rate limits (edge function wrapper or DB-side counters) and optional Turnstile (free) on the public application form. |
| S4 | Runtime CDN dependence: `supabase-js` (jsDelivr), `pdf-lib` (cdnjs), Google Fonts **Poppins** (leaks visitor IPs to Google; unnecessary since Noto is bundled). Bundle locally, drop Poppins. |
| S5 | Service worker uses `skipWaiting` ⇒ silent updates. For E2EE integrity use a visible "Update available" flow and show app version/build hash in Settings. |
| S6 | `localStorage` holds congregation name/id, trial days, overrides, last tab/context. Under Private mode nothing sensitive may be in plaintext storage; verify sign-out clears everything. |
| S7 | Hard-coded support Gmail in ≥4 places → config `SUPPORT_EMAIL`. |
| S8 | `archive/legacy-app-config.js` retains the old project config in the repo — remove from the deployed tree. |

### 1.5 Performance / PWA hygiene
| # | Issue |
|---|---|
| P1 | 1.2 MB `index.html` monolith; `app-demo.js` (30 KB) ships to production. Code-split; demo loads only on `?demo=`. |
| P2 | Service worker pre-caches two ~0.5 MB Noto **TTF** files + 758 KB fontkit on install — heavy on mobile data. Use WOFF2, lazy-load PDF assets on first PDF use, and per-script subsets. |
| P3 | `manifest.webmanifest`: icons declare `"any maskable"` combined (must be separate files; maskable needs a safe zone); no `screenshots`, `shortcuts`, `categories`, `lang`, `display_override`. |
| P4 | Manual cache-name string (`ca-shell-s140-24`); replace with build-hash versioning. |
| P5 | Duplicate trees: `staging/` is byte-identical to root files; `public-site-preview/` duplicates the marketing site; fonts exist 3×. |
| P6 | PDF fonts are Latin-only — Indic-script names throw. (§12) |

### 1.6 Product gaps (also in scope)
Groups are free text (accidental duplicate groups); publisher email linking is buried (§6); WhatsApp is a single `wa.me` link; no Weekend meeting module; no setup wizard; imports are basic; no auto-detection of accessibility settings; no Android install flow beyond a modal.

---

## 2. Principles
1. **Simple first.** One screen, one job; ≤5 primary controls visible; progressive disclosure; plain language.
2. **Calm and familiar** — JW Library feel: quiet surfaces, large readable type, bottom tabs on phone. Take cues, not assets. No JW logos/trademarks.
3. **Works for every comfort level** (full digital / one link / WhatsApp / admin-only).
4. **Never lose work**; every destructive action has Undo or clear consequences.
5. **Honest privacy** — never claim more than is true.
6. **Fast on a cheap Android phone.**
7. **Accessible by default and adaptive** — the app detects the device's accessibility settings and adapts without breaking layout (§10).

---

## 3. Foundation: build system, design system, themes, icons

### 3.1 Repo and build
- Monorepo (use `git mv`): `apps/web`, `apps/site` (from `Congregation-Assistant_Public`), `packages/ui`, `supabase/`, `docs/`. Delete `staging/` and `public-site-preview/` once CI proves they're duplicates.
- Vite + TypeScript + React 18 + Tailwind 3 + Radix UI primitives + TanStack Query + Zustand + Zod + date-fns. **Strangler migration:** new shell/screens in `apps/web/src/v2/`; legacy screens remain reachable via an adapter until rewritten; reuse existing business logic modules by import.
- Bundle everything locally; strict CSP (no inline script/eval), `Referrer-Policy: no-referrer`, SRI for any third-party asset; no CDN.
- Budgets (CI-enforced): initial JS ≤ 250 KB gzip; LCP ≤ 2.5 s on throttled Slow-4G; INP ≤ 200 ms; CLS ≤ 0.1; route-level code-splitting (PDF, OCR, charts, crypto-worker load on demand).
- Add `LICENSE` (all rights reserved), `AGENTS.md`, `docs/DECISIONS.md`, `docs/OWNER-TODO.md`. Document moving hosting to Cloudflare Pages (free) with `.github/workflows/deploy.yml` that deploys if secrets exist.

### 3.2 Tokens (single source of truth: `packages/ui/tokens.css`)
Semantic only: `--bg --bg-elev --surface --surface-glass --surface-pressed --border --border-strong --text-1 --text-2 --text-3 --text-disabled --text-on-accent --link --accent --accent-hover --accent-soft --focus-ring --ok/-soft --warn/-soft --danger/-soft --info/-soft --shadow-raise --shadow-inset --blur --glass-alpha --radius-s/m/l/xl --space-1..8 --tap-min --text-scale --leading --z-*`. No raw hex or opacity-text in components.

### 3.3 Typography
Noto Sans (bundled, WOFF2) default; optional "Readable" family (Atkinson Hyperlegible, OFL, self-hosted). Script-aware fallbacks (Noto Sans Devanagari / Malayalam / Tamil / Telugu / Kannada / Gujarati / Bengali / Gurmukhi) loaded on demand, subsetted. Rem-based scale 0.75/0.875/1/1.125/1.25/1.5/1.875/2.25 × `--text-scale`. Remove Poppins.

### 3.4 Themes — six, complete, with text control
Each theme defines every token (surfaces, borders, text 1/2/3, accent, semantics, shadows, glass). Starting palettes (tune to pass contrast):
| Theme | Mode | bg | surface | text-1 | accent |
|---|---|---|---|---|---|
| Paper | light | `#F6F2EA` | `#FFFFFF` | `#1F1B16` | `#3E58A8` |
| Daylight | light | `#F3F6FA` | `#FFFFFF` | `#0F1B2D` | `#2F5BD3` |
| Lagoon | light | `#E9F5F2` | `#FFFFFF` | `#0B2B2A` | `#0F766E` |
| Slate | dark | `#0F1318` | `#171C23` | `#EEF1F5` | `#7AA2FF` |
| Midnight | dark | `#000000` | `#0B0D10` | `#F5F7FA` | `#8AB4FF` |
| Dusk | dark | `#14111F` | `#1D1830` | `#F1EEFA` | `#B79CFF` |
Plus **Auto** (follows system light/dark; default) and a **High-contrast** mode (auto on `prefers-contrast: more` / `forced-colors`).
**Text control:** *Text tone* Soft / Standard / Sharp (Standard ≥ 4.5:1, Sharp ≥ 7:1, Soft never < 4.5:1 body / 3:1 large); *Text size* S/M/L/XL; *Icon weight* Light/Regular/Bold; *Reduce glass*. A CI script computes WCAG contrast for every theme × tone × key pairing and **fails the build** under threshold. Preferences persist per device and follow the user profile (in Private mode, stored locally only). Publisher-portal appearance keeps working.

### 3.5 Visual language (glass + soft-tactile, accessible)
- **Glass only on floating layers** (top bar, bottom tab bar, sheets, popovers, hero cards): blur 16–24 px (≤12 px low-end), 1 px translucent border; solid fallback; never behind long body text without a scrim.
- **Soft-tactile (neumorphic-lite) only for controls** (switches, segmented controls, steppers, sliders, pressed states) — always with a 1 px border.
- Cards: solid surface, 1 px border, radius 20. Calm accent gradients only in hero areas.
- Motion 150–220 ms; spring on sheets; swipe between weeks; skeleton loaders; honor `prefers-reduced-motion`.
- Calendar-app cues: Agenda/Week/Month, large bold date headers, soft color-coding by part type, expandable cards, quick-add, swipe actions, split view on tablet/desktop, drag-and-drop on desktop.

### 3.6 Icons — minimal, one family
Lucide as a **local inline SVG sprite**; consistent stroke; weight option in Settings; **zero emoji**; every icon-only button has `aria-label` + tooltip; nav always shows icon + label. CI lint fails on emoji/pictographs in UI source.

### 3.7 Components (`packages/ui`, with a `/styleguide` route)
Button, IconButton, Card, StatCard, ListRow (swipe actions), Chip, Segmented, Switch, Select, Combobox, Input/Stepper, WeekPicker, **Dialog/BottomSheet (single adaptive component)**, Toast, Banner (with retry), EmptyState, Skeleton, Avatar, ProgressRing, QRCode, CopyField, PersonPicker, TabBar, Sidebar, Wizard/Stepper.

### 3.8 Dialogs — the close-button rule (fixes D1–D5)
One `Dialog`/`BottomSheet` used by **every** dialog:
- Always-visible **Close** icon button, top-right in a sticky header (44×44, `aria-label="Close"`, contrast ≥ 3:1 on its background, visible in every theme and at 200% text), plus **Esc**, backdrop tap (non-destructive dialogs only), and swipe-down on mobile sheets.
- Unsaved-changes guard ("Discard changes?").
- `role="dialog" aria-modal="true" aria-labelledby`, focus trap, focus returns to the opener, body scroll lock released on close, `inert` background.
- Long content scrolls inside the dialog body; header/footer stay pinned; footer holds primary + Cancel.
- **Also patch the legacy modals now** (small generic patch in `closeModal/openModal` + an injected, styled close button where missing) so the fallback UI isn't broken either.

---

## 4. App shell and navigation (reordered for "easiest to find")

### 4.1 Information architecture (everyday words, max 7)
1. **Home** — what needs attention
2. **Schedule** — segmented: **Midweek · Weekend · Duties · Print**
3. **People** — Publishers · Groups · Contacts
4. **Reports** — Service reports · Attendance · Analytics
5. **Messages** — WhatsApp · Notices · Reminders
6. **Access & Links** — Roles · Invites · Links hub
7. **Settings** — Appearance · Congregation · Privacy & delivery · Data · Billing · Help/Install

Role-limited users see only what they can use (e.g. Attendant overseer: Schedule › Duties; Weekend overseer: Schedule › Weekend & Duties; Group overseer: People › their group + Reports). "How to use", "Install app", "About" live under Settings › Help.

### 4.2 Desktop (≥1024 px)
Left rail 72 px (icon + label) / 248 px expanded, **user-toggled, no hover-expansion**. `position: sticky; top:0; height:100dvh; display:flex; flex-direction:column`; nav list `flex:1; min-height:0; overflow-y:auto`; pinned footer. Remove the `!important` overrides. Main content scrolls independently, max-width 1200 px. Top bar: congregation switcher, global search (Ctrl/Cmd+K), notifications, avatar menu.
**Tests:** viewport heights 600/768/900/1080/1440, zoom 100–200%, maximized sizes → nav scrolls when needed (wheel + keyboard), no horizontal overflow, no clipped titles.

### 4.3 Phone/tablet
Bottom glass tab bar, 5 slots: **Home · Schedule · People · Reports · More** (More = sheet with the rest + Appearance + Help + Sign out). One contextual primary action per screen, never overlapping content. Tablet: collapsed rail + split view. Primary actions in the bottom 40% of the screen.

### 4.4 Role-aware Home
Cards, not paragraphs: **Next task**, **Needs attention** (missing reports, unassigned parts, attendance due), **This week** (midweek + weekend strip), **Quick actions**.

---

## 5. Screen redesigns (keep all existing business logic)

Sign-in/request · Publishers · Groups · Reports (bulk grid) · Attendance · Midweek · **Weekend (new, §8)** · Duties · Print Center · Messages · Access & Links · Settings (max 5 groups; bottom-sheet pages on mobile) · SuperAdmin. Each gets mobile + desktop layouts and empty/loading/error/offline states. Simplify copy: replace instruction paragraphs with self-evident UI + a one-line hint.

**Add/Edit Publisher dialog (simplified):** one scrolling form with four clear sections — *Basics* (name, **group dropdown**, gender, appointments, pioneer status) · *Sign-in & contact* (**email field**, phone, address) · *Emergency contact* · *More details* (collapsed: hope, infirm RP, SFTS, notes). Labels properly associated; 44 px targets; plain labels (A6).

---

## 6. Publisher email = a normal form field; shared email = shared reporting

**What the code already has (don't duplicate):** `pub-login-email` + `CAPublisherLogin` in `app-publisher-home.js`, RPC-backed approved-family reporting (`docs/publisher-family-release.md`). **Problems to fix:** the field is hidden unless `canManageAccess()`, labelled "Google account email" with a long paragraph, positioned above the name, and the older *Account access* modal still makes admins "choose publisher → type email" separately.

**Required behavior**
1. In **Add/Edit publisher**, a visible optional field **"Email (for sign-in)"** under *Sign-in & contact*, validated, trimmed, lower-cased. Saving the publisher saves the email link **in the same action**. The admin never needs to open Account access just to link an email. (Account access remains only for overseer roles.)
2. **Duplicate-email prompt:** if the email already belongs to another publisher in this congregation, show an inline panel: *"This email is already used by Maria Thomas. Treat as a household so one sign-in can report for everyone?"* → **[Yes, share reports]** / **[No, use a different email]**. This prevents accidental sharing by typo.
3. **Shared scheme:** whoever signs in with that email gets a **"Reporting for: [Maria ▾]"** person switcher on the Report tab and can submit the monthly report for **each linked publisher**. Preserve existing boundaries: shared email grants **report submission only** (current reporting month) — no contacts, availability, appointments, or private data of the others, no attendance rights. First-linked publisher keeps the personal pages (existing rule), but the UI should present the household simply as "Household (3)".
4. Show a household badge on publisher rows; the edit dialog lists who shares the email, with one-tap "Remove from household".
5. Optional "Send invite" checkbox (WhatsApp share / email / link) after saving.
6. CSV import accepts an `Email` column and applies the same duplicate → household confirmation (batch review).
7. Server: reuse the existing RPCs; add a migration only if needed. Normalize email (lower-case, trim); never treat Gmail dots/plus as the same.
8. **Private (E2EE) mode:** login email stays plaintext metadata (needed for sign-in binding); household report keys are sealed to the account principal (§13.6).
9. Tests: add/edit with new email, with existing email (household prompt both branches), removal, revoked access, transferred publisher, importing duplicates, switcher submits for the right person, no leakage of the other's contacts.

---

## 7. Groups, roles, invites, Links Hub

### 7.1 Groups (fixes accidental groups)
```sql
create table service_groups (
  id uuid primary key default gen_random_uuid(),
  cong_id uuid not null references congregations(id) on delete cascade,
  name text not null,
  name_key text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  sort_order int not null default 0,
  overseer_publisher_id uuid references publishers(id),
  assistant_publisher_id uuid references publishers(id),
  archived_at timestamptz,
  created_at timestamptz default now(),
  unique (cong_id, name_key)
);
alter table publishers add column group_id uuid references service_groups(id);
```
Migration: normalize existing text groups (trim/collapse/case-fold), create rows, backfill `group_id`, keep `service_group` as a deprecated mirror, and output a dry-run merge report. **Only Main Admin** creates/renames/reorders/archives groups ("Add 8 groups" quick-create). Everywhere else is a **dropdown** (searchable) — no free text. Import never auto-creates groups (§11).

### 7.2 Roles and invites
Role presets in plain language: Main Admin (Secretary/Coordinator/Service Overseer) · OCLM Overseer & Assistant · **Weekend Meeting Overseer & Assistant** · Group Overseer & Assistant · Attendance/Attendant overseer · AV/Mics/Cleaning overseers · Publisher. A "What can this person see and do?" preview before saving. Invite flow: pick publisher → role bundle → sign-in method (Google / email magic link / one-link / WhatsApp link) → send. **Retire group-overseer passwords (S2).** One-tap "Remove access" kills sessions + links with an audit entry.

### 7.3 Links Hub
One page listing every link by purpose with owner, created, last used, scope, and **Copy · QR · Share · Rotate · Revoke**: live midweek schedule, live weekend schedule, group report forms, attendance form, publisher personal links, overseer links. Tokens ≥256-bit, **stored hashed**, rate-limited, exchange-to-session then `history.replaceState` to a clean URL. "Leaked? Rotate all."

---

## 8. Weekend Meeting module ("Weekend Assignments") — new

Handled by a different overseer (**Weekend Meeting Overseer** role, with assistants). Model it like the midweek scheduler (same assign-sheet UX, drafts, conflict checks, publish history, public view, PDFs), tailored to the weekend meeting. Reference apps (e.g. NW Publisher) for familiarity, but do not copy their assets.

**Per week (`weekend_weeks`)** — all assignee fields use the **PersonPicker** (tabs: *Elders & Ministerial Servants* · *All publishers* · **Visitor / other** [free-text name + congregation]):
- **Chairman** (at the beginning).
- **Opening song** — number field (free number, 1–999).
- **Public talk** — **customizable title** (free text, optional outline number), **speaker** (existing brother *or* visiting speaker: name + home congregation + optional phone), optional notes.
- **Watchtower Study** — **article title auto-filled and read-only** from the schedule import (§12), **conductor**, **reader**, study date range; song number(s) as configured.
- **Closing song** (number) and **concluding prayer** (person).
- **Meeting day/time** per week (default from Settings), **week exceptions**: circuit overseer visit, assembly/convention week, Memorial, no meeting, rescheduled.
- **Additional Duties for the weekend** — reuse the existing Additional Duties engine (custom sections/sub-duties with 1–4 people each): attendants, AV, microphones, stage, cleaning, parking, hospitality, etc. Weekend and midweek duty definitions are separate lists but share people/availability data.
- **Visiting speakers address book** (`visiting_speakers`): name, congregation, phone (private), talks they give; autocomplete for reuse. Encrypted in Private mode.
- Suggestions never hard-block: qualification defaults (who may chair/conduct/read) are **editable by the overseer** in *People setup*; only true conflicts (double booking, away dates, same person in conflicting roles) warn. Shared availability/away periods across midweek and weekend.
- **Publish & share:** same stable live link with a **Midweek | Weekend** switch; searchable by name across weeks; Weekend PDF layouts in Print Center (one-week, month, large-print, duty roster); WhatsApp templates (speaker confirmation/reminder, assignment reminders) via Messages.
- RLS for the new tables mirrors the midweek pattern: weekend overseer + assistants + main admin; publishers read only published projections. Reuse optimistic revisions, immutable publish history and rollback. Add SQL contract tests and Playwright tests (assign, visitor speaker, exceptions, publish, view, print).

---

## 9. Setup Wizard for new congregations ("installation wizard")

Full-screen guided flow on first sign-in to an empty workspace (resumable, skippable per step, progress saved, **Back** everywhere, one idea per step, plain language, friendly illustrations from the icon set — no emoji):
1. **Welcome** — what we'll set up (≈10 minutes).
2. **Congregation basics** — name, language(s), country/time zone, midweek and weekend day/time.
3. **Privacy choice** — *Standard+* vs *Private (end-to-end encrypted)*, side by side, with plain consequences (§13.1). If Private → run the key-setup and recovery flow right here (§13.4).
4. **How will people use it?** — choose delivery modes: Full digital · One link · WhatsApp · Admin-only (and "Publisher portal on/off") with a live consequences panel (§14).
5. **Groups** — "How many service groups?" → names (quick-create).
6. **Add people** — the Import Center (§11): paste/upload/scan, or add one by one.
7. **Roles** — invite the overseers (Main admin, OCLM, **Weekend**, Attendance, Duties, Group overseers).
8. **Schedule** — first midweek and weekend week auto-filled from the schedule data; assign a few parts.
9. **Share** — Links Hub preview: copy/QR/WhatsApp the live schedule link.
10. **Install the app** — Android/iOS/desktop install buttons (§15).
11. **Done** — checklist card stays on Home until everything is ticked.
The wizard is also reachable later (Settings › Setup guide). SuperAdmin provisioning and the public request form reuse the same **capability catalogue** (`capabilities.json`) so "what you get → choose → confirm" is consistent.

---

## 10. Adaptive accessibility — detect device settings and adapt without breaking the UI

Auto-detect on load and on change (`matchMedia` listeners, `visibilitychange`, `resize`), apply via `data-*` attributes on `<html>`, expose a Settings section **"Adapted to your device"** with a toggle to turn auto-adaptation off (user choice always wins):
- **Text size:** convert all sizing to `rem/em`; compute `rootScale = computedRootFontSize/16` (Android Chrome and most browsers apply the system font scale to the root size) → buckets 1 / 1.15 / 1.3 / 1.5 / 2+. At ≥1.3: single-column layouts, stacked controls, wrapped nav labels (no truncation), simplified cards, bigger tap targets; no fixed heights; no clipped text. Add the WebKit `font: -apple-system-body` root class as progressive enhancement for iOS Dynamic Type (verify behavior; fall back gracefully).
- `prefers-contrast: more` → High-contrast mode; `forced-colors: active` → system colors (explicit focus outlines, no background-image-only meaning); `prefers-color-scheme` → Auto theme; `prefers-reduced-motion` → no animations; `prefers-reduced-transparency` / low-end → Solid mode; `pointer: coarse` / `hover: none` → larger targets, no hover-only UI; `inverted-colors` safe.
- Keep the manual Large-text switch but map it onto the same system.
- **WCAG tests:** 1.4.4 resize (root 200%), **1.4.10 reflow (320 CSS px at 400% zoom, no two-dimensional scrolling)**, 1.4.12 text spacing override, 2.5.8 target size, focus visible/not obscured, keyboard-only flows. Playwright: inject `html{font-size:200%}`, emulate media features, run axe and an overflow detector (any element wider than viewport / any `scrollWidth > clientWidth` on body) across the key screens.
- Publisher portal: the four tabs wrap to two columns at large text; notifications stay above the nav.

---

## 11. Import Center — "easiest possible" data import

One screen, three ways in (all client-side; works in Private mode):
1. **Paste from a spreadsheet** (textarea; tab/comma detection) · **Upload** CSV/XLSX/vCard (`.vcf` from phone contacts) · **Scan a paper list** (optional, on-device OCR via Tesseract.js — nothing leaves the device; the result goes to the same review table).
2. **Auto column mapping** with fuzzy header matching (Name / First+Last / Phone / Email / Group / Appointment / Pioneer status / Address / Emergency contact …) and a one-tap "Use sample template" download (existing sample CSVs stay).
3. **Review table before saving:** inline-fixable cells, red/amber flags (missing name, bad phone/email, duplicate person, unmatched group), phone numbers normalized to E.164 using the congregation's country, **groups mapped to existing groups with suggestions ("Did you mean Group 3?") — never auto-created**, duplicate-email → household prompt (§6), per-row include toggle.
4. **Dry-run summary** ("42 new, 3 updates, 2 skipped") → **Import** → **Undo import** (batch id) for 7 days.
Also: restore from encrypted backup; export everything (CSV/JSON) at any time.

---

## 12. Schedule data import (jw.org / wol.jw.org) and Print Center

The owner states they hold authorization for jw.org/wol.jw.org schedule data. **Implement it, with safeguards:**
- `docs/permissions/jw-org-authorization.md` (template for the owner to record who/when/scope + attach the letter). The importer runs only when `JW_IMPORT_ENABLED=true`; a global kill switch exists.
- **Server-side, centralized** (scheduled job): `workbook_weeks(lang, week_start, section, position, title, duration_min, songs, scripture_ref, source_url, content_hash, fetched_at)` and `watchtower_weeks(lang, week_start, article_title, study_range, source_url, …)`. Scrape once, serve all congregations. Polite client: robots.txt, ≤1 req/s, ETag/If-Modified-Since, descriptive User-Agent with contact email, backoff; store only needed structured fields; show "Source: wol.jw.org" attribution.
- **Titles are read-only everywhere** (midweek parts, Watchtower article). Editable: assignees, week exceptions, notes, and the **public talk title** (it isn't part of the workbook). SuperAdmin-only audited override for emergencies.
- Multi-language per congregation; "Not published yet" instead of blanks; "Verified from wol.jw.org on <date>" chip.
- **Print Center (custom PDF):** *choose what → options → live preview → Download / Print / Share to WhatsApp (Web Share with files)*. Layouts: single-week one-pager (midweek or weekend), month grid, multi-week booklet, **large-print list**, duty rosters, group report sheets, plus existing S-21/S-3/S-88/Emergency exports. Options: range, paper (A4/A5/Letter), orientation, **font scale 100–200%**, color / B&W / ink-saver, language, include/omit parts, QR to live link, saved presets. pdf-lib + fontkit with **embedded Noto fonts for every supported script** (fix P6; names in Indic scripts must render) + matching `@media print` styles. CI renders PDFs for English, Hindi, Malayalam, Tamil and checks bounds/clipping.

---

## 13. END-TO-END ENCRYPTION (primary goal) — "Private mode"

The owner's decision: build real, opt-in E2EE. The user chooses it (in the Setup Wizard or later in Settings › Privacy) and **accepts responsibility for their keys**. Implement it properly using audited primitives; **do not invent crypto**.

### 13.1 Modes and honest disclosure
- **Standard+** (default for people who don't choose Private): HTTPS, server-enforced access control, platform encryption at rest, plus field-level encryption of the most sensitive fields with server-managed per-congregation keys. Plain label: "protected, but the service operator could technically access it."
- **Private (End-to-end encrypted):** sensitive data is encrypted on the user's device before upload; the server stores ciphertext and minimal metadata and **cannot read it**. If every key holder loses their keys **and** the recovery phrase, data is **permanently unrecoverable** — Congregation Assistant cannot help.
- Show a plain-language comparison **before** choosing, side by side, including this matrix:
| Feature | Standard+ | Private |
|---|---|---|
| Reports, schedules, portal | ✅ | ✅ (decrypted on device) |
| One-link access | ✅ | ✅ key lives in the link after `#` (never sent to server); rotating a link means re-sharing |
| Server-side search/analytics/emails with names | ✅ | ❌ done on device / generic text only |
| WhatsApp **AI intake** | ✅ | ❌ (message content passes through WhatsApp and our servers) |
| WhatsApp **share links** (Level 1) | ✅ | ✅ |
| Forgot password/lost device | easy | needs recovery phrase or a second admin device |
| Support can view your data | only with explicit access | never |
- Claim rules: say "end-to-end encrypted" **only** for Private mode and only for the data scopes actually covered; list what is **not** covered (metadata, login emails, app delivery trust — §13.8). `E2EE_CLAIMS_ENABLED` flag defaults **false** and is set true by a CI check only when the whole E2EE test suite (§13.9) passes.

### 13.2 Cryptographic design (Architecture Decision Record in `docs/encryption/ADR-001.md`)
- **Library:** `libsodium-wrappers-sumo` (ISC, widely audited) for: X25519 sealed boxes (`crypto_box_seal`) for key wrapping; Ed25519 signatures; Argon2id (`crypto_pwhash`); **XChaCha20-Poly1305** (`crypto_aead_xchacha20poly1305_ietf`) for record encryption (192-bit random nonces remove the nonce-reuse limits of 96-bit AES-GCM). WebCrypto only for device-key storage. Run crypto in a **Web Worker**.
- **Protocol choice:** MLS (RFC 9420) is deliberately **not** used (heavy for ≤ ~20 members per congregation); document why and the revisit criteria. Don't hand-roll any protocol beyond composing the primitives above as specified here.
- **Identities:** each user (login principal) has an X25519 encryption keypair + Ed25519 signing keypair generated on-device. Private keys are stored in IndexedDB wrapped by a **non-extractable WebCrypto device key** ("remember this device"); never plaintext, never in localStorage.
- **Account recovery:** a **12-word recovery phrase** (open wordlist; check the license, add attribution if required) shown once, which Argon2id-derives a key that encrypts a backup of the private keys stored server-side as ciphertext (`e2ee_key_backups`). Plus optional **recovery custodian**: a second admin (or two) who hold wrapped copies of the congregation's scope keys.
- **Scope keys:** random 32-byte symmetric keys per **scope + epoch**: `people_private` (phones, addresses, DOB, emergency contacts, notes), `reports:<group>`, `attendance`, `schedule_midweek_draft`, `schedule_weekend_draft`, `dept:<name>`, `visiting_speakers`. Each key is **sealed to every authorized member's public key** and stored in `e2ee_key_envelopes`. Role scopes mirror existing roles (group overseer gets only their group's report scope).
- **Records:** `e2ee_records(cong_id, scope, kind, record_id, epoch, revision, nonce, ciphertext, updated_at, updated_by)`. AAD = canonical(`cong_id|scope|kind|record_id|epoch|revision|schema_version`). Server RLS lets a member fetch only ciphertext of scopes they hold an envelope for — **server controls who downloads, cryptography controls who reads**. Optimistic revisions reuse the existing conflict logic.
- **Sealed inbox for submissions:** a publisher (or a public report form) encrypts a report with a fresh random record key, **seals the record key to the congregation's `reports_intake` public key(s)** and to the submitter's own key. Publishers never hold group scope keys, so they can't read others' reports. One-link users derive their own key from a secret in the link fragment.
- **Revocation:** removing a member or role creates a **new epoch** key sealed to remaining members; old epoch becomes read-only; records re-encrypt lazily/in the background by an admin client with visible progress. UI states plainly that copies already obtained cannot be recalled.
- **Key authenticity:** public keys are signed by their owner and countersigned by a Main Admin at approval. Clients pin admin keys (trust-on-first-use), show a **Safety code** (digits + word groups, no emoji) for out-of-band comparison between admins, and **warn loudly when a key changes**.
- **Rollback/replay:** revision in AAD + client remembers last-seen revision per record → warn if the server serves an older one.
- **Search/statistics/PDF in Private mode:** computed on the device from decrypted data; optional encrypted-at-rest local cache; cleared at sign-out unless "remember this device".
- **Published schedules in Private mode:** "Private link" — schedule snapshot encrypted with a key in the URL fragment; public (non-private) publishing remains an explicit, labelled choice.

### 13.3 Data inventory and what is encrypted
Do a complete inventory (every table, RPC, realtime channel, cache, backup, queue, export). Encrypt in Private mode: phones, addresses, DOB/baptism dates, emergency contacts, notes/remarks, service reports (hours, studies, remarks), attendance counts, publisher names and appointments, schedule drafts and published projections (Private link), visiting speakers, backups, offline pending changes. **Plaintext metadata (disclosed in-app):** congregation id, internal record ids, group membership ids, role grants and **login emails** (needed for sign-in binding), timestamps, record sizes/counts, scope names.

### 13.4 Enable / disable flows
**Enable Private mode (wizard, resumable):** (1) read & accept the responsibility screen — checklist + type `I UNDERSTAND`; (2) generate keys on-device; (3) show the recovery phrase; **confirm by re-entering 3 random words**; offer **printable recovery sheet** (PDF) and "copy/save" options; (4) strongly recommend adding a **second admin as custodian** (not forced); (5) download an **encrypted backup** and **test-restore it** in-browser; (6) migrate: client reads existing data → encrypts → uploads → **verifies by round-trip decrypt** → flips `privacy_mode='private'` → calls an admin RPC to **null out plaintext columns** (only after steps 3–5 verified); (7) show an honest note that **old database backups/logs may retain plaintext until their retention expires**.
**Disable Private mode:** decrypt on-device → upload → confirm → delete ciphertext, with consequence screen.
**New device:** QR/code approval from an existing admin device, or recovery phrase. **Lost device:** revoke it from another device (new epoch). Both flows covered by tests.

### 13.5 Feature compatibility
Capability gating reads `privacy_mode`: incompatible features (§13.1 matrix) are hidden/disabled with a one-line reason, never erroring. Reminders in Private mode use generic text. SuperAdmin cannot read private data and the UI says so.

### 13.6 Households and one-link in Private mode
Publishers linked to the same login email (§6): each linked publisher's report-intake envelope is sealed to the **account principal**, so the person can report for all of them and read only their own submissions. One-link users: per-publisher secret in the fragment derives their key.

### 13.7 Responsibility and legal text
Responsibility screens (enable, recovery, disable), a `docs/encryption/USER-GUIDE.md` in plain language, in-app **"How your data is protected"** page, and draft Terms/Privacy clauses in `docs/legal/` marked **"needs lawyer review"**. Never make guarantees like "zero risk".

### 13.8 Limits to state in docs and UI
A hosted web app can be changed by whoever controls the served code. Mitigations (implement all): strict CSP, SRI, no third-party scripts, **visible app version/build hash** in Settings and a public `/.well-known/build-hash.txt`, **no silent auto-update** (explicit "Update available" prompt), reproducible build instructions. Also: compromised devices, screenshots/exports/printed PDFs, and metadata are outside E2EE. Add `docs/encryption/THREAT-MODEL.md` and `docs/encryption/AUDIT-READINESS.md` (for a later paid independent review).

### 13.9 E2EE tests (all must pass before `E2EE_CLAIMS_ENABLED` flips)
Known-answer vectors; tamper (ciphertext/AAD/revision/epoch) ⇒ failure; old revision replay ⇒ warning; wrong scope key ⇒ failure; fuzz envelope parser; **two-browser-context Playwright**: new-device approval, concurrent edits, revocation → removed member can't decrypt new data, lost-device recovery, recovery-phrase restore, custodian recovery; migration of a 1,000-publisher fixture; performance (decrypt 5,000 records < 1.5 s on mid-range profile in a worker); **no-plaintext checks**: a sentinel string (e.g. `CA_SENTINEL_NAME_91ac`) entered into every field must never appear in any network request/response body, any `e2ee_*` or other table dump, localStorage/sessionStorage, or service-worker cache while in Private mode.

---

## 14. Delivery modes, request wizard, WhatsApp, Links

### 14.1 Four delivery modes (congregation default; per-publisher override)
A **Full digital** (Google/magic-link login, personal portal, push) · B **One link** (personal link, no password) · C **WhatsApp-only** (messages out, replies in; consent recorded) · D **Admin-only** (no publisher portal; printed PDFs / group broadcasts). Any combination; Publisher-portal master switch (off ⇒ no publisher links generated, friendly "not enabled" page). Store `delivery_mode`, `wa_consent_at`, `wa_opt_out_at`, `preferred_language`; consent explicit, withdrawable (DPDP-style).

### 14.2 Request wizard (website and in-app) — "what you get → choose → confirm"
Capability catalogue (`capabilities.json`, one source of truth for site/app/SuperAdmin) → choices (delivery modes, modules, languages, privacy mode, WhatsApp level) → live plain-language consequences → authorize → reference number. Persist on `congregations.settings` (JSONB, versioned).

### 14.3 WhatsApp Level 1 — Smart Share (free, no API)
Message Center with templates (assignment reminder, schedule published, weekend speaker confirmation, report reminder, attendance request, welcome/invite, custom) · placeholders `{name} {part} {date} {link}` · per-language templates · WhatsApp-bubble preview · **send queue** (choose recipients by group/assignment/mode → stepper with personalized previews → `wa.me/<E.164>?text=` → mark ✓/skip, resumable) · group broadcast (WhatsApp *bold* formatting + live link; PDF/image via Web Share with files where supported; copy fallback) · E.164 normalization (default country from settings; +91 aware) · opt-out and quiet hours (21:00–07:00 warning). Works in Private mode (user-initiated).

### 14.4 WhatsApp Level 2 — Business API + AI intake (paid add-on; flag; **disabled in Private mode**)
Design for cost/policy: inbound-first; outbound as *utility* templates; verify current Meta pricing before launch; narrow task-specific assistant only (Meta bans general-purpose AI chatbots on the Business API). Edge-function webhook verifies `X-Hub-Signature-256`, dedupes, rate-limits. Identity = verified consent-linked phone → publisher; unknown numbers get one polite generic reply + admin notification and **never** receive congregation data. Parser: language detect → rules-first → LLM fallback returning **strict JSON** (Zod) from an allowlist of intents (`submit_report`, `set_away`, `confirm_assignment`, `decline_assignment`, `ask_my_next_assignment`, `request_human`); the LLM has **no DB access and no tools**; message text is untrusted (prompt-injection tests). Autonomy per congregation: *Confirm-first (default)* / *Auto-submit high-confidence + Undo* / *Admin review inbox*. Kill switch, daily cap, cost meter, STOP keyword. If keys missing: "Not set up" with a setup checklist.

---

## 15. Install as an app (Android first), free

**Verified options:** a PWA installs from Chrome on Android (Chrome creates a WebAPK) at no cost; a Trusted Web Activity wrapper (Bubblewrap) can be distributed as an **APK/AAB**; publishing on Google Play requires a **one-time $25 developer fee** and, for new accounts, a **closed test with 12+ testers for 14 days** before production. Google Play's payments rules also apply to apps distributed there — keep billing on the website, not inside the app.

Do all of this:
1. **PWA hardening (P3/P4):** separate `any` and `maskable` icons (192/512 + maskable with safe zone + monochrome if possible); `screenshots` (narrow + wide), `shortcuts` (Enter report, This week's schedule), `categories`, `lang`, `display_override: ["standalone","minimal-ui"]`, `start_url` with `?source=pwa`, per-theme `theme-color` meta; service worker with navigation **offline fallback page**, read-only offline cache of the schedule/public shell (no records cached under Private mode except encrypted-at-rest), build-hash versioning, **visible update prompt (no silent skipWaiting)**. Lighthouse PWA/installable checks in CI.
2. **Smart install UI:** capture `beforeinstallprompt` → a friendly **Install app** button in the Setup Wizard, Home card (dismissible) and Settings › Help; detect `display-mode: standalone` to hide it; Android Chrome / Samsung Internet / Firefox instructions; **iOS**: step-by-step "Share → Add to Home Screen" illustration (iOS web push works for installed web apps — verify current behavior in docs); desktop Chrome/Edge install button. After install: welcome screen + offer notifications.
3. **Free APK:** `.github/workflows/android-apk.yml` using Bubblewrap/PWABuilder to build a signed **APK + AAB** from the production manifest when signing secrets exist (skip cleanly otherwise); publish to GitHub Releases; website page `/android` with "Install unknown apps" steps and Digital Asset Links (`/.well-known/assetlinks.json` template). Primary recommendation stays **PWA install**; APK is the sideload option.
4. `docs/android-distribution.md`: PWA vs APK vs Play Store comparison, the $25 fee and 12-tester/14-day requirement, payments-policy note, step list for the owner. Do **not** publish to Play automatically.

---

## 16. Quality gates (CI runs these; merge to `main` only when green)

- Existing suites green: `npm test`, `npm run test:browser`, SQL contract tests, PDF checks.
- New tests: dialogs (every dialog has a visible, labelled Close; Esc; focus return; unsaved guard), nav scroll at maximized sizes, household email flows, groups migration dry-run, weekend module, setup wizard (happy path + resume), import center (paste/CSV/vCard, duplicates, undo), adaptive accessibility (§10), E2EE suite (§13.9), PDF scripts, install/manifest checks.
- Accessibility: axe zero serious/critical; WCAG 2.2 AA; contrast matrix (themes × tones) passes; keyboard-only paths; tap targets ≥ 44/48 px; no emoji in UI source.
- Performance budgets (§3.1); security: strict CSP, `npm audit`, RPC grants/`search_path` checks, abuse throttling on anonymous RPCs (S3), prompt-injection tests if Level 2 is enabled.
- Visual review via **contact sheets** (§0.2) — max ~10 images.
- Update `docs/` (usability review, launch review, competitor review, AUDIT-v2) and write `docs/v2-release-checklist.md` with the flag-flip order and rollback plan.

**Work order (single run, dependency order):** repo hygiene + build system → tokens/themes/icons/components/dialogs → shell + navigation → groups/roles/links + email-in-publisher-form → screens (publishers, reports, attendance, midweek, duties) → **weekend module** → Import Center → Print Center + schedule import → setup wizard → adaptive accessibility → E2EE → delivery modes + WhatsApp Level 1 (Level 2 behind flags) → install/PWA/APK → website + domain/email docs → full verification → merge.

---

## 17. Brand, website, domain, email (docs + code; owner applies DNS)

`apps/site` rebuilt with the same tokens: hero with real device frames (fictional data), capability cards, 4 delivery modes, **privacy modes comparison (honest)**, pricing (single plan + optional WhatsApp add-on; INR and USD), FAQ (independent/unofficial), request wizard, demo links (`?demo=publisher`, `?demo=admin`), Android/iOS install guide. Lighthouse ≥ 95.
`docs/domain-and-email.md`: `congregationassistant.com` (site), `www` → apex, `app.` (app), `mail.` (transactional sender, separate SPF/DKIM), optional `status.`. **Titan (GoDaddy):** MX `mx1.titan.email` (10) and `mx2.titan.email` (20); one SPF TXT `v=spf1 include:spf.titan.email ~all`; DKIM TXT from the Titan dashboard; DMARC starting `p=none` with a `rua` mailbox, tighten after 2–4 weeks; mailboxes `hello@ support@ billing@ dmarc@`. Only one SPF record per hostname. Centralize `SUPPORT_EMAIL`, `PUBLIC_SITE_URL`, `APP_URL`; checklist for Google OAuth consent screen (domains, privacy/terms URLs, branding verification), Supabase auth redirect URLs/SMTP, CORS.

---

## 18. Owner inputs (never block on these — build behind flags)
1. Written JW.org/WOL authorization (scope/date) → `docs/permissions/` (and confirmation it covers the official form templates, or ship independently designed layouts).
2. Meta WhatsApp Business account/number/templates/tokens; LLM API key (both optional add-ons).
3. Transactional email provider account (sender on `mail.`); DNS access.
4. Android signing keystore as GitHub secrets (for APK/AAB); optional Play developer account.
5. Razorpay merchant/KYC + keys; lawyer review of Terms/Privacy/E2EE responsibility text.
6. Real testers: one younger and one older first-time user; a pilot congregation.

**Definition of done:** a first-time secretary completes the Setup Wizard and publishes a shareable midweek **and** weekend schedule in under 10 minutes on a phone with 200% system text, no horizontal scrolling and every dialog closable; adding a publisher with an email also creates their login link in the same step; a household sharing one email can file reports for everyone; Private mode can be enabled, recovered, revoked and verified end-to-end with the sentinel test; and the app installs on Android with one tap.
