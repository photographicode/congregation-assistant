# V4-UX — Simplify and Elevate the Congregation Assistant Interface

> **Audience:** Codex (or any coding agent) working in `congregation-assistant`.
> **Install:** save as `docs/V4-UX-SIMPLIFICATION.md`, then paste the block in §0.2 at the **top** of `AGENTS.md`.
> **Scope:** navigation, information architecture, screen layout, copy and visual polish. **No** backend, schema, RPC, PDF-engine or auth changes.
> **Priority order (from AGENTS.md, unchanged):** Publishers > Department Overseers > Main Admin.

---

## 0. How to use this document

### 0.1 Reading order
1. `AGENTS.md`, `DESIGN.md`, `docs/V4-RELEASE.md`, `docs/superpowers/specs/2026-10-26-v4-design.md`.
2. This file, completely, before touching code.
3. Work **phase by phase** (§9). Do not start a phase until the previous phase's gates pass and its evidence is written to `docs/POLISH-REPORT.md`.

### 0.2 Block to paste at the top of `AGENTS.md`
```md
# Current authority: V4-UX Simplification — supersedes V4 shell/IA decisions where they conflict

Follow docs/V4-UX-SIMPLIFICATION.md phase by phase. This is a UI/IA/copy change only: no schema, RPC, PDF, auth or
retention changes. Every existing tool, role boundary, route identifier (`?screen=`, `?section=`, `?tool=`, `?demo=`),
PDF and recovery format must remain reachable. Existing release gates stay intact; do not weaken, skip or re-baseline
a test to make it pass. When a browser check asserts an old label that this plan intentionally renames, update the
selector in the same commit and list it in docs/POLISH-REPORT.md under "Intentional selector changes". Demo mode must
never call Supabase. No new paid services. Do not alter hosting/deploy workflows.
```

### 0.3 Kickoff prompt (paste into Codex)
```text
Read AGENTS.md, DESIGN.md and docs/V4-UX-SIMPLIFICATION.md fully. Create branch v4/ux-simplification from the current V4
branch. Execute Phase 0 only: install, run the baseline gates, capture the screenshot matrix in §10, measure the task
tap-counts in §2.3 against the demo roles, and write docs/qa/v4-ux/BASELINE.md. Stop and report. Do not edit product code
in Phase 0.
```

### 0.4 What was and was not verified when this plan was written
- **Read:** the full source tree (`apps/web/src`, `packages/*`), `AGENTS.md`, `DESIGN.md`, the V4 spec/plan/release notes, ESLint config, the check scripts' selectors, and the demo screenshots in `apps/site/assets/demo/`.
- **Not run:** the app. The archive had no `node_modules` and no network was available, so **no V4 render was seen**. The bundled screenshots predate V4 (dark teal V3 look, disclosure triangles, `Demo changes` chip). Every "current behaviour" claim below comes from reading source and is tagged **(code)**. Phase 0 exists to confirm or correct each one. If Phase 0 contradicts a finding, trust the running app, record the correction in `docs/DECISIONS.md`, and adjust the plan.

---

## 1. Non-negotiable constraints (read before writing any code)

### 1.1 Product and safety
- Keep: Google approved-account sign-in, all roles and department boundaries, every existing tool, S-21/S-88/S-140/emergency/duty PDFs, backup/restore, owner console, subscription screens, on-device assistant (Main Admin only), report links and public report form.
- Do **not** add: assignment-change requests, approval flows for time away, new notification channels, new paid services, DNS/domain activation (`CUSTOM_DOMAIN_READY` stays `false`).
- Demo (`?demo=…`) must make **zero** Supabase requests. No real names, emails or records in fixtures or screenshots.
- Do not change `tests/golden/**`, `packages/pdf/**` templates, `supabase/**`, or `public-config.json` secrets handling.

### 1.2 Code rules enforced by `eslint.config.mjs` (all new/changed code must pass with zero new diagnostics)
| Rule | Practical meaning |
|---|---|
| `product/no-raw-jsx-text`, attribute check | **Every visible string goes through `t('key')`.** No literal text in JSX or in `title/placeholder/aria-label/alt/label/eyebrow/description/detail`. |
| `product/no-native-select` | No `<select>`. Use chips, a segmented control, or the shared picker. (Existing `LegacySelect` calls are being removed where this plan touches them.) |
| `product/no-details` | No `<details>`/`<summary>`. No chevron-to-reveal. |
| `product/no-emoji` | No pictographs in source. Lucide icons + text labels. |
| `product/no-hex` | No raw `#rrggbb` in TS/TSX. Tokens only. |
| `no-restricted-syntax` | No inline `style={{…}}` objects, `innerHTML`, `dangerouslySetInnerHTML`, `eval`. |
| `max-lines` 400 / `max-lines-per-function` 120 / `complexity` 12 / `max-params` 4 | New files stay small. This is also the lever that breaks up `Workspace.tsx`. |
| `no-nested-ternary`, `no-magic-numbers` (allowed: 0, 1, -1, 2) | Name constants. Use early returns or small components instead of ternary chains. |
| `react/button-has-type`, `jsx-a11y` strict | Every `<button type="button">`. Real labels. |
| `@typescript-eslint/no-explicit-any` | No new `any`. |

`eslint-suppressions.json` holds per-file counts for legacy violations. **Counts may go down, never up.** When you shrink a file's violations, update the suppressions the way `scripts/check-eslint-ratchet.mjs` instructs. Run it before every push.

### 1.3 i18n mechanics (easy to get wrong)
- UI strings live in `packages/core/locales/en.json`; `MessageKey` is derived from it, so **adding a key to `en.json` is what makes `t('new.key')` type-check**.
- Existing V4 keys are opaque hashes (`v4.d47d7cb0e4` = "More"). **Do not mint new hash keys.** New keys use readable names: `ux.today.title`, `ux.reports.missing.empty`, etc. When you change the wording of an existing hash key, edit its value in `en.json`; do not create a duplicate (`scripts/no-shadowed-translation.mjs` will flag shadowing).
- Launch language is English. Do not touch the other locale files; missing keys fall back to English by design.
- Names, numbers and user text get `translate="no"` where DESIGN.md §9 requires it.

### 1.4 Design-system rules to honour (from `DESIGN.md`; this plan does not override them)
Tokens only; all component states (hover under `@media(hover:hover)`, active, `:focus-visible` ring, disabled via `aria-disabled`, loading, selected, error); touch targets ≥ 44 px; inputs ≥ 16 px; `tabular-nums` on figures; one `<h1>` per screen; opaque dialogs; `prefers-reduced-motion/-contrast/-transparency` respected; no text on bare gradients; skeletons mirror content; empty/error/loading states designed for every list.

### 1.5 Gates that must stay green on every phase (per `AGENTS.md`)
```sh
npm run lint && npx tsc -p apps/web/tsconfig.json --noEmit
npm test                      # public-safety + vitest
node --test scripts/v2-tests/*.test.mjs
npm run build && npm run check:bundle
npm run check:css && npm run check:style && npm run check:strict-types
npm run check:contrast && npm run check:vercel-guidelines
npm run test:browser          # cutover browser check (demo roles)
node scripts/check-v3-shell.cjs && node scripts/check-short-navigation.cjs
node scripts/check-publisher-portal.cjs && node scripts/check-scheduling-simplicity.cjs
node scripts/check-reachability.cjs
npm run test:pdf              # must be untouched, but must still pass
```
If a gate cannot run in your sandbox (e.g. missing Chromium at `/usr/bin/chromium`), say so in `POLISH-REPORT.md`. **Do not mark it passed.**

---

## 2. Diagnosis: why it looks good but is hard to use

### 2.1 Findings (all **(code)** until Phase 0 confirms)

**F1 — Three overlapping navigation systems glued together with hidden state.**
`main.tsx` defines (a) `routes` (10 screens), (b) `sections` from `packages/core/navigation.ts` (7 sections with hub pages), and (c) `tools` (29 entries, 6 flagged `available:false` stubs). Sub-screens are selected by writing `sessionStorage` keys (`ca-workspace-tool`, `ca-report-action`, `ca-pdf-open`, `ca-quick-action`, `ca-person-search`, `ca-s21-person`) and firing `CustomEvent`s (`ca:open-tool`, `ca:find-person`, `ca:quick-action`, `ca:select-s21`) that `Workspace.tsx` listens for. Consequences:
- `navigate()` uses `history.replaceState` only → **the browser/Android Back button leaves the app** instead of going to the previous screen.
- The active sub-tab (e.g. Midweek vs Weekend, Publishers vs Groups) is **not in the URL** → refresh loses place; links can't be shared; support can't say "open this page".
- Admins reach a work screen via *section → hub tile page → tool*: an extra full-screen click that adds no information.

**F2 — The hub tile page is visually broken and redundant.** `SectionHub.tsx` renders `const Icon = icons[section]` **once** and uses it inside the `.map`, so **every tile in a hub shows the same icon**. Tiles carry a title + description + arrow: the same information the destination screen's own tabs would give.

**F3 — Same function, several homes.**
- *Attendance* is a nav "Meetings" tool, but the screen lives inside `Reports.tsx` (a tab beside Service reports), and a Home card also edits attendance.
- *PDF/print* exists as a "Forms" section (`PdfStudio`), as a **"Print" tab inside Schedule**, as quick-action "Download S-21", and as a command-palette entry.
- *Notifications* live on admin Home (`AdminNotifications` + a "Notification centre" of approvals), while the header **bell opens "What's new"** (a static release note). The bell does not show notifications.
- *Finding a person* exists in the header search, in a Home prompt bar (`HomeAssistant`), in Home suggestions, and in People.

**F4 — Header and shell chrome compete with the task.** `AppShell.tsx`: search pill with `⌘K` hint, Plus (quick actions dialog), Menu (short screens), Sparkles (assistant), Bell, Avatar → up to six controls; a left rail with a brand block, a "MY WORKSPACE" caption, a status note ("A little more organised. / A little more time for people."), a footer trio (account, collapse, sign out); and a **per-page footer** (`v4-workspace-footer`). The sidebar-collapse preference is written but never restored (noted in V4-RELEASE). A wide-screen `inspector` is built in `main.tsx` but `AppShell` never renders it (dead code).

**F5 — Admin Home is a stack of 10+ modules.** `Workspace.tsx` home → `AdminNotifications` + `Announcements` → `Dashboard`: period/status/refresh row, `HomeAssistant`, `HomeGroupLinks`, setup-wizard card, `HomeSuggestions`, a "next task" card (calm style only), KPI tiles, SFTS summary, "Your tools close at hand", submissions table, RP list, AP review. First screen answers "what is the state of everything?" instead of **"what do I need to do?"**.

**F6 — Department overseers have no Today.** `Workspace` renders `PublisherHome` only when `roles.includes('publisher') && !admin`; otherwise the **admin `Dashboard`**. An attendant, AV, cleaning, OCLM, weekend, group-overseer or field-service user without an extra `publisher` membership lands on an admin dashboard whose modules are mostly gated off. Even with `publisher` they get the publisher Today with no shortcut to their duty. The stated priority (publishers > overseers > admin) is not reflected in the UI. *(Phase 0: verify with `?demo=attendance`, `?demo=group`, `?demo=field`.)*

**F7 — Slogan page titles instead of labels.** `People` → "A place for all."; `Messages` → "A thoughtful reminder."; `Reports` → "Keep reporting simple"; `Schedule` → "Weekly schedule"; Today → "Hello, {name}."; Publisher banner → "A small task. A meaningful record."; Today sub-title "A little preparation. A clearer day."; eyebrow "YOUR CONGREGATION, TOGETHER". Older and low-vision users scan for nouns (*People, Reports, Meetings*). The brand voice can live in empty states and onboarding, not in `<h1>`. (`check-reachability.cjs` waits for the "A place for all." heading; update deliberately.)

**F8 — Settings is an appearance workbench.** The Settings route stacks `ExperiencePicker`, `ThemeGallery` (11 themes), `ExperienceProfile`, a theme `<select>`, background-intensity slider, text-tone, text-size, icon-weight, "Reduce glass", "Fit to my screen" and language — **six `LegacySelect` native selects** — above/beside account and admin items (backup, plan). Few users need most of it; the ones who do (large-text users) need *Text size* to be two taps from anywhere.

**F9 — Native selects and native pickers remain, against DESIGN.md.** `LegacySelect` appears 27× in `Workspace.tsx`, 15× in `PdfStudio.tsx`, 11× in `ExperiencePicker.tsx`, plus `Reports`, `Access`, `PublisherEditor`, `PublicForm`. Month/week selection uses `<input type="month">`, `<input type="date">` and week `<select>`s, whose UI differs per browser and is hard on older users. Unsaved-change guards use `window.confirm(…)`.

**F10 — Controls look the same; hierarchy is flat.** Hub tiles, KPI cards, list rows and buttons are all rounded rectangles in the same weight. Several Today cards are static marketing copy rather than data ("Ready for this week?", "Your details, up to date."). Every upcoming assignment shows a `CheckCircle2` icon labelled "Published assignment", which reads as "done".

**F11 — Text bypasses the catalogue.** Many labels are built in JS, so the lint rule misses them and they can't be edited via `en.json`: `"Household reports"`, `"Monthly submissions"`, `"Missing reports"`, `"Service reports"`, `"Import Center"`, `"Midweek/Weekend/Duties/Print"` via `s.charAt(0).toUpperCase()+s.slice(1)`.

**F12 — `Workspace.tsx` (2 173 lines, ~50 `useState`) and `Reports.tsx` (1 484), `Midweek.tsx` (1 039), `PdfStudio.tsx` (950)** are god components. Layout can't be improved safely until each route is its own module.

### 2.2 Design thesis
> **One screen, one job. The app should answer "what do I do next?" before "what exists?"**

1. **Today** is a short, role-specific to-do, not a dashboard.
2. **Four destinations** (Today, People, Reports, Meetings) + **More**; everything else is a *tab inside a destination* or a *contextual action* (Download S-21 sits on the person, Remind sits on the missing report, Share sits on the schedule).
3. **Every place has a URL.** Back works. Refresh keeps your place.
4. **Plain nouns for titles; verbs for buttons.**
5. **Progressive disclosure without disclosure widgets:** a primary action and a short list first; rarely used controls move to a clearly labelled secondary tab/screen.
6. **Elegance = fewer, better elements:** one accent action per screen, generous whitespace, honest data, consistent rhythm.

### 2.3 Measurable task budget (taps from app open; "current" is **estimated from code**, Phase 0 must measure)
| # | Role | Task | Current (est.) | Target |
|---|---|---|---|---|
| T1 | Publisher | See my next assignment | 0 | 0 (hero on Today) |
| T2 | Publisher | Submit this month's report | 3–4 | **≤ 3**, form opens from the Today card |
| T3 | Publisher | Edit phone/address | 3 (Today → profile card → Settings; form sits under appearance wall) | **≤ 2** (avatar → My details) |
| T4 | Publisher | Mark time away | 3–4 | **≤ 3** |
| T5 | Admin | Assign a midweek part | 4+ (Meetings → hub tile → week → tab → part) | **≤ 3** (Meetings → part → person), week defaults to the next unassigned week |
| T6 | Admin | Enter a missing report | 3 | **≤ 3**, row action |
| T7 | Admin | Remind everyone who hasn't reported | 3–4 | **≤ 3** (Reports → Missing → Remind) |
| T8 | Admin | Download one person's S-21 | 3+ (⌘K / People → row) | **≤ 3** (People → row → S-21) |
| T9 | Admin | Add a publisher | 2 | **≤ 2** (Add → save) |
| T10 | Attendance | Record today's attendance | 1–2 | **1** (Today card) |
| T11 | Admin | Publish + share the schedule | 4+ | **≤ 3** |
| T12 | Overseer | Open my next duty | n/a (no Today) | **0–1** |

Other budgets: header ≤ **3 controls** on phone, ≤ **4** on desktop; no screen shows more than **~4 content blocks above the fold at 390×844** at 100% text; no horizontal scroll at 320 px at 200% text.

---

## 3. Target information architecture

### 3.1 Destinations and what lives where
| Destination | Tabs / content | Absorbs (old location) |
|---|---|---|
| **Today** (`screen=home`) | Role-specific to-do (§5) | Admin `Dashboard` top modules, `AdminNotifications`, approvals, `HomeAssistant` prompt |
| **People** (`screen=people`) | **People** · **Groups** (admin/field service). *Import* and *Emergency contacts* are reachable from People's overflow and from More | `people` + `import`, `emergency` route |
| **Reports** (`screen=reports`) | **Monthly** (submissions, missing, AP review) · **Pioneers** (annual) · **Households** (family reports) | Reports + `Dashboard` submissions table, RP list, AP review, SFTS summary |
| **Meetings** (`screen=schedule`) | **Midweek** · **Weekend** · **Duties** · **Attendance**; a shared week switcher | Hub tiles, Schedule "Print" tab, Attendance tab inside Reports |
| **More** (`screen=more`, a full page, not a dialog) | Search + grouped list: *Messages*, *Print & PDF*, *Links & access*, *Emergency contacts*, *Import people*, *Backup & restore*, *Plan*, *Settings*, *What's new*, *Help*, *Sign out* | `Messages`, `forms` section, `admin` section, hub grid dialog |

Keep every existing `screen` value working (`home, schedule, people, emergency, reports, messages, access, pdf, settings, owner`) and add `more`. Keep `?section=` and `?tool=` as **legacy inputs** that map onto the new model (§4). The `sections` array and hub pages stop being a UI layer; keep `tools` as the **registry** used by search, More and permission checks.

### 3.2 Navigation per role (bottom tabs on phone, rail on ≥600 px)
Derive from `allowedTools(roles)`; never hard-code a role check in the shell.

| Role set | Tabs (max 4 + More/Me) |
|---|---|
| Publisher only | **Today · Meetings · Reports · Me** (Me = My details, time away, Display, Help, Sign out) |
| Main admin | **Today · People · Reports · Meetings · More** (5) |
| Field service / group overseer | Today · People · Reports · More (+ Meetings only if they hold a meeting role) |
| Attendance | Today · Meetings (opens Attendance tab) · More |
| OCLM / weekend | Today · Meetings · More |
| Attendant / AV / cleaning | Today · Meetings (opens Duties tab) · More |
| Owner (no congregation) | Unchanged: Owner console + Settings |

Rules: a tab appears only if ≥1 *available* tool lives under it; order is Today, People, Reports, Meetings; a user with several roles gets the union, capped at 4 + More (drop the least-used first: People, then Reports). Tab labels: `Today`, `People`, `Reports`, `Meetings`, `More`/`Me`. Each tab has its **own Lucide icon** and a text label (never icon-only).

### 3.3 Global header
Phone (≤ 3 controls): **page title or congregation name** · **Search** (icon button) · **Avatar menu**.
Desktop: congregation name + role · **Search** field (keeps `Ctrl/⌘K`) · **Add** (`+`, admin only; same 4 quick actions, rendered as a small popover, not a dialog) · **Inbox** bell (admin; badge = open approvals + contact updates) · **Avatar menu**.
Avatar menu items: My details (publisher) / Account, Display (text size + light/dark), What's new, Help, Sign out.
Remove from the header: Sparkles (the assistant becomes the first row inside the search palette — "Ask the assistant", admin only), the extra Menu icon, the Plus on phones for non-admins.

### 3.4 Rail / chrome clean-up
Remove the rail's brand tagline, "MY WORKSPACE" caption, the two-line slogan note and the per-page footer. Keep: brand mark, nav, account/collapse/sign-out footer. Restore the persisted collapse preference on load (`preferenceStorage` key `ca-v3-sidebar`).

---

## 4. Routing: one typed router, real URLs, working Back

This is the engineering keystone. Do it **first**, with **no visual change**.

### 4.1 URL model (query-string based, so GitHub Pages needs no rewrite rules)
```
/app/?screen=<screen>&tab=<tab>&week=<yyyy-mm-dd>&month=<yyyy-mm>&q=<text>&person=<id>&action=<verb>&doc=<pdf-kind>&demo=<role>
```
| Param | Replaces |
|---|---|
| `tab` | `sessionStorage['ca-workspace-tool']`, the `sub` state, `ca:open-tool` |
| `action` (`add`, `entry`, `bulk`, `message`) | `ca-quick-action`, `ca-report-action`, `ca:quick-action` |
| `q` | `ca-person-search`, `ca:find-person` |
| `person` | `ca-s21-person`, `ca:select-s21` |
| `doc` | `ca-pdf-open` |
| `week`, `month` | local `week`/`period` state (now shareable, survives refresh) |

**Legacy inputs to keep (map once, on load and on `popstate`):** `?section=reports|meetings|people|messages|forms|admin` → the destination's default tab; `?tool=<id>` → the tool's `{screen, tab}` from `navigation.ts`; `?screen=` as today; `?demo=` is **always preserved** across navigation.

### 4.2 Implementation
- New `apps/web/src/router.ts` (pure, no React): `type Route`, `parse(url): Route`, `format(route): string`, `fromLegacy(...)`. Unit-tested in `tests/v3/router.test.ts` (round-trip, every legacy mapping, unknown values → Today/NotFound, `demo` preserved).
- New `apps/web/src/useRoute.ts`: `useSyncExternalStore` over `popstate` + an internal `ca:route` signal. `navigate(route, {replace?: boolean})`.
  - **push** on screen/tab change; **replace** on refinements (`week`, `month`, `q`, filter chips).
  - Always pass through the existing **`ca:before-navigate`** cancelable event so dirty-form guards keep working. Handle Back with unsaved changes: on `popstate`, if the guard cancels, `history.pushState` the previous URL back and show the guard dialog.
  - Keep the `ca:after-navigate` event (other code listens to it).
  - Scroll `.main-content` to top on screen change; restore on Back where cheap.
- Replace each `sessionStorage` key and `CustomEvent` listed in F1 **one at a time**, deleting the listener in the same commit. Leave unrelated keys (`ca-weekend-session`, `ca-update-requested`) alone.
- `main.tsx`: delete `hub` state and `selectSection`'s hub branch; `go(id)`/`openNativeTool(tool)` become thin wrappers over `navigate`. `openNativeTool` keeps its permission check (`visibleTools`, `allowed`).
- `Workspace.tsx`: `sub` becomes `const {tab} = useRoute()`.

### 4.3 Acceptance
- Back/Forward walk the visited screens and tabs. Refresh on any tab returns to the same tab. A copied URL opens the same place for the same role.
- Every legacy URL used in `scripts/*.cjs` still resolves.
- No `sessionStorage.setItem('ca-…` for navigation remains (grep gate in the new check script).
- `npm run test:browser`, `check-reachability`, `check-v3-shell` unchanged-pass (selectors for headings/nav are still the old ones in this phase).

---

## 5. Screen specifications

Wireframes are structural. Spacing, radii, colours and fonts come from existing tokens. Icons are Lucide. Boxes are not cards unless stated: **use a card only when the block is interactive or groups unrelated content; use plain sections with a heading + divider otherwise** (this cuts the "identical rounded rectangle" look).

### 5.1 Today — Publisher (phone, 390 px)
```
[ Congregation name ]                [Search] [Avatar]
Today                                      (h1)
Wednesday 28 October                       (muted, one line)

NEXT FOR YOU
┌──────────────────────────────────────┐
│ Bible Reading                         │  <- part title (h2)
│ Wed 4 Nov · 7:00 pm · Assistant       │  <- date chip, time, role
│ [ View programme ]                    │  <- tonal button
└──────────────────────────────────────┘
(2 more assignments → "All my assignments" text button)

THIS MONTH'S REPORT                       (state-aware)
  not submitted:  "October · not sent yet"   [ Report my service ]   <- the ONE solid button
  submitted:      "October · sent 27 Oct"    View report (ghost)

FROM YOUR CONGREGATION
  Announcement title · 2 days ago
  (empty → block is omitted, not shown as "nothing here")

ME
  My details · Time away: none       [ Update ]  (ghost)
```
Rules:
- Remove the static "Ready for this week? / Open meetings" and "Your details, up to date." marketing cards. The Meetings tab already exists; fold "details & time away" into the single **Me** row.
- Replace the per-assignment `CheckCircle2` ("Published assignment") with a **date chip**; show "Assistant" as a text chip, not a trailing dot. If no assignments: one calm line + link to Meetings.
- `Report my service` opens the report form **inline on the Reports tab at the right month** in one tap (`?screen=reports&action=entry`).
- Dates use `toLocaleDateString` with the document language; no hard-coded `'en'`.
- Loading skeleton mirrors these four blocks. Error: one alert with Retry (exists), keep.

### 5.2 Today — Main admin (phone)
```
[ Congregation name ]       [Search] [+] [Inbox 3] [Avatar]   (desktop; phone keeps 3)
Today
NEEDS ATTENTION                                   (ordered by urgency; max 5 rows, "See all" if more)
  ! 2 requests to approve                  [ Review ]
  ! 3 reports missing for October          [ Remind ]
  ! Midweek 4 Nov: 2 parts unassigned      [ Assign ]
  ! Sunday attendance not recorded         [ Record ]
  i 1 contact update from Maria            [ View ]
  (none → "You're up to date." + one next best action)

THIS MONTH                    October
  Reports in  ████████░░  10 / 12   (progress + figures, tabular-nums, right-aligned)
  Hours 312   Studies 41                 [ Open reports ]

SHORTCUTS    [ Add publisher ] [ Enter report ] [ Assign week ] [ S-21 ]   (max 4, tonal)
```
Mapping of old modules:
- `AdminNotifications` + approval decisions → **Inbox** (header bell, plus the "Needs attention" rows). The Inbox is a popover/sheet, one list, newest first, each row with its action. Keep atomic behaviour — only presentation changes.
- `Announcements` management (admin) → a row in Needs attention only when there's a draft; the compose UI moves to **More → Messages → Announcements**.
- `HomeAssistant`/prompt bar and `HomeSuggestions` → removed from Today; the same capabilities are reachable from the **search palette** (first row "Ask the assistant"; person results offer S-21/Open/Message).
- KPI tiles, submissions table, RP list, AP review, SFTS summary → **Reports → Monthly**.
- `HomeGroupLinks` (group report links) → **People → Groups** and **Reports → Monthly** overflow "Copy group link".
- Setup-wizard card → show **only while setup is incomplete**, as the first Needs-attention row ("Finish setting up · 3 of 10").
- Status chip ("Records loaded/Offline/Sync needs attention") → one small **sync pill** in the header area; hidden when everything is fine.
- Desktop: two columns — left Needs attention (wider), right This month + Shortcuts. Never a third column. Max width 1200 px.

### 5.3 Today — Department overseers (new; compose existing components)
Same header and "THIS WEEK" skeleton as above, with a **role card first**:
| Role | First block | Reuses |
|---|---|---|
| Attendance | "Count attendance — Wed midweek" number input + Save (big stepper) | `CurrentAttendance` |
| Attendant / AV / Cleaning | "Your next duty" + date + "View roster" | duty roster data in `Departments.tsx` |
| OCLM / Weekend | "This week's parts: 7 of 9 assigned" + **Assign** | `Midweek.tsx` summary |
| Group overseer | "Your group: 3 reports missing" + **Remind** + "Copy group link" | `HomeGroupLinks`, report rows |
| Field service | "Reports in 10 / 12" + **Open reports** | Reports summary |
A user with several roles sees one block per role, ordered by urgency, then the publisher blocks (§5.1) if they also hold `publisher`. Fix F6 in `Workspace` so only true admins get the admin Today.

### 5.4 People
```
People                                           [ Add publisher ]  (solid, admin)
[ Search by name…                         ]
[All 24] [Group 1] [Group 2] [Elders] [Pioneers] [Needs attention]   (chips; ≤5 groups, else picker)
Tabs:  People · Groups
────────────────────────────────────────────
(avatar) Sample Arun          Group 1   Elder        ›
(avatar) Sample Farah         Group 2   Pioneer      ›
```
- List-first. Row tap opens a **detail panel** (bottom sheet on phone, side panel ≥1024) with: Contact (tap-to-call / WhatsApp), Group, Roles, **S-21** (tonal), Message, Edit, Transfer. This puts T8 at 3 taps.
- `Import` and `Emergency contacts` move to the toolbar overflow ("More actions") and More; the empty state also offers Import.
- Keep `PublisherEditor` unchanged internally; only swap `LegacySelect` for chips/segmented (gender, group ≤ 5) or the shared picker.
- Show recency as "N weeks ago", never raw dates (DESIGN §4).

### 5.5 Reports
```
Reports                                          [ Enter reports ]  (solid; opens bulk entry)
‹  October 2026  ›   [This month]                (month stepper; no <input type="month">)
Tabs:  Monthly · Pioneers · Households
Reported  10 / 12  ████████░░     Hours 312   Studies 41
[Missing 2] [Submitted 10] [Auxiliary 1 to review] [All]      (chips; default = Missing when >0)
────────────────────────────────────────────
Sample Isha   —            [ Enter ] [ Remind ]
Sample Deepak 38 h · 6 st   ›
```
- Default filter = **Missing** when any exist, else All.
- Row actions are tonal buttons: *Enter*, *Remind* (opens the WhatsApp compose with `report reminder` template prefilled), *S-21*. "Remind all missing" is a single button above the list.
- AP/RP lists become **filters**, not separate blocks; AP review stays an actionable filter with Approve/Decline inline.
- **Attendance is removed from this screen** and becomes **Meetings → Attendance** (logic and RPC calls unchanged; `?tool=attendance` still opens it).
- Personal (publisher) mode: title **My report**; month stepper; big number steppers for hours and studies (≥48 px), yes/no "Did you share in the ministry?", notes; success state with the confirmation sentence and **Edit** while the month is open. No scroll needed at 390×844 before the Save button for the default fields.
- Replace the group `LegacySelect` filter with chips.

### 5.6 Meetings
```
Meetings                                  [ Share ] [ Download PDF ]   (secondary, top-right)
‹  Oct 5–11 (this week)  ›   [This week]  (week stepper shared by every tab, in URL ?week=)
Tabs:  Midweek · Weekend · Duties · Attendance
Midweek ─ 9 of 9 parts assigned ██████████   [ Assign the whole week ] [ Undo ]
 Treasures from God's Word
   Chairman                Sample Arun            ›
   Bible reading           Unassigned   [ Assign ]  (row tinted with --tone-warn + icon + text, not colour only)
```
- Week default: the first upcoming week that has **unassigned parts**; fall back to this week. "This week" resets.
- The week selector is a stepper (previous/next + label) — remove the `<select>`/`<input type=date>`. Dirty-guard still intercepts via `ca:before-navigate`; replace `window.confirm` with the existing `Dialog` pattern (a small warning-tone dialog with Keep editing / Discard).
- Remove the **Print** tab. "Download PDF" and "Share" call the same functions `PdfStudio`/WhatsApp use for this week's schedule (`schedule-pdf`, `duty-pdf`).
- Flatten "Meeting details & auxiliary classroom" and "More options" into a visible secondary section or a **Settings** tab inside Midweek ("Options"); no disclosure widgets.
- Part rows: number badge, title, **assigned name in the row** (not a nested "Assigned to" card), one tap to open the picker (`AssignmentPicker` with Suggested/Everyone/Needs a check/Unavailable and "6 weeks ago" recency stays).
- Publisher view: **read-only** programme with the user's own parts highlighted at the top ("Your parts this week").
- Attendance tab: moved component; at 390 px the five week rows collapse to a 2-column compact grid with steppers.

### 5.7 More (page)
Sticky search field; groups with 1-line descriptions; each row = Lucide icon + title + muted description:
**Everyday** (Messages · Print & PDF · Links & access) · **People** (Emergency contacts · Import people) · **Congregation** (Backup & restore · Plan · Sessions) · **You** (Settings · What's new · Help · Sign out).
Rows come from `allowedTools` so permissions stay centralised. Each tool gets its **own** icon (fixes F2). Drop the 6 `available:false` stubs from user-visible lists (keep or delete the registry entries; don't render "Opening soon").

### 5.8 Messages (now under More, and contextual)
Recipient-first flow instead of a template `<select>` + textarea + four value fields: **1 Choose a message** (chips: Assignment · Report reminder · Speaker thanks · Schedule ready) → **2 Choose people** (checklist, prefilled from context: missing reporters / this week's assignees) → **3 Preview** (editable text, `{name}` etc. resolved per person) → **4 Send via WhatsApp** (existing queue/`queueIndex` one-by-one logic, progress "2 of 5"). Contextual entry points: Reports row *Remind*, Meetings *Share*, People row *Message*. Keep the privacy behaviour: user-initiated share only.

### 5.9 Print & PDF
Keep `PdfStudio` internals and PDF contracts untouched. Change the surface only: a **document picker as chips** (S-21 · Attendance S-88 · Emergency · Schedule · Duties · CO pack) → context fields → **Generate preview** → **Download**. Replace its 15 `LegacySelect`s with chips/picker/steppers. Contextual "Download PDF" buttons elsewhere deep-link here with `doc=` and `person=`/`week=` preselected so the preview is one tap away.

### 5.10 Settings and Display
Split into sub-tabs (`?screen=settings&tab=`): **Account** (publisher: My details + Time away — `PublisherAccount`; everyone: language, sign out) · **Display** · **Backup & restore** (admin) · **Plan** (admin) · **Sessions** (admin).
**Display, first view (everyone):** *Appearance* segmented Auto / Light / Dark · *Text size* segmented S / M / L / XL with a live sample sentence · *Reduce motion & transparency* switch. Then a single secondary button **Customise look** → `tab=display&view=advanced`, a separate screen holding the existing `ExperiencePicker`, `ThemeGallery`, `ExperienceProfile`, intensity, tone, weight, "Reduce glass", "Fit to my screen". Nothing is removed; it is just not first. Convert the remaining `LegacySelect`s there to segmented controls (≤5 options each). Avatar menu → **Display** is the 2-tap path to text size from anywhere.

### 5.11 Sign-in, empty, error and loading states
- Sign-in: keep Google button and demo links; headline **"Sign in"**, one supporting sentence, demo links as a quiet secondary row ("Try the admin demo · Try the publisher demo").
- Every list/screen has a designed **empty** (icon, one sentence, one action), **loading** (skeleton shaped like the final content), and **error** (what happened, what to do, Retry) state. Reuse `SystemStates.tsx` patterns.
- Offline/sync banners: one pill in the header zone; dismissible banners remain for conflicts/forbidden.

---

## 6. Visual language ("calm, premium, unhurried")

Use `DESIGN.md` tokens; add new tokens **only** in `packages/ui/tokens.css` (or the theme files) and re-run `npm run check:contrast`. Never use raw hex in components.

**Hierarchy (the biggest elegance lever)**
1. **One solid accent button per screen** (the main job). Secondary = tonal. Tertiary = ghost text. Destructive = danger tonal until confirmation.
2. **Three text levels only** per screen: page title, section heading, body/muted. Eyebrows are removed from every page; keep one only where it carries data (e.g. the date on Today).
3. **Cards are for interactive or grouped content.** Lists use rows with hairline dividers. Remove card-on-card nesting. Max one elevation level on a page.
4. **Colour carries meaning**: accent = action; `--ok/--warn/--danger` = state, always with icon + text; everything else neutral. No decorative gradients behind text.
5. **Figures**: right-aligned, `tabular-nums`, with unit after a non-breaking space (`12.5 h`).

**Rhythm and layout**
- 4-px scale; container padding 16 (phone) / 24 (tablet) / 32 (desktop); content max-width 1200 px; **reading/forms column 720 px**; section gap 24–32 px; row height ≥ 56 px on phone (≥ 44 px target).
- Title block height identical across screens so the page doesn't "jump" between tabs.
- Phone bottom tabs: 56–64 px, icon above label, active state = tonal pill + `aria-current`, safe-area padding. Desktop rail: 248 px expanded / 72 px collapsed.

**Type**: keep theme fonts. Scale 14/16/18/20/24/30 px × `--text-scale`; titles `text-wrap: balance`; body ≥ 16 px; line-height ≥ 1.5 (≥ 1.7 Indic).

**Motion**: transform/opacity only; 120–200 ms with `--ease`; list-row press = `scale(.98)`; sheet slide-in; no parallax; honour `prefers-reduced-motion`.

**Iconography**: Lucide, 20 px in rows, 24 px in tabs, stroke weight from the user's setting; one distinct icon per tool.

**Default look**: the V4 spec's warm-neutral surfaces + teal accent as the **default** for new users; dark mode via Auto. Existing themes remain selectable.

---

## 7. Copy and microcopy

Principles: nouns for titles, verbs for buttons, one idea per sentence, no slogans in `<h1>`, no jargon, no exclamation marks, sentence case. Brand warmth lives in empty and success states. All strings through `t()` with `ux.*` keys.

| Where | Now | New |
|---|---|---|
| Today `<h1>` (all) | "Hello, Daniel." + eyebrow + subtitle | **Today** (greeting as a small line: "Good morning, Daniel") |
| People `<h1>` | A place for all. | **People** |
| Reports `<h1>` | Keep reporting simple | **Reports** (publisher: **My report**) |
| Schedule `<h1>` | Weekly schedule | **Meetings** |
| Messages `<h1>` | A thoughtful reminder. | **Messages** |
| Settings `<h1>` | Your settings | **Settings** |
| Publisher banner | A small task. A meaningful record. | "October report · not sent yet" + **Report my service** |
| Publisher cards | Ready for this week? / Your details, up to date. | removed / **My details** |
| Rail note, footer | A little more organised… | removed |
| Bell tooltip | What's new | **Inbox** (admin) — What's new moves to the avatar menu |
| Tab labels | Import Center / Print | **Import** (overflow) / removed (→ Download PDF) |
| Empty states | various | "Nothing to do right now. You're up to date." / "No one matches ‘{q}’. Clear filters." |
| Errors | raw `error.message` | "Couldn't save. Your changes are kept. **Try again**" (+ detail line) |
| Unsaved guard | native `confirm()` | Dialog: "Discard changes?" — **Keep editing** / **Discard** |
| Success toast | "Attendance saved." | "Attendance saved" with **Undo** where reversible (8 s) |

Put the old→new mapping in `docs/DECISIONS.md` and list the changed selectors in `POLISH-REPORT.md`.

---

## 8. Engineering strategy

1. **Strangler, not rewrite.** For each route: (a) *move* its JSX/logic verbatim into a new module under `apps/web/src/features/<area>/` with **zero behaviour change** and green tests (commit 1), then (b) restyle/restructure (commit 2). Never mix a move and a redesign in one commit.
2. Suggested modules (each < 400 lines, functions < 120): `features/today/{PublisherToday,AdminToday,OverseerToday,NeedsAttention,MonthGlance}.tsx`, `features/people/{PeopleScreen,PeopleList,PersonPanel,GroupsTab}.tsx`, `features/reports/{ReportsScreen,MonthlyTab,PioneersTab,HouseholdsTab,MyReport}.tsx`, `features/meetings/{MeetingsScreen,WeekStepper,MidweekTab,WeekendTab,DutiesTab,AttendanceTab}.tsx`, `features/more/{MorePage,ToolRow}.tsx`, `features/messages/MessageFlow.tsx`, `features/settings/{AccountTab,DisplayTab,AdvancedLook}.tsx`; shared UI in `packages/ui/`: `Segmented`, `Chips`, `Stepper`, `MonthStepper`, `WeekStepper`, `PageHeader`, `RowList`, `EmptyState`, `ConfirmDialog`, `SyncPill`, `InboxPopover`.
3. Build the shared controls **once** in `packages/ui`, with all states and keyboard behaviour, with tests in `tests/v3/ui-*.test.tsx`, before using them in screens. `Segmented`/`Chips` follow `role="group"` + `aria-pressed` (or `tablist` for real tabs with arrow-key support).
4. Data layer untouched: keep `storeFor`, `repositories`, `rpc`, React Query keys (they include account + congregation — do not weaken). New derived data (e.g. "Needs attention") is computed client-side from data the role can already read; **no new RPCs**. Where a count needs data the role cannot read, omit that row.
5. Performance: lazy-load each new screen module; keep `.size-limit.json` budget; no new runtime dependency without owner approval (if you need one, record why in DECISIONS.md and prefer none). No `layout reads in render`; virtualize lists > 100 rows (People) if not already.
6. Accessibility: one `<h1>`; skip link retained; focus moves to the new `<h1>`/`#main-content` on route change; announce route title via `aria-live="polite"` visually-hidden region; trap/return focus in sheets; 200 % text and 320 px reflow.

---

## 9. Phased execution plan

Each phase = one PR into the V4 branch. Required for every phase: gates in §1.5 green; screenshots from §10 for touched screens saved under `docs/qa/v4-ux/phase-N/`; an entry in `docs/POLISH-REPORT.md` with the exact commands and results; **no** claim of "done" without the check output.

### Phase 0 — Baseline (no product code changes)
1. `npm ci`; run all gates in §1.5; record pass/fail and timings in `docs/qa/v4-ux/BASELINE.md`.
2. Capture the §10 screenshot matrix for **today's** UI (roles × widths × text sizes).
3. Measure T1–T12 tap counts with a Playwright script (`scripts/check-v4-ux-baseline.cjs`, demo roles only) and fill the "Measured" column.
4. Verify findings F1–F12 and F6 on `?demo=attendance|group|field`; write corrections to `docs/DECISIONS.md`.
5. Record the decisions in §12 with the defaults given (or with your reasoning if you deviate).
**Exit:** baseline report committed; nothing else changed.

### Phase 1 — Router (no visual change)
Implement §4. **Files:** `apps/web/src/router.ts`, `useRoute.ts`, edits in `main.tsx`, `Workspace.tsx`, `Reports.tsx`, `PublisherEditor.tsx`, `Midweek.tsx`, `OwnerConsole.tsx`, `packages/ui/CommandPalette.tsx`, `AppShell.tsx` (callers of the old sessionStorage/CustomEvent mechanism). **Tests:** `tests/v3/router.test.ts`; extend `check-v3-shell.cjs` with Back/Forward + refresh + legacy-URL cases.
**Exit:** Back and refresh work on every screen/tab; zero navigation `sessionStorage` keys; all gates green; screenshots identical to baseline (pixel-diff tolerance: layout unchanged).

### Phase 2 — Shell, header, More
Implement §3.2–3.4 and §5.7. **Files:** `packages/ui/AppShell.tsx`, `packages/ui/shell.css`, `packages/core/navigation.ts` (role→tabs helper, `tab` registry; remove the unavailable stubs from rendered lists), `features/more/*`, delete `features/SectionHub.tsx` and the `hub` state, move "What's new" to the avatar menu, bell → Inbox shell (content in Phase 3), restore the collapse preference.
**Tests:** update `check-v3-shell.cjs`, `check-short-navigation.cjs`, `check-publisher-portal.cjs` (More/Me), `check-reachability.cjs`; add assertions: header controls ≤ 3 on 390 px, every `allowedTools` entry reachable from More in ≤ 2 taps, every tool has a distinct icon.
**Exit:** all tools reachable for every demo role; no hub pages; keyboard walkthrough passes.

### Phase 3 — Today (publisher, admin, overseer)
Implement §5.1–5.3. **Files:** `features/today/*`; `Workspace.tsx` home branch; fix F6 role routing; retire `HomeAssistant` and `HomeSuggestions` from Today (keep the components if the palette reuses them; otherwise delete and let `knip` confirm no dead code); `AdminNotifications.tsx`/`Announcements.tsx` re-hosted in the Inbox popover and More → Messages.
**Tests:** `tests/v3/needs-attention.test.ts` (pure function: inputs → ordered rows); update `check-home-next.cjs`, `check-publisher-portal.cjs`, `check-dashboard-browser.cjs`, `check-experience-browser.cjs` as needed; new demo-role assertions: each role's first block exists; publisher T1–T4 within budget.
**Exit:** T1–T4, T10, T12 within budget; admin Today ≤ 4 blocks above the fold at 390×844.

### Phase 4 — Meetings
Implement §5.6. Extract `Midweek`/weekend/duties/attendance into `features/meetings/*`; add `WeekStepper`; remove the Print tab and `LegacySelect`s; replace `confirm()`; publisher read-only "Your parts"; keep `Midweek.tsx` scheduling logic and `check-scheduling-simplicity.cjs` intent.
**Tests:** `check-scheduling-simplicity.cjs`, `check-weekend-next.cjs`, `check-oclm-print.cjs`, `check-schedule-pdf.mjs`; T5 and T11 within budget; `?tool=attendance` and `?tool=duties` deep links work.

### Phase 5 — Reports
Implement §5.5. Split `Reports.tsx` (monthly / pioneers / households / my report); month stepper; chips; Attendance extracted (coordinate with Phase 4 — if Phase 4 landed, just remove the old tab); keep every save/revoke/AP RPC call identical.
**Tests:** `check-report-browser.cjs`, `check-submission-filters.cjs`, `check-ap-refinement.cjs`, `check-publisher-portal.cjs`; T2, T6, T7 within budget; retained-edit-on-failure and stale-edit behaviour from V4 still pass.

### Phase 6 — People, Messages, Print & PDF
Implement §5.4, §5.8, §5.9. Person detail panel; chips for groups; `Import` demoted; recipient-first message flow; `PdfStudio` surface restyle with **no** engine change.
**Tests:** `check-import-recovery.cjs`, `check-picker-refinement.cjs`, `check-direct-downloads.cjs`, `check-pdf-browser.cjs`, `npm run test:pdf` (goldens untouched); T7–T9 within budget.

### Phase 7 — Settings and Display
Implement §5.10. Split tabs; basic Display first, `Customise look` as its own view; replace remaining `LegacySelect`s; ensure the avatar menu → Display path.
**Tests:** `check-experience-browser.cjs`, `check-theme-fonts.cjs`, `npm run test:v3:themes`; text-size change persists and applies in ≤ 2 taps from every screen.

### Phase 8 — Copy, states, motion, a11y polish
Apply §6–§7 everywhere; sweep all new screens for empty/loading/error states; move hard-coded labels (F11) into `en.json` with `ux.*` keys; run `npm run check:vercel-guidelines`, axe via `scripts/audit-accessibility.cjs` at 390 and 1440; contrast on composited surfaces for the default theme + `paper`, `mono-dark`, `eclipse-night`; reduced-motion/contrast/transparency passes; Android back button; PWA install prompt not shown during a task.

### Phase 9 — Usability and release
Run the six-task protocol in `docs/qa/USABILITY-TEST.md` (extend with T2, T5, T7, T10, T12) with fictional data and **at least one older/low-vision participant per role family**; fix the top three blockers; re-run affected tasks; update `docs/V4-RELEASE.md` and `docs/qa/KNOWN-ISSUES.md`; run the **full** gate list in Actions once; open one PR. Merge/deploy only when every required gate is green. **Do not** edit `deploy.yml` or the hosting configuration.

---

## 10. Verification matrix (use for every phase)

**Roles (demo URLs):** `?demo=admin`, `?demo=publisher`, `?demo=group`, `?demo=attendance`, `?demo=field`, `?demo=owner`, `?demo=expired`.
**Viewports:** 320×640, 390×844, 768×1024, 1024×768, 1440×900, 844×390 (short landscape).
**Text scale:** 100 %, 130 %, 200 %. **Themes:** default, `paper`, `mono-dark`, `eclipse-night`.
**Per screen:** screenshot (store under `docs/qa/v4-ux/phase-N/<role>-<screen>-<w>x<h>-<scale>.png`, max 10 contact sheets in the PR), axe violations = 0, no horizontal overflow, one `<h1>`, focus visible on every control via Tab walk, zero Supabase requests in demo, zero console errors.
**New script:** `scripts/check-v4-ux.cjs` (Playwright, modelled on `check-v3-shell.cjs`) asserts: header control counts; tab sets per role; Back/Forward/refresh; legacy URL mapping; no `sessionStorage` navigation keys; tap-count budgets T1–T12; `<h1>` texts equal §7; no native `<select>` in touched screens; no `<details>`. Wire it into the existing e2e workflow instead of adding a new one.
**Sampling rule from AGENTS.md:** at most one sampled audit of 300 views per batch; full matrices only in scheduled/dispatch runs.

---

## 11. Using the Vercel tooling wisely

The product ships to **GitHub Pages** (see `AGENTS.md`, `scripts/build-pages.mjs`). **Do not move hosting, add `vercel.json` to the repo root, or touch deploy workflows.** Use Vercel only where it helps and costs nothing structurally:

1. **Guidelines first.** Use the Vercel Web Interface Guidelines / any web-design-guidelines or React-best-practices skill that is installed. Run `npm run check:vercel-guidelines` (already in repo) and then review changed files for: focus management, forms, animation, typography, content handling, touch targets, performance, i18n. Report `file:line`. If no skill is installed, do the review by hand against `DESIGN.md §9`.
2. **Docs search** (Vercel MCP `search_vercel_documentation`) only for platform questions (headers, caching, preview behaviour). The app is a Vite SPA, not Next.js — **don't import Next patterns**.
3. **Optional throwaway preview for review (owner approval required first, because it is a new external service even if free).** If approved: build demo-only output into a temp folder (e.g. `BASE_URL=/ npm run build`, not committed), create a **preview** deployment of that folder, and send the owner the protected-link via `get_access_to_vercel_url`. Open it only with `?demo=publisher` / `?demo=admin` so no real accounts or Supabase calls are involved (sign-in redirect URLs will not match a preview origin, so real login is expected to fail there — that is fine). Use toolbar comment threads (`list_toolbar_threads`) to collect phone feedback; copy accepted items into `docs/DECISIONS.md`; delete the preview when done.
4. **Never** put secrets in a preview; never point a preview at production data; verify the demo makes zero network calls to Supabase before sharing.
5. If no Vercel plugin is available or the owner declines, use `npm run preview` (`scripts/serve-cutover.cjs`) + Playwright. Nothing in this plan depends on Vercel.

---

## 12. Decisions to record in `docs/DECISIONS.md` (defaults supplied; deviate only with reasons)
| # | Decision | Default |
|---|---|---|
| D1 | Publisher 4th tab label | **Me** (admins/overseers keep **More**) |
| D2 | Router storage | Query-string params, `pushState` for tabs/screens, `replaceState` for filters |
| D3 | Bell meaning | **Inbox** (admin only); What's new moves to avatar menu |
| D4 | Attendance placement | **Meetings → Attendance** (not Reports) |
| D5 | Today prompt bar/suggestions | Removed; capability moves to search palette |
| D6 | Print tab in Meetings | Removed; contextual Download PDF |
| D7 | Appearance controls | Basic Display first; full set in **Customise look** (nothing deleted) |
| D8 | Unavailable tool stubs | Hidden from all UI |
| D9 | Default theme for new users | V4 warm-neutral + teal, Auto light/dark |
| D10 | Unsaved-change guard | `ConfirmDialog` replaces `window.confirm` |

---

## 13. Ideas beyond this scope (do **not** build now; log in `docs/FUTURE.md`)
- Per-role onboarding checklist (first sign-in: 3 steps, dismissible).
- "Add to calendar" (.ics) for assignments (client-side only).
- Larger "Easy mode" preset: 20 px text, 4 tabs, no sidebar, high-contrast — one switch under Display.
- Long-press/swipe row actions on phone lists (Remind, S-21) with visible fallbacks.
- Undo for destructive actions across the app instead of confirmations.
- Persistent "last viewed" memory per tab (month/week/filter) via `preferenceStorage`.
- Contextual help: one-sentence "What is this?" panel per screen (a separate screen, not a tooltip).
- Role switcher for people with several roles ("View as: Publisher / Attendance").
- Print stylesheet for Meetings and Reports.
- Keyboard shortcuts cheat-sheet in the palette (`?`).

---

## 14. Definition of done
- [ ] Every item in §2.1 is fixed or has a written, justified exception in `DECISIONS.md`.
- [ ] Budgets in §2.3 measured **after** the change; all targets met or explained.
- [ ] Back/Forward/refresh/deep-link work for every screen and tab; legacy URLs resolve.
- [ ] Header ≤ 3 controls on phone; ≤ 4 on desktop; tab sets match §3.2 for each demo role.
- [ ] No `LegacySelect`, `<select>`, `<details>`, `window.confirm`, emoji, raw hex, inline style objects or raw JSX text in touched files; ESLint suppression counts not increased.
- [ ] No navigation `sessionStorage` keys or navigation `CustomEvent`s remain.
- [ ] Every new/changed screen has designed empty, loading and error states; skeletons mirror content.
- [ ] axe = 0 at 390 and 1440; 320 px at 200 % text has no horizontal scroll; contrast checks pass on composited surfaces.
- [ ] PDF goldens, `supabase/**`, `public-config.json` handling and deploy workflows unchanged; `npm run test:pdf` passes.
- [ ] Demo makes zero Supabase requests; no real data anywhere.
- [ ] `docs/POLISH-REPORT.md` lists each command run, its result, intentional selector changes, and every item **not** verified.
- [ ] Usability retest done with the extended task list; SUS and task times recorded honestly.

---

## 15. Per-phase prompts (paste one at a time)

**Phase 1**
```text
Execute Phase 1 of docs/V4-UX-SIMPLIFICATION.md. Create apps/web/src/router.ts and useRoute.ts per §4, with unit tests first
(tests/v3/router.test.ts). Replace each sessionStorage navigation key and CustomEvent one at a time, deleting its listener in the
same commit. Preserve ca:before-navigate / ca:after-navigate and ?demo=. No visual change. Run the §1.5 gates; write evidence to
docs/POLISH-REPORT.md. Stop at the Phase 1 exit criteria.
```
**Phase 2**
```text
Execute Phase 2: shell, header and More page per §3 and §5.7. Derive tabs from allowedTools(); delete SectionHub and hub state;
fix the single-icon bug by giving every tool its own Lucide icon; move What's new into the avatar menu; remove rail slogans and the
per-page footer; restore the sidebar collapse preference. Update only the selectors listed in the plan and record them.
```
**Phase 3**
```text
Execute Phase 3: Today screens per §5.1–5.3. Add a pure needsAttention() function with tests. Fix role routing so only true admins
see the admin Today. No new RPCs. Show the Inbox popover in the header. Verify T1–T4, T10, T12 tap budgets with the demo roles.
```
**Phase 4–7** (same pattern)
```text
Execute Phase N of docs/V4-UX-SIMPLIFICATION.md. First commit: move code verbatim into the new modules with no behaviour change and
green tests. Second commit: restructure the UI per the matching §5 spec using shared controls from packages/ui. Keep every RPC call,
PDF contract and permission check identical. Run the phase's listed tests and the full §1.5 gates; capture §10 screenshots; update
POLISH-REPORT.md with commands and results; list anything unverified.
```
**Phase 8–9**
```text
Execute Phase 8 (copy/state/motion/a11y polish) then Phase 9 (usability + release prep) from docs/V4-UX-SIMPLIFICATION.md. Do not
deploy. Produce the usability observer sheets, a findings summary, and the final gate results; open one PR and report blockers
precisely.
```