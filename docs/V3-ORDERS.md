# V3 CODEX ORDERS — Congregation Assistant V3

You are the builder. These are **orders, not suggestions**. Follow them literally and in order. Do not ask questions. Do not stop between work packages (WP). If a WP is blocked, write `BLOCKED: <reason>` in `docs/V3-PROGRESS.md`, skip to the next independent WP, and continue. You are authorized to commit, push, merge to `main` and deploy to production when the gates in §13 pass. **There is no live user data. Nothing needs preserving. V1 may be deleted once V3 reaches parity (WP-27).**

Supersedes: V2 README files. Still valid as reference (read them, do not re-argue them): `docs/V2-MASTER-README.md` §13 (E2EE), `V2-LAUNCH-README.md` §1 (domain/hosting), §4–§6 (trust, website, QA).

---

## 0. How to work (protocol)
1. `git tag v1-final` first. V1 is the **specification**. Its behavior, calculations and PDFs must be preserved.
2. Create `docs/V3-PROGRESS.md` with one checkbox per WP (§13). After each WP: run `npm run check` (lint + typecheck + unit), commit `WP-xx: <title>`, tick the box, push.
3. Write the failing test first when a WP has a "Done when" test. Make it pass. Do not weaken tests to pass.
4. **Never invent official form layouts, field names, or rules.** Read V1 (`pdf-tools.js`, `index.html`, `docs/s21-alignment-review.md`, `supabase/*.sql`) and copy behavior. Use form names exactly as V1 uses them.
5. Credit-saving: batch edits; run only affected tests while working; run the full suite once at the end (in GitHub Actions); view **≤ 10 images total** (contact sheets only, see Gates in §13).
6. Free-first: use only free/open-source dependencies; check each license (MIT/ISC/Apache/BSD/OFL ok; GPL/AGPL not ok for shipped code).
7. Every new text string goes through `t('key')` (English first; Hindi/Malayalam/Tamil scaffolded). No emoji anywhere in UI/source (lint fails).
8. Missing secrets (Razorpay, Cloudflare, Meta, LLM, email) ⇒ feature shows "Opening soon" and nothing crashes; the deploy workflow prints "skipped — add secret X" and exits 0.

---

## 1. What this product is for (design from the work, not from screens)
A congregation runs on a **monthly cycle** and a **weekly cycle**. Build around these, using the real forms:

| Form / artifact | Who | When | Pain today | V3 feature that removes it |
|---|---|---|---|---|
| Field Service Report slip (S-4) | every publisher → secretary | by month end | chasing people one by one; slips lost | Report link per person, **household** reporting, WhatsApp **chase queue**, bulk-entry grid |
| **S-21** Congregation's Publisher Record | secretary, one card per publisher per service year (Sept–Aug) | updated monthly; reviewed at **CO visit** | handwriting, arithmetic slips, last-night rush | auto-built from reports; **S-21 button on every publisher row**; **Accuracy Guard**; **CO Visit Pack** |
| **S-1** Congregation Report | secretary → branch, monthly totals | right after month end | manual totals, recount errors | auto totals (publishers / AP / RP, hours, studies) with a sanity checklist |
| **S-88** Meeting Attendance Record (+ S-3 as V1 implements it) | attendance taker → secretary | every meeting | paper tallies | tap entry both meetings, trends, PDFs exactly as V1 |
| **S-140** schedule + **S-89** slips | OCLM overseer | weekly | typing titles, juggling who did what | auto-filled titles, assign sheet with suggestions, slip PDFs |
| Weekend: chairman, public talk (title/speaker/visitor), Watchtower conductor/reader | weekend overseer | weekly | visitors, songs, duties | Weekend module with visiting-speaker book |
| Duties: attendants, AV, mics, stage, cleaning, hospitality, custom | duty overseers | weekly/monthly | forgotten, unfair rotation | duty rosters, rotation, reminders |
| Field service groups + field service meetings | service overseer, group overseers | weekly | WhatsApp chaos | groups (dropdown, never free text) + field service meeting schedule |
| Emergency contact list | secretary / Emergency rep | on request, instantly | scattered numbers, not by family | **family-wise** list, search, offline, one-tap share/print |
| Announcements, reminders | elders | weekly | repeating messages | announcements + scheduled reminders |

Roles (preset bundles): Main Admin/Secretary · Coordinator · Service Overseer · OCLM Overseer (+assistant) · Weekend Overseer (+assistant) · Group Overseer (+assistant) · Attendance/Attendants · AV/Mics/Cleaning · Publisher · Household member. **Elder-first:** the body of elders decides to use the tool; the product never pressures publishers.

---

## 2. Architecture decisions (final)
- **Stack:** Vite + React 18 + TypeScript (strict) + Tailwind 3 + Radix UI + TanStack Query + Zustand + Zod + date-fns + `idb` (IndexedDB) + Lucide icons (inline sprite) + libsodium-wrappers-sumo (crypto) + pdf-lib + fontkit. Tests: Vitest, Playwright, axe-core.
- **Repo layout:** `apps/web` (app — **delete everything under `apps/web/src/v2`**), `apps/site` (website), `packages/ui` (tokens/components), `packages/core` (domain logic, schemas, store interface), `packages/pdf` (PDF engine), `supabase/` (SQL, edge functions), `docs/`, `scripts/`.
- **Local-first.** UI reads/writes a local IndexedDB mirror instantly and syncs in the background (fast, works offline, feels alive).
- **One `Store` interface, two adapters:**
  - `PlainStore` — uses the existing secure backend tables/RPCs (V1-compatible). Ship this **first**.
  - `VaultStore` — zero-knowledge (end-to-end encrypted) adapter (WP-22). Becomes the default for **new** workspaces when its test suite passes.
  UI code must depend only on the `Store` interface (`packages/core/store.ts`). This is what lets us ship now and harden later without rewriting screens.
- **Claims gate:** `VAULT_DEFAULT` and `E2EE_CLAIMS_ENABLED` flags. Marketing may say "nobody — including us — can read your data" **only** when a workspace is in Vault mode **and** the crypto suite (§9.7) is green. Otherwise use the honest Standard+ wording from the launch README §5.

---

## 3. Navigation (simple, complete, no guide needed)

### 3.1 Top-level (same labels on every device)
1. **Home** — today's tasks for my role
2. **People** — Publishers · Groups · Households · Emergency contacts · Import
3. **Reports** — This month (collect · chase · review) · S-1 summary · Pioneers · History
4. **Meetings** — Midweek · Weekend · Attendance · Duties · Field service · Speakers
5. **Messages** — WhatsApp · Reminders · Announcements
6. **Forms & Print** — S-21 · S-1 · S-88/S-3 · Emergency list · Schedules · Rosters · **CO Visit Pack**
7. **Admin** — Access & roles · Links · Vault & backup · Settings · Plan & billing

**Every section opens on a hub page of big labeled tiles** (icon + title + one-line purpose + live count/badge) so no feature is ever hidden. Example: Meetings hub tiles = Midweek schedule · Weekend schedule · Attendance · Duties · Field service meetings · Visiting speakers · Print schedules.

### 3.2 Layout by breakpoint (exact)
| Width | Layout |
|---|---|
| **< 600 (phone)** | Top bar (title, search icon, avatar) · **bottom tab bar, 5 slots: Home · People · Reports · Meetings · More** (More = grid of every other section/tile with labels) · one floating **+** button for quick actions (Add publisher, Enter report, Download S-21, Share reminder) · sheets instead of modals · lists are cards with a visible action row |
| **600–1023 (tablet)** | 72 px icon+label rail · **master–detail** (list 360 px left, detail right) · sheets become side panels |
| **1024–1439 (desktop)** | 264 px grouped sidebar (all 7 sections visible, collapsible to rail, independently scrollable, sticky, `100dvh`) · content · optional **inspector panel** (360 px) showing the selected publisher/week |
| **≥ 1440 (wide)** | same, content max-width 1440 px, inspector open by default |
Global search (icon on phone, `Ctrl/Cmd+K` on desktop) finds **people and actions** ("S-21 Daniel", "add attendance", "CO visit pack").

### 3.3 No-guide rules (apply to every screen)
Plain verbs ("Download S-21", "Remind", "Publish week") · every empty state has one sentence + one primary button + an illustration · progressive disclosure (advanced options behind "More options") · preview before any send/publish · Undo toast for every change · smart defaults · inline validation with fix suggestions · no jargon labels · consistent action placement (primary bottom-right on desktop, bottom-center on phone) · contextual "?" tooltips instead of a manual · first-run **Start here** checklist that ticks itself.

---

## 4. The S-21 button (explicit order)
- In **People › Publishers**, every row shows a visible **S-21** button (icon `file-down` + the text "S-21") on **all** breakpoints (phone: right side of the card's action row; never inside a hidden menu). Tap = downloads the S-21 PDF for the **current service year**.
- The button has a small chevron menu: *Other service year…* · *Print* · *Share on WhatsApp* · *Preview*.
- Same button in the publisher inspector/drawer, in the Reports › Chase list, and in the global search results.
- **Batch:** a checkbox column + "S-21 for selected / for this group / for everyone" (ZIP or merged PDF, with progress and Cancel).
- Output must match V1's S-21 (golden tests, §7.5 and WP-09).
- Test: `people-s21-button.spec.ts` asserts the button is visible and works at 320, 390, 768, 1024, 1440 px in every theme.

---

## 5. Design system V3 — youthful, different moods, everything works in every theme
**Drop in `v3-themes.css` (provided with these orders) as `packages/ui/themes.css`.** It contains 9 verified themes (WCAG-checked, including worst-case over glass gradients). Each theme changes **colors, shapes, borders, shadows, blur, fonts, motion and background**, not just hues:

| Theme id | Mood | Shape language |
|---|---|---|
| `mono-light` | pure black & white minimalism | 4–8 px radius, 1 px black borders, no shadow, no color; states shown by **icon + label** |
| `mono-dark` | OLED black & white | same, inverted |
| `paper` | warm editorial, serif headings | soft radius, soft shadow |
| `lagoon-glass` | cool teal→blue gradient, glass | big radius, blur 20 px, glow |
| `neon-night` | youthful dark, cyan accent + subtle grid | snappy, neon glow |
| `sunset-pop` | peach→rose→violet, very round, playful | bouncy motion |
| `neo-brutal` | flat cream, thick black borders, hard offset shadows | zero radius, stepped motion |
| `forest` | calm deep green, serif | slow ease |
| `aurora` | violet→teal glass | fluid |

Rules:
1. All components read **tokens only** (`var(--surface)`, `var(--text-1)` …). No raw hex, no opacity-based text colors.
2. Fonts: self-host Inter (variable), Space Grotesk, Newsreader (all OFL) as WOFF2 + Noto Sans/Serif for Indic scripts (on demand). No Google Fonts requests.
3. Settings › Appearance: **Theme gallery** (9 live-preview cards, "Surprise me"), **Experience** (Calm / Balanced / Lively — see §6), Text size (S/M/L/XL → `--text-scale`), Text tone (Soft/Standard/Sharp), Background intensity slider (0–100), Solid mode, Icon weight. Persist per user.
4. Auto theme: follow system light/dark → `paper` / `forest` by default; remember manual choice.
5. `scripts/contrast-check.mjs` (write it): parse `themes.css`, sample gradients, assert text-1 ≥ 7, text-2/3 ≥ 4.5, text-on-accent ≥ 4.5, link ≥ 4.5 on every surface, for all 9 themes × 3 text tones. CI fails if not. (Mono themes carry state by icon/label; never by color alone.)
6. Components (build all in `packages/ui`, each themed): Button, IconButton, Card, StatTile (count-up, ring, sparkline), ListRow with action row, Chip, Segmented, Switch, Select, Combobox, Stepper, WeekPicker, **Dialog/BottomSheet (adaptive; visible 44 px Close button, Esc, focus trap, unsaved-guard)**, Toast with Undo, Banner, EmptyState (8 inline-SVG illustrations), Skeleton, Avatar, ProgressRing, QRCode, CopyField, PersonPicker, Wizard, Tabs, CommandPalette, DataTable (virtualized, sortable, sticky header, row actions).
7. Motion: transform/opacity only; stagger lists; spring on sheets; count-ups; all off under reduced motion. Lively mode keeps ≥ 55 fps on a 4× throttled CPU trace.
8. Responsive proof: `scripts/layout-detector.ts` runs on every screen × {320, 375, 390, 430, 600, 768, 1024, 1366, 1440, 1920} × text scale {100%, 130%, 200%}: no horizontal overflow, no fixed element covering content, dialogs fit viewport, tap targets ≥ 44 px, inputs stay visible with the keyboard open.

---

## 6. Experience Styles (user-chosen richness; capabilities never change)
| Style | Home | Chrome |
|---|---|---|
| **Calm** | greeting, next task, 3 big actions | essentials + "All tools" tiles, large type, no ambient motion, no charts |
| **Balanced** (default for admins) | KPI strip, quick actions, this-week, needs-attention | grouped navigation, gentle accents |
| **Lively** | full dashboard: hero with clock/greeting, animated KPI tiles with rings/sparklines, activity feed, drag-to-arrange widgets, ambient background, celebratory moments | rich tables, colored section accents, illustrations |
First-run picker with three live previews; changeable in Settings; Main Admin sets the congregation default (publisher portal default = Calm). System accessibility settings always override richness.

**Home (all styles, real data):** greeting + first name + live clock + date (congregation time zone; no seconds; aligned to the minute); month selector; KPI tiles that drill down — Publishers (+studies), Regular Pioneers (+hours/studies), Auxiliary Pioneers (+hours/studies), **Submitted x / y with ring + pending**; action bar with **Bulk entry · Chase missing reports · Download reports · Add publisher · Copy report link**; Regular Pioneer log; Auxiliary Pioneer review; Monthly submissions table with per-row **Remind** and **S-21**; attendance trend; this-week schedule; unassigned-parts badge; role-specific "Needs attention". (Port V1 `renderDashboard` logic exactly: service-year month selector, IST previous-month logic.)

---

## 7. Feature orders (exact behavior)

### 7.1 Accuracy Guard + CO Visit Pack (differentiators — build both)
- **Accuracy Guard:** a validator over S-21 data. Checks: month gaps, active publisher with no report, hours/studies inconsistent with pioneer type, AP month flagged but no AP mapping, duplicate publishers, report entered for inactive/moved publisher, S-1 totals ≠ sum of S-21 rows, attendance gaps. Output: **Ready / Needs attention (n)** with a clickable fix list. Shown on Home, Reports and before any batch PDF.
- **CO Visit Pack:** one button → choose service year(s) → runs Accuracy Guard → generates a single ZIP: all S-21 (current + previous service year), S-1 monthly summaries, S-88 attendance (and S-3 as V1), family-wise emergency list, group list with overseers, duty and schedule sheets. Progress bar, Cancel, "Share/Print". Works offline after first sync.

### 7.2 Reports cycle (Reports › This month)
Stages with counts: **Collect → Chase → Review → Summarize**. Collect: per-person report link, household switcher, bulk-entry grid (Tab/Enter flow, steppers). Chase: list of people who haven't reported with **Remind** (WhatsApp Smart Share send queue, §7.6), bulk "remind all", group filter, last reminded time. Review: late/odd values flagged. Summarize: S-1 totals with breakdown + copy/print. Configurable "report due day" (default blank = no countdown; if set, show days left).

### 7.3 People
Publisher form (4 sections): Basics (name, **group dropdown**, gender, appointments, pioneer status) · Sign-in & contact (**email field**, phone, address) · Emergency contact · More details (collapsed). **Household:** if the email already belongs to someone, ask "Treat as a household so one sign-in can report for everyone?" → Yes/No. Household members get a **Reporting for: [name]** switcher; shared email grants **report submission only**. Groups: created only by Main Admin ("Add 8 groups"); everywhere else dropdown. Emergency list is **family-wise** (grouped by household), searchable, printable, offline.

### 7.4 Meetings
- **Midweek:** weeks, parts, assign sheet with suggestions (qualified, available, least-recent, not already assigned), conflict warnings, S-89 slips, S-140 sheet, publish/unpublish/history, noticeboard.
- **Weekend:** Chairman · opening song (number) · **public talk: customizable title (+ optional outline no.), speaker from Elders/MS list or visitor (name + congregation + optional phone)** · Watchtower study (article title auto-filled, read-only; conductor; reader) · closing song · concluding prayer · week exceptions (CO visit, assembly, Memorial, no meeting) · **visiting-speaker book**.
- **Attendance:** both meetings, edit toggle, trend, public attendance form, PDFs exactly as V1.
- **Duties:** attendants, AV, microphones, stage, cleaning, hospitality, custom types; rotation + fairness suggestions; reminders.
- **Field service:** groups, field service meeting schedule (day/time/place/conductor), group overseer view.
- **Auto-import of titles (authorized by the owner):** server-side scheduled job (Edge Function). Prefer the **official EPUB/JWPUB publication files** (Meeting Workbook `mwb`, Watchtower Study `w`) over HTML scraping. Discover real download links yourself via jw.org's publication pages; a commonly used pattern is the `GETPUBMEDIALINKS` publication-media endpoint on `b.jw-cdn.org` with `pub`, `langwritten`, `issue` and `fileformat` parameters — **verify by calling it; do not assume**. Parse with your own parser or the open-source `jw-epub-parser` (check its license first). Store in `workbook_weeks` / `watchtower_weeks` (public data, plaintext). Politeness: ≤1 req/s, cache by ETag/hash, descriptive User-Agent, kill switch `JW_IMPORT_ENABLED`, store `source_url`, show "Source: jw.org". Titles are **read-only** in the UI; editable: assignees, exceptions, notes, public-talk title. Put the owner's written authorization in `docs/permissions/jw-org-authorization.md` (template if absent).

### 7.5 PDF Studio (selling point — must not regress)
Engine in `packages/pdf` ported from V1 `pdf-tools.js`. Documents: S-21 (single/batch), S-1 summary, S-88 and S-3 as V1, Emergency list (family-wise), schedules (midweek, weekend), duty rosters, large-print list, month grid, CO Visit Pack. UI: pick document → pick people/range → live preview → Download / Print / Share. Embedded Noto fonts for all Indian scripts. Golden tests: compare against `tests/golden/v1/` (WP-00/WP-09).

### 7.6 Messages (free tier works without any API)
WhatsApp **Smart Share**: templates (assignment reminder, schedule published, report reminder, speaker confirmation, welcome), placeholders, per-language, bubble preview, **send queue** (per-person `wa.me` link, mark sent/skip, resumable), group broadcast with live link, E.164 normalization (+91 default), opt-out, quiet hours. Reminders: scheduled in-app/Push (generic text only). Announcements. (Level-2 WhatsApp Business/AI intake stays behind flags; **disabled in Vault mode**.)

### 7.7 Import Center
Paste from spreadsheet · CSV/XLSX/vCard · optional on-device paper scan (Tesseract.js) → auto column mapping → review table (inline fixes, duplicate/household prompts, group mapping suggestions, never auto-create groups) → dry-run summary → import → **Undo (7 days)**. Sample CSVs kept.

### 7.8 Setup wizard (first run; resumable)
Welcome → congregation basics (name, language, country/time zone, meeting days/times) → **Vault choice** (§9) → groups (quick-create N) → add people (Import Center) → roles/invites → first schedule (auto-filled) → share links → install app → done checklist.

### 7.9 Public pages
Report form, attendance form, noticeboard (name search), weekend page; abuse-throttled; Turnstile; in Vault mode they use the sealed inbox / fragment-key links.

---

## 8. Billing, plans and trial (build; Razorpay keys supplied later via secrets)

**Config, not code:** `PAID_START_DATE=2027-05-01`. Before that date **every workspace has Complete for free** (Founding period; show "Free until 1 May 2027"). After it: new workspaces get a **30-day full trial of Complete**, then fall back to **Starter (free, never locked)**.

**Tables** (`supabase/migrations/…_billing.sql`, with `down`): `plans(id, name, price_inr_paise, interval, razorpay_plan_id, features jsonb, active)`, `subscriptions(id, cong_id, plan_id, status, razorpay_subscription_id, trial_ends_at, current_period_end, cancel_at, created_at)`, `payments(id, cong_id, razorpay_payment_id, amount_paise, currency, status, method_type, invoice_no, paid_at)`, `coupons`, `billing_events` (webhook log, idempotency key). RLS: congregation admins read their own rows; **only edge functions write**; SuperAdmin reads all billing metadata (never content).

**Seeds:** `starter` (₹0), `complete_year` (₹1,499 / year), `complete_month` (₹199 / month), `founders_year` (₹999 / year, limited, price-locked). Prices are data in `plans`, editable by SuperAdmin.

**Entitlements** (`packages/core/entitlements.ts`): Starter = people/groups/households, report collection, S-21 single download, S-1 view, attendance + S-88/S-3, midweek + weekend + auto-titles, emergency list, basic print, import/export, Vault mode. Complete adds: **CO Visit Pack, Accuracy Guard auto-checks, batch/ZIP PDFs, WhatsApp send queue + scheduled reminders, duty rotation + field service meetings, household reporting + report links + overseer portals, Import Center OCR, advanced print presets, > 2 admins, priority support**. **Never paywall security, export, or deletion.** Server-enforced where the server is involved (push, WhatsApp API, report links); client-enforced elsewhere. When over limits show an upgrade card that explains the benefit (never a dead end).

**Razorpay (edge functions):** `create-subscription`, `create-payment-link`, `cancel-subscription`, `razorpay-webhook` (verify `X-Razorpay-Signature` with the webhook secret, idempotent via `billing_events`, handle `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`, `refund.processed`). Checkout supports Cards, UPI Autopay and eMandate (UPI Autopay frictionless debits work up to ₹15,000, so both plans fit). Generate a PDF **invoice/receipt** per payment (fields for GSTIN/legal name configurable). Test-mode and live-mode keys via secrets; if absent the Plan page says "Payments opening soon".

**Plan page (Admin › Plan & billing):** current plan, trial/free-period countdown, what each plan includes (comparison), Subscribe (annual default, monthly option), invoices, cancel, **Export & delete** (§10).

---

## 9. Zero-knowledge Vault (WP-22) — explicit specification

### 9.1 What it must guarantee (and the honest limits)
In Vault mode, all congregation content is encrypted on the user's device before upload; the server and the operator **cannot** read it. Server-visible metadata: congregation id, plan/billing, member user ids and login emails, role grants, record ids, collection names, sizes, timestamps. **Limits to state in-app and on the website:** lost keys + lost recovery sheet = permanent data loss; the web app's code is delivered by us (mitigated by CSP, SRI, build hash, visible updates); compromised devices and printed/exported files are outside protection; WhatsApp messages pass through WhatsApp.

### 9.2 Primitives (use only these; libsodium)
`crypto_box_seal` (X25519) to wrap keys · `crypto_aead_xchacha20poly1305_ietf` for records (192-bit random nonce) · Ed25519 signatures for key-directory entries · `crypto_pwhash` (Argon2id) for passphrase/recovery derivation · WebCrypto non-extractable key only to wrap the device key in IndexedDB. No custom ciphers, no MLS.

### 9.3 Keys
- **Identity** per user per device: X25519 + Ed25519, generated on-device.
- **Congregation Vault Key (CVK)** per scope+epoch: 32 random bytes; sealed to each authorized member's public key and stored in `vault_envelopes`.
- **Scopes:** `people_private`, `reports`, `attendance`, `schedule`, `duties`, `speakers`, `settings` (+ `reports:<groupId>` for group overseers).
- **Recovery Sheet:** printable PDF with a **12-word phrase + QR**, shown once, confirmed by re-entering 3 random words. Brand it "Your congregation's digital almirah — only you hold the key."
- **Key holders:** require **≥ 2 key holders** (e.g., Secretary + Coordinator) in the wizard (can be skipped with a warning). Offer **Shamir 2-of-3 split** of the recovery phrase among three elders using a maintained, audited implementation (verify license). 
- **Revocation:** new epoch; re-wrap to remaining members; background re-encryption with progress.
- **Key authenticity:** members' public keys countersigned by Main Admin; clients pin admin keys; **Safety code** (digits + words) to compare between admins; loud warning on key change.

### 9.4 Server schema (additive SQL + `down`)
```sql
create table vault_members(cong_id uuid, user_id uuid, pub_enc bytea, pub_sign bytea, signed_by uuid, role text, revoked_at timestamptz, primary key(cong_id,user_id));
create table vault_envelopes(cong_id uuid, scope text, epoch int, member_user_id uuid, sealed_key bytea, primary key(cong_id,scope,epoch,member_user_id));
create table vault_records(cong_id uuid, collection text, id uuid, epoch int, rev int, nonce bytea, ciphertext bytea, updated_at timestamptz default now(), updated_by uuid, deleted boolean default false, primary key(cong_id,collection,id));
create table vault_inbox(id uuid primary key default gen_random_uuid(), cong_id uuid, kind text, sealed bytea, created_at timestamptz default now());
```
RLS: a member may select/insert/update `vault_records` only for scopes they hold an envelope for; `vault_inbox` insert is allowed to anonymous via a rate-limited function and read only by key holders. AAD for every record = `cong_id|collection|id|epoch|rev|schema_version`.

### 9.5 Sync
Pull by `updated_at` cursor → decrypt in a Web Worker → upsert into IndexedDB; push queued writes with `base_rev`; conflict ⇒ keep newest by hybrid logical clock and show an **Undo** toast; realtime channel broadcasts only record ids. Decrypt 5,000 records < 1.5 s on a mid-range profile.

### 9.6 Flows
Enable/migrate (Plain → Vault) with round-trip verification and plaintext scrub; new-device approval (QR); lost-device revoke; Recovery restore; **Export & delete (§10)**; Disable (Vault → Plain) with consequence screen. Sealed inbox for publisher reports/attendance; fragment-key links (`#k=…`, never sent to the server) for noticeboard/one-link.

### 9.7 Tests (all must pass before flags flip)
Known-answer vectors · tamper (ciphertext/AAD/rev/epoch) fails · replay of old rev warns · wrong scope fails · fuzz envelope parser · two-browser Playwright (approve device, concurrent edit, revoke, lost-device, recovery, Shamir restore) · 1,000-publisher migration · **sentinel test**: a unique string typed into every field never appears in any network body, DB dump, storage, or cache while in Vault mode · crypto-shred test (§10).

---

## 10. Trial end, export and deletion (explicit)
**Export pack** (client-side, so it works in Vault mode): `ca-export-<congregation>-<date>.zip` containing `README.txt` (what each file is), `publishers.csv`, `households.csv`, `groups.csv`, `emergency_contacts.csv`, `reports_<serviceyear>.csv` (one per year), `attendance.csv`, `midweek_schedule.csv`, `weekend_schedule.csv`, `duties.csv`, `field_service_meetings.csv`, `visiting_speakers.csv`, `s21/` (one PDF per publisher), and the encrypted backup. CSV rules: UTF-8 **with BOM** (opens correctly in Excel), ISO dates, one header row, stable column names, **formula-injection safe** (prefix `'` for cells starting `= + - @`). **Round-trip test:** exported CSVs re-import through the Import Center with zero errors.
**Delete everything:** typed confirmation → delete all `vault_records`, `vault_envelopes` (**crypto-shredding**: without envelopes even backups are unreadable), `vault_inbox`, members, files; Plain mode: delete all congregation rows. Keep only legally required billing records (invoices) with no publisher data. Produce a **Deletion Receipt PDF** (congregation id hash, UTC timestamp, categories deleted, what is retained and why). Backups: state the provider's retention window honestly in the receipt.
**Trial-end timeline:** banners at −7/−3/−1 days (and push/email); on expiry show three buttons: **Keep Free (Starter)** · **Subscribe** · **Export & delete**. If no action for 90 days after expiry on a *non-Starter-eligible* state, send warnings at 30/14/7/1 days, then auto-delete (configurable; default on only for workspaces with no activity).

---

## 11. SuperAdmin dashboard (WP-20) — billing and health, never content
Visible only to approved SuperAdmin Google accounts. **Must not and cannot read congregation content** (it is encrypted in Vault mode; in Plain mode the UI still never queries content tables).
- **Revenue:** MRR, ARR, revenue by month (chart), refunds, failed payments/dunning list, upcoming renewals (30 days), ARPU, plan distribution (donut), founders-slots remaining.
- **Funnel & activation (event counts only, no content):** visited → requested → activated → imported ≥10 people → generated first S-21 → published first schedule → paid. Trial→paid conversion, churn, cohort retention.
- **Congregations table:** name, contact email, language/country, plan, status (free period/trial/paid/past-due/cancelled/deleted), trial end, next renewal, last payment, last active date, app version, declared size band; filters, search, CSV export of billing metadata.
- **Actions (all written to an immutable audit log visible to that congregation):** extend trial, grant/comp a plan, apply coupon, record offline/UPI payment, refund (via Razorpay API), suspend/unsuspend, send notice, resend invoice. **No impersonation, no data viewing, no password resets.**
- **Webhook log** with replay, plan editor (prices/features), GST invoice register export, system health (edge function errors, import job status).

---

## 12. Website V3 (`apps/site`) — rich, modern, honest
Rebuild with the same themes (live theme switcher in header) and `v3-themes.css`.
- **Hero with a moving grid behind the text.** Implement exactly:
```css
.hero{position:relative;overflow:hidden;isolation:isolate}
.hero .grid{position:absolute;inset:-40% -10% -10%;z-index:-1;transform:perspective(700px) rotateX(62deg);
  background-image:linear-gradient(var(--grid,rgba(255,255,255,.14)) 1px,transparent 1px),linear-gradient(90deg,var(--grid,rgba(255,255,255,.14)) 1px,transparent 1px);
  background-size:56px 56px;animation:gridmove 7s linear infinite;
  -webkit-mask-image:linear-gradient(to top,transparent,#000 35%,#000 65%,transparent);mask-image:linear-gradient(to top,transparent,#000 35%,#000 65%,transparent)}
@keyframes gridmove{to{background-position:0 56px}}
.hero .glow{position:absolute;inset:0;z-index:-1;background:radial-gradient(40% 40% at var(--mx,50%) var(--my,30%),color-mix(in srgb,var(--accent) 35%,transparent),transparent 70%)}
@media (prefers-reduced-motion:reduce){.hero .grid{animation:none}}
```
plus a tiny script setting `--mx/--my` from pointer position (disabled under reduced motion). Floating glass phone showing the **real V3 UI** on a guided auto-tour (Home → S-21 button → chase reports → publish schedule → CO Visit Pack), with play/pause and a static fallback.
- Sections: hero · **the three trust questions** (Who made this? Can the developer see our data? Is our data safe?) · "A month in the life of a secretary" scroll-story (collect → S-21 → S-1 → CO visit) · weekly cycle (midweek/weekend/duties/field service) · delivery modes · themes showroom (click to re-theme the page) · import demo · accessibility demo (text-size slider) · pricing · install (Android/iPhone) · FAQ · request/start form.
- **Pages:** Home · Features · Security & Trust (`/security`) · About (`/about`) · Pricing · Compare (honest table vs free apps: only verifiable facts, never disparage) · Install · Help · Updates · Contact · Privacy · Terms · **Refund & Cancellation policy** (Razorpay needs it) · Status · 404.
- **Copy rules:** follow the launch README §5.1 (claims linter, banned words, placeholders from `trust.json`). Pricing text uses `PAID_START_DATE` from config: *"Everything is free until 1 May 2027. Starter stays free forever."* Founders offer shown only while slots remain (read from data).
- Free-forever promise copy must come from config so it can't drift from the plan seeds.
- Performance: initial payload ≤ 200 KB gz; Lighthouse ≥ 95; works without JS (content + form fallback).

---

## 13. Work packages (execute in this order)
- [ ] **WP-00** Baseline: tag `v1-final`; generate golden PDFs from V1 into `tests/golden/v1/`; generate V1 action inventory (`docs/PARITY.md`); create `docs/V3-PROGRESS.md`.
- [ ] **WP-01** Tooling: monorepo layout, Vite/TS strict, ESLint (a11y, no-emoji, no-hex-in-components), Vitest, Playwright, `scripts/contrast-check.mjs`, `scripts/layout-detector.ts`, `scripts/check-no-legacy.mjs`.
- [ ] **WP-02** Design system: `themes.css`, tokens, fonts, icons, illustrations, all components (§5), Dialog.
- [ ] **WP-03** App shell: navigation + hubs + breakpoints (§3), global search/command palette, Experience Styles (§6), theme gallery, adaptive layout runtime (Layout Doctor), i18n scaffold.
- [ ] **WP-04** `Store` interface + `PlainStore` + typed repositories + Zod schemas + local IndexedDB mirror + sync (Plain) — port V1 data logic.
- [ ] **WP-05** Auth + membership + roles + invites + Links Hub (Google / magic link / one-link; **no passwords**); activity log; support-access removed (no operator access path).
- [ ] **WP-06** Home dashboards per role (§6) with real + demo data; greeting/clock.
- [ ] **WP-07** People: publishers list **with S-21 button (§4)**, inspector, add/edit (email field + household prompt), groups table + dropdowns, households, emergency list family-wise.
- [ ] **WP-08** Reports cycle (§7.2) + Accuracy Guard + S-1 summary + pioneer logs + chase queue.
- [ ] **WP-09** PDF Studio (§7.5) + CO Visit Pack + **golden parity tests**.
- [ ] **WP-10** Attendance.
- [ ] **WP-11** Midweek + S-140/S-89 + schedule import job (§7.4).
- [ ] **WP-12** Weekend + visiting speakers + Watchtower import.
- [ ] **WP-13** Duties + field service groups/meetings.
- [ ] **WP-14** Messages: WhatsApp Smart Share, reminders, announcements.
- [ ] **WP-15** Import Center (+ optional OCR).
- [ ] **WP-16** Setup wizard + first-run Experience picker.
- [ ] **WP-17** Public pages (report, attendance, noticeboard, weekend) with abuse throttling.
- [ ] **WP-18** Billing + entitlements + Razorpay edge functions + Plan page + invoices (§8).
- [ ] **WP-19** Trial-end flow: Export pack + Delete + Receipt (§10) with round-trip test.
- [ ] **WP-20** SuperAdmin dashboard (§11).
- [ ] **WP-21** Publisher portal (Calm default): Next / Schedule / Report (+ household switcher) / Me.
- [ ] **WP-22** `VaultStore` + Vault UI (recovery sheet, key holders, Shamir, devices, migration, sealed inbox) + §9.7 tests. Flip `VAULT_DEFAULT` for new workspaces only when green.
- [ ] **WP-23** PWA hardening + install UI + offline + optional APK workflow (skips without secrets).
- [ ] **WP-24** Website V3 (§12), legal pages from the real data map, trust badges from CI (`trust-metrics.json`).
- [ ] **WP-25** Hosting/CI/CD: Cloudflare Pages deploy for `congregationassistant.com` (site) and `app.congregationassistant.com` (app), headers/CSP/redirects, `security.txt`, config-driven URLs, DNS preflight script, post-deploy verification.
- [ ] **WP-26** QA program and reports (below).
- [ ] **WP-27** Parity sign-off → delete V1, bridge, `staging/`, `public-site-preview/`, `archive/`, legacy auth and tables migration (write, don't auto-apply); final deploy.

**Gates (before WP-27 and every merge):**
1. `docs/PARITY.md` has zero rows pointing to V1; every V1 action reachable in **≤ 2 clicks/taps from Home** with a visible label (Playwright reachability matrix).
2. PDF golden parity passes; Indic names render.
3. All 9 themes pass contrast CI; layout detector passes the full matrix; axe 0 serious/critical.
4. Billing webhook tests (signature, idempotency, each event), entitlement gating tests, trial-end and export/delete tests pass.
5. Tenant-isolation SQL matrix passes; no secrets in repo; CSP/headers tests pass; `check-no-legacy` passes with V1 deleted.
6. **Visual review (≤ 10 images):** contact sheets only — (a) Home in Calm/Balanced/Lively, (b) People list with S-21 buttons at 390 and 1440 px, (c) all 9 themes on Home, (d) Meetings hub + weekend, (e) Reports chase, (f) Plan & SuperAdmin, (g) website hero, (h) setup wizard, (i) 200% text on phone. Fix once; re-render only affected sheets.

**QA reports to commit:** `docs/qa/QA-REPORT.md`, `SECURITY-ASSESSMENT.md` (ASVS L2 mapping), `PERF-REPORT.md`, `A11Y-REPORT.md`, `PDF-PARITY.md`, `PRIVACY-DATA-MAP.md`, `KNOWN-ISSUES.md`. Run heavy matrices in GitHub Actions weekly + before release. State honestly what is self-assessed.

---

## 14. Deploy (authorized)
Open one PR per tier or one final PR; merge to `main` when gates pass; production deploys via the workflows. Update `README.md` and `AGENTS.md`. Write `docs/OWNER-TODO.md` listing only what Codex cannot do (Cloudflare/GoDaddy DNS, Razorpay keys + webhook, Supabase upgrades and secrets, Google OAuth, Titan mailboxes, filling `trust.json`/`about.json`).

**Definition of done:** a secretary with no guide opens the app on a phone, picks a style, imports her publishers, taps **S-21** beside any name and gets the exact PDF, chases missing reports from a queue, prepares a **CO Visit Pack** with an Accuracy Guard "Ready" result, schedules midweek and weekend meetings with auto-filled titles, assigns duties, and can export everything as clean CSVs and delete it with a receipt — in any of nine distinct themes, on phone, tablet and desktop — while the website truthfully answers who built this, who can see the data, and how it is protected.