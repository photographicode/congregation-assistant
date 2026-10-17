# V3 NEXT ORDERS — direct downloads, WOL import, smarter Home, per-theme fonts, alignment, minimal black-and-white website

These orders add to and, where they conflict, **override** `V3-CODEX-ORDERS.md` and `V3-RESUME-ORDERS.md`. Do not ask questions. Do not redo finished work. You may commit, push, merge to `main`, and deploy both GitHub repositories. Commit and push after **every numbered item** so a usage limit never loses work.

## 0. Credit plan and honesty
1. Read `docs/V3-PROGRESS.md` and `git status` once. Update the progress file truthfully (partial = partial, with evidence).
2. **Do items in this order** (user-visible first): **A direct downloads → B WOL import (CI) → C Home suggestions + group report links → D weekend last-talk heads-up → E install flow → F alignment audit + fixes → G fonts per theme → H website rebuild → I contrast gate → J remaining work packages.** If credits run short, stop after the highest items that are fully tested; never leave half-built UI visible (flag it off).
3. Run only affected tests per item; run the whole suite once at the end in GitHub Actions. Image budget: ≤ 12 images total (contact sheets only).
4. Never claim in the UI or website what is not shipped and verified. Remove all "checkpoint / in progress / being verified / not yet claimed" wording from public pages (see H).

---

## A. Direct download — no preview step (owner decision)
The previews confuse users. **One tap = the PDF downloads.**
1. **Every download button saves the file immediately**: S-21 (publisher-row button, Download Center, search results, Chase list), S-89 (student + assistant), S-140/schedules, rosters, emergency list, attendance forms, CO Visit Pack. Remove the preview dialog/step from all of these flows. Keep a small chevron menu with **Print** and **Share** only (no "Preview").
2. S-21 Download Center: choose the group (+ month for auxiliary pioneers, N months for "No report", service year) then press **Download** → merged PDF or ZIP (user's earlier choice remembered). No intermediate screen.
3. **Accuracy Guard never blocks.** After the file downloads show a non-blocking toast: "S-21 downloaded · 2 months have no report" with a "Review" link. For batches: "Downloaded 42 records · 3 need attention".
4. Implementation: generate the PDF in a worker, trigger `<a download>` from a blob URL (iOS Safari: open the blob in a new tab if `download` is unsupported), show a 1–2 s progress state on the button, filename `S-21_<Surname-First>_<ServiceYear>.pdf` / `S-21_<Filter>_<ServiceYear>.pdf` / `S-89_<Name>_<Date>.pdf`.
5. Tests: Playwright `waitForEvent('download')` fires within 3 s for every button above at 390 px and 1440 px; no dialog opens; text of the PDF matches the golden fixtures.

---

## B. Meeting parts from wol.jw.org (the owner has written authorization). **No EPUB/JWPUB. No fixtures. No import UI for users, ever.**
Delete everything about EPUB/JWPUB/fixtures from code, docs, `OWNER-TODO.md`, the importer's failing `GETPUBMEDIALINKS` path (it returned HTTP 400), and any admin-facing "import a workbook" control. Replace with the pipeline below.

### B.1 Facts verified by the owner and by reading the pages (do not re-argue)
- Weekly workbook pages are `https://wol.jw.org/en/wol/d/r1/lp-e/<docId>`. Verified: `202026257` = **October 12–18** (Jeremiah 42–44), `202026258` = next week, `202026259` = the week after, `202026409` = **December 28, 2026–January 3, 2027** (Ezekiel 9–10).
- **Doc IDs are sequential inside an issue but NOT across issues** (Oct 12 is …257; Dec 28 is …409, eleven weeks later). Never compute IDs by arithmetic across issues. **Follow the page's own previous/next links** (each page links `/en/wol/d/r1/lp-e/<prev>` and `<next>`; the last page of a range has no next) and the breadcrumb link to the issue index (e.g. `…/meeting-workbooks/life-and-ministry-meeting-workbook-2026/september`, `…/november`) which lists that issue's weeks.
- Each page's `<title>`/H1 is the date range (`October 12-18`, or `December 28, 2026–January 3, 2027`). The breadcrumb shows the issue (`mwb26 November pp. 14-15`).
- Page structure (headings in order): `# DATE RANGE` → `## BIBLE READING` → `### Song N and Prayer | Opening Comments (1 min.)` → `## TREASURES FROM GOD'S WORD` → `### 1. <title> (10 min.)`, `### 2. Spiritual Gems (10 min.)`, `### 3. Bible Reading (4 min.) <reference> (th study N)` → `## APPLY YOURSELF TO THE FIELD MINISTRY` → `### 4. <title> (3 min.) <setting text>`, `### 5. …`, `### 6. …` (3–4 parts; setting text like INFORMAL WITNESSING / HOUSE TO HOUSE / Demonstration / Discussion; `lmd lesson N point N` references) → `## LIVING AS CHRISTIANS` → `### Song N` → `### 7. <title or "Local Needs"> (15 min.)` → `### 8. Congregation Bible Study (30 min.) wcg chap. N` → `### Concluding Comments (3 min.) | Song N and Prayer`. Part counts and titles vary by week; special weeks (assembly, CO visit, Memorial) differ — parse defensively, never assume 8 parts.

### B.2 Pipeline (runs in GitHub Actions, because your sandbox cannot reach WOL)
1. `scripts/meetings/fetch.mjs` + `.github/workflows/fetch-meetings.yml` (weekly cron + `workflow_dispatch`, kill switch `JW_IMPORT_ENABLED`). Politeness: ≤ 1 request/second, descriptive User-Agent with `support@congregationassistant.com`, ETag/If-Modified-Since cache, exponential backoff, no images downloaded, no raw HTML committed.
2. **Discovery:** start from anchors `202026257`, `202026258`, `202026259`, `202026409`; crawl **forward and backward via prev/next links** to map every available week → `data/meetings/index.json` `{ weekStartISO → { docId, url, lang, issueLabel, fetchedAt } }`. Also read the issue index pages from the breadcrumb to confirm coverage. For years/issues not yet linked, read the WOL **MEETINGS** page (`/en/wol/meetings/r1/lp-e`) and the next year's workbook index and add the new anchors automatically. Log which strategy found each week.
3. **Parse** each week into `data/meetings/en/<weekStartISO>.json`: `{ weekStart, weekEnd, dateLabel, bibleReading, songs{opening,middle,closing}, sections[{key,title,parts[{number,title,minutes,kind,setting,refs}]}], source_url, fetched_at, content_hash }`. `kind` ∈ `talk | spiritual_gems | bible_reading | student | discussion | local_needs | bible_study | other`, derived from structure and the `(N min.)` markers — **never hard-code titles or part counts**. Date parsing handles `October 12-18` and `December 28, 2026–January 3, 2027`; infer the year from the publication year/issue when missing; weeks start Monday.
4. **Watchtower Study** (weekend): discover the week's Watchtower Study article from the same MEETINGS/week pages; store `data/watchtower/en/<weekStartISO>.json` `{ articleTitle, studyDates, songs, source_url }`. If a field can't be found, leave it null and log — never invent.
5. **Other languages:** after English works, discover each language's WOL path from the language switcher (`/en/wol/li/r1/lp-e` lists them) and repeat for Tamil, Malayalam, Hindi, Kannada, Telugu, Odia, Assamese, Marathi, Gujarati, Bengali, Punjabi where WOL provides the workbook.
6. The workflow commits the JSON to the repo (public information only) and the Pages build serves it as static files. The app fetches `data/meetings/<lang>/<week>.json` and caches it for offline.
7. **Debuggability:** on any parse failure the workflow uploads an artifact with the failing URL, the first 2 KB of the page text and the stack trace. Use the GitHub integration to read the run logs and iterate until a real run succeeds for at least the four anchor weeks. Record the result in `docs/qa/MEETING-IMPORT-RUN.md`.
8. Tests: write **synthetic** HTML/markdown fixtures that reproduce only the *structure* above (headings, minutes markers, links) with invented text — do **not** commit copies of WOL pages. Parser unit tests must pass offline; the real CI run is the integration test.
9. **App behavior:** midweek parts, durations, songs and the Watchtower title appear automatically and are **read-only**; the overseer only assigns people. If a week isn't available yet: "Parts for this week will appear automatically once published." (admin-only quiet link: "Enter parts manually"). Show "Source: wol.jw.org" where parts appear. Turn the public claim "meeting parts are filled in automatically" **on only after the real CI run succeeded** (set `data/meetings/status.json` `{ verified: true, lastSuccess }`).

---

## C. Home (admin portal start): rotating suggestions + group report links
### C.1 Group report links at the very top
Directly under the greeting, a **"Group report links"** card (Admin/Secretary/Service Overseer see all groups; Group Overseers see their own). For each group: group name · **Copy link · QR · Share · Open**, "x of y submitted this month", last submission time. Groups without a link show **Create link**. A **"Copy all for WhatsApp"** button builds a ready message (one line per group). Rotate/revoke stay in Links Hub. The same card appears at the end of the setup wizard.
### C.2 Suggestions that change every time (`packages/core/suggestions.ts`)
- Show **3** suggestion cards; **re-seed on every portal open** (new session/launch), not only daily; avoid repeating anything shown in the last 5 openings (store last-seen ids locally).
- Candidates (weighted): **urgent** (reports missing → "Remind 5 publishers"; next week's midweek/weekend/duties unassigned; attendance not recorded; Accuracy Guard issues; trial/plan notices) get high weight; **discover** (features not yet used: CO Visit Pack, S-21 filters, on-device assistant with a rotating example phrase such as "add a report for Maria Thomas, September, 3 hours, 2 studies", group links, themes, text size, install the app, weekend talk history); **delight** (small helpful tips). Weighted random pick with urgent always allowed to surface.
- Each card has one **action button** that deep-links ("Remind now", "Open assistant", "Assign parts"), plus Dismiss/Snooze. Respect role (an AV overseer never sees S-1 tips). Localized strings. Deterministic tests with a seeded RNG.

---

## D. Weekend scheduling: "last given" heads-up for talk numbers
- Data: `talk_history(date, talk_no, title, speaker_ref_or_name, speaker_congregation, source)`; filled automatically from published weekend weeks, plus **quick backfill** (paste "date, number" lines or a CSV) so new congregations can seed history.
- UI: when the assigner types or picks a **talk number**, show instantly beneath the field: **"Last given: 14 Mar 2025 · 19 months ago · Br. <Speaker>"**, with recency colors (≤ 12 months strong warning; 12–24 months soft notice; > 24 months neutral; never in your records: "Not given in your records"). Default threshold 12 months (setting). Also show if **this speaker** gave the same talk before and when.
- **Talk finder:** searchable list of numbers/titles the congregation has used, sorted **least recently given first**, to help choose wisely; selecting fills number and title (title stays editable).
- Test: fixtures for never/recent/old/same-speaker cases; month math across year boundaries; the heads-up appears on phone and desktop without layout shift.

---

## E. Install flow (browser prompt first, instructions after 5 s)
1. Capture `beforeinstallprompt` as early as possible (page load) and keep it.
2. When the user taps **Install app**: if the captured prompt exists → call `prompt()` immediately and await `userChoice`. If it doesn't exist yet → show "Opening your browser's install prompt…" with a small spinner and **wait up to 5 seconds** for the event; if it arrives, prompt; if not, **show the instructions** for the detected platform.
3. Platform detection: iOS Safari never fires the event → **skip the wait** and show "Share → Add to Home Screen" immediately; Android Chrome/Samsung Internet/Firefox/Edge and desktop Chrome/Edge get their menu steps with simple illustrations (inline SVG, no emoji).
4. Hide the button when `display-mode: standalone` or after `appinstalled`; then show "Installed — open it from your home screen." Test the three branches (event available, event delayed within 5 s, no event) with fake timers.

---

## F. Alignment audit — frame by frame, view by view (owner reports many misalignments)
Build `scripts/alignment-audit.ts` (Playwright, deterministic fixtures) and run it on **every screen, dialog and sheet × widths {320, 360, 390, 430, 600, 768, 1024, 1366, 1440, 1920} × text scale {100%, 130%, 200%} × themes {mono-light, mono-dark, lagoon-glass, neon-night, paper}**. It must detect and report (with selector + screenshot coordinates):
1. **Near-miss left/right edges:** siblings in the same column whose x differs by 1–7 px.
2. **Unequal heights** of cards/buttons in the same row; buttons in one group with different heights/radii.
3. **Icon–label misalignment:** icon center vs text x-height center delta > 1 px.
4. **Mixed text alignment** (centered text inside a left-aligned stack; right-aligned numbers without `tabular-nums`).
5. **Spacing off the 4 px grid** between siblings; inconsistent container padding between screens; inconsistent heading-to-content gaps.
6. **Overflow/clipping/overlap:** any child wider than its parent, clipped text, overlapping boxes (excluding intentional layers), fixed bars covering content, content under notches (safe areas).
7. **Orphans/widows** in headings and short paragraphs; uneven line lengths in cards.
**Fix systematically, not per screen:** one spacing scale (4/8/12/16/24/32/48), one container padding per breakpoint, `display:grid` with `align-items:stretch` for card rows, shared `Row`/`Field`/`Section` primitives, `text-wrap: balance` for headings and `pretty` for paragraphs, `font-variant-numeric: tabular-nums` for numbers, icon buttons with fixed square size, identical heights for controls (44 px), consistent label/field/help-text stacking. Write the **before/after counts** per screen into `docs/qa/ALIGNMENT-REPORT.md`; the CI gate is **zero findings**. Only then render contact sheets (≤ 12 images total) and look at them.

---

## G. Fonts that fit each theme (app and website), all self-hosted and OFL-licensed
Verify every license file before bundling. Load only the **active theme's** fonts (preload them), `font-display: swap`, with `size-adjust`/metric overrides on fallbacks to prevent layout shift; subset Latin and load Indic scripts on demand by `unicode-range`.
| Theme | Display | Body | Accent/numbers |
|---|---|---|---|
| `mono-light`, `mono-dark` | **Instrument Serif** | **Inter** | **JetBrains Mono** |
| `paper` | **Newsreader** | **Source Sans 3** | — |
| `lagoon-glass` | **Outfit** | **Inter** | — |
| `neon-night` | **Space Grotesk** | **Inter** | **JetBrains Mono** |
| `sunset-pop` | **Bricolage Grotesque** | **DM Sans** | — |
| `neo-brutal` | **Archivo Black** | **Inter** | **Space Mono** |
| `forest` | **Fraunces** | **Source Sans 3** | — |
| `aurora` | **Sora** | **Inter** | — |
**Indic and other scripts** (body = Noto Sans, serif themes = Noto Serif where it exists): Devanagari (Hindi, Marathi), Tamil, Malayalam, Kannada, Telugu, Bengali (also used for Assamese), Odia (Noto Sans Oriya), Gujarati, Gurmukhi (Punjabi), Arabic/Nastaliq optional for Urdu (RTL). Indic text gets `line-height ≥ 1.7`, no letter-spacing, and larger minimum size; headings never use Latin display fonts for Indic glyphs. Tests: computed `font-family` per theme; Indic glyph rendering screenshots for each script; CLS ≈ 0; total font payload per theme ≤ 150 KB (Latin).

---

## H. Public website rebuild — minimal black & white, fast, confident
**Remove:** the 9-theme dropdown, the single-line "हिन्दी" button, **"Try it with fictional records"**, the "Fictional demo" hero card, every "Try the demo / Admin demo / Publisher demo" link, "V3 checkpoint… work still in progress" text, "Preview once", and every sentence that apologizes ("being verified", "not yet claimed", "in development" for shipped features). (`?demo` stays in the app for QA but is not advertised.)
**Visual system:** the old **black-and-white** look — `mono-light` with a `mono-dark` toggle (light/dark only), hairline borders, generous whitespace, one type system from §G (Instrument Serif headlines, Inter body, JetBrains Mono for small labels/numbers). No colors except the mockups.

### H.1 Pages (only what a software site needs)
Home · Features · Security & Trust · About · Pricing · FAQ (on Home and `/faq`) · Install (Android/iPhone/desktop) · Updates · Contact · Privacy · Terms · Refund & Cancellation · Status · 404.

### H.2 Languages (replace the Hindi button)
A globe-icon **language menu** with native names: English · हिन्दी · தமிழ் · മലയാളം · ಕನ್ನಡ · తెలుగు · ଓଡ଼ିଆ · অসমীয়া · मराठी · ગુજરાતી · বাংলা · ਪੰਜਾਬੀ · اردو (RTL). Routes `/ta/`, `/ml/`… with `lang`, `dir`, `hreflang`, remembered choice, and a polite one-time banner suggesting the browser language. Translations in `locales/<code>.json`; translate nav, hero, how-it-works, feature titles/blurbs, pricing summary, trust answers, FAQ, CTAs, footer; missing keys fall back to English. Mark machine-drafted locales `reviewed:false` and show a subtle "Help us improve this translation" link until the owner flips it. Apply the same language list to the app's i18n scaffold.

### H.3 Mockups instead of demos (build the pipeline)
- `scripts/mockups/capture.ts` (Playwright, run in CI) renders the **real app** with a neutral marketing seed (generic names, no real people) into 2× WebP/AVIF screens: Home (with group report links + suggestions), People (S-21 buttons), S-21 Download Center, Midweek (crimson/slate/gold), Weekend (last-given heads-up), Reports/Chase, Attendance form, Assistant (confirm card), Themes. Viewports: phone 390×844, tablet 820×1180, laptop 1440×900.
- **Device frames** drawn in CSS/SVG (generic, no brand marks). Hero = phone + laptop composition that **cross-fades the same screen through four app themes** (the site stays B/W; the mockups bring the color). Scroll story swaps screens in a sticky phone. The assistant mockup is a **scripted, non-interactive typing animation** ("add a report for Maria Thomas, September, 3 hours, 2 studies" → confirm card). No inputs, no "try it".
- Regenerate mockups on each release; commit only optimized assets; `alt` text describes what the screen shows.

### H.4 Animations (all off under `prefers-reduced-motion`; transform/opacity only; JS ≤ 30 KB)
Line-by-line headline reveal · thin B/W moving grid with a soft cursor spotlight (fine pointers only) · parallax/tilt on mockups · staggered card reveals · count-up numbers (only factual: "8 S-21 options", "9 themes", "13 languages") · marquee of form names (S-21 · S-1 · S-88 · S-89 · S-140) · animated link underlines and arrow micro-interactions · page-transition fade · sticky scroll story.

### H.5 Copy deck (English; translate from this; keep every claim true or flag-gated)
- **Nav:** Features · How it works · Security · Pricing · FAQ · **Open app**.
- **Hero:** eyebrow "For secretaries, overseers and everyone who helps." H1 "Run your congregation's week *without the paperwork.*" Sub "People, service reports, S-21, schedules, duties and attendance — in one calm app that works on any phone." CTAs **Start free** / **See how it works**. Small line "Free during our founding period · Starter plan free forever · Independent and unofficial." (dates/plan facts from config).
- **Three truths (render only if true):** "No ads. No tracking." · "Export your records anytime." (flag `export_pack`) · "Made for phones and large text."
- **How it works:** 1 **Add your people** — paste a spreadsheet or add them one by one. 2 **Prepare the month** — reports come in, S-21 is ready, schedules fill themselves. 3 **Share your way** — a link, WhatsApp or a PDF.
- **Features (only shipped ones):** *S-21 in one tap* — one button beside every publisher; or everyone, pioneers, elders, ministerial servants, SFTS, or those with no report for months. · *Reports without chasing* — group links, household reporting, reminders you send yourself. · *Midweek that fills itself* (flag `meetings_verified`) — the week's parts arrive automatically; you choose who. · *Fair suggestions* — last used, never used, auto-assign. · *Weekend meetings* — talks, speakers, and a heads-up when a talk was last given. · *S-89 slips* — for the student and the assistant, download or send. · *Duties* — Audio Video, Attendants, Cleaning with pools the administrator approves. · *Attendance from the door* — the right meeting chosen for you. · *On-device assistant* — "Type it the way you'd say it." Runs on your device; your words are not sent anywhere. · *Themes and comfort* — nine themes, larger text, adapts to your phone.
- **Security (home teaser + page):** "Who made this?" "One independent developer you can email." · "Who can see our data?" "Here is exactly who, by role — including us." · "How is it protected?" "What we do, how we test it, and where the limits are." Private (end-to-end) mode: show **"Coming soon — we turn it on only after it passes our full encryption tests"** until `E2EE_CLAIMS_ENABLED`.
- **Pricing (config-driven):** Founding banner "Everything is free until 1 May 2027. Starter stays free forever." · Starter ₹0 · Complete ₹1,499/year (₹199/month) · Founders ₹999/year while slots last. One line: "Export or delete everything at any time."
- **FAQ (10):** Is this official? (No — independent and unofficial; no JW logos.) · Who can see our data? · Is Private mode available? · Do I need to install anything? (Works in the browser; install in one tap.) · Does it work offline? · Can a household share one email? · What happens when the free period ends? · Can I export or delete my data? · Which languages are supported? · How do I get help? (support@congregationassistant.com)
- **Footer:** Product · Security & Trust · Pricing · Install · Updates · Privacy · Terms · Refunds · Contact · Status · "Independent and unofficial. Not affiliated with any religious organization." Meta description: "Congregation records, S-21, reports, schedules and duties — one calm app for secretaries and overseers."

### H.6 Quality
Initial payload ≤ 200 KB gz excluding lazy mockups; Lighthouse ≥ 95 (mobile); zero console errors; no third-party requests; works without JS (content + contact form fallback); full alignment audit (F) passes on the site at the same widths; `hreflang`, sitemap, OG images (generated from mockups), JSON-LD `SoftwareApplication`; claims linter green.

---

## I. Contrast gate resolution (you marked WP-02 BLOCKED)
Raw gradient **canvases never hold text** in this design; text lives on panels/surfaces. So: (1) change the gate to test **real rendered text/background pairs** (computed styles + the panel's composited color over every gradient stop under it), and test raw canvases only for **non-text** UI (borders/glows ≥ 3:1 where used as controls); (2) if any real text sits on a bare canvas, move it onto a panel or **darken the gradient stops under that area** (you may change the backdrop gradient values — not the text/surface tokens); (3) keep every threshold (body ≥ 4.5:1, text-1 ≥ 7:1). Re-run the matrix and tick WP-02 only when it passes.

---

## J. Then continue the remaining work packages in V3 order
Ship what is truthful today; keep unfinished screens flagged off. After each batch: `npm run check`, the alignment audit on touched screens, commit, push. Final: update `docs/V3-PROGRESS.md`, `docs/CUTOVER-REPORT.md`, `docs/OWNER-TODO.md` (**delete the EPUB/fixture request**), `docs/qa/*`, deploy both repos, run the post-deploy browser check on both live URLs, and report URLs and what remains.

**Definition of done for this batch:** every PDF button downloads in one tap; the weekly parts and Watchtower titles arrive from wol.jw.org through a real, successful CI run; the admin Home shows every group's report link first and three fresh suggestions on each open; weekend scheduling warns when a talk number was last given; install tries the browser prompt for 5 seconds before instructions; the alignment audit reports zero findings across the matrix; each theme uses its own fonts including Indic scripts; and the public site is a fast, minimal black-and-white page with mockups, subtle animation, 13 languages and no "fictional records" section.