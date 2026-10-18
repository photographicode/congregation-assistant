# V3 — PDF ALIGNMENT + SHIP THE REFINEMENT (crisp, credit-safe)

These orders add to the earlier polish files; where they conflict, **this file wins**. **No new features. No new translation extraction. No questions.** Push after every numbered step to `v3/resume`.

## 0. Credit rules (hard limits — you keep hitting the usage cap)
1. Use `grep`/line ranges, never re-read whole large files. Print only the last 20 lines of logs. Run **one spec file at a time**; no rebuild while tests are reading the build.
2. **Per batch: one sampled audit, ≤ 300 views** (widths 320, 390, 768, 1024, 1440 × text 100/200% × themes mono-light, lagoon-glass, neon-night × only the screens you changed). The full matrix runs **once in GitHub Actions**; read its summary JSON only.
3. **Freeze i18n**: no more string extraction or locale work this session. Keep what exists.
4. A fix that fails twice → write it to `docs/POLISH-REPORT.md` as open and move on.
5. Images: ≤ 6 total (one contact sheet of PDFs, one of UI).

## 1. Split the release so you can ship (R1 now, R2 later)
The public deploy already serves the website at the root and the native app at `/app/`, so V1 parity is **not** a blocker for R1.
**R1 (deploy as soon as these pass):** gender field fix · restored report form · AP review + Revoke + Undo + audit (data preserved, AP totals not inflated) · custom OCLM picker · repeat-assignment caution · auxiliary-classroom hiding · dialog/toast/banner fixes · **PDF fixes in §2** · existing security, direct-download, assistant zero-network and role/RLS checks.
**Not R1 blockers (leave for R2):** billing/pricing page, website visual-lock test, parity matrix completion, translations, custom-domain switch, any unfinished V1 port. If **offline report submission** is not safe, ship the existing online behavior with a clear "You're offline — your report is kept on this device and will not be sent until you reconnect" message and a manual retry; never ship a half-working queue.
Ship R1 when: its tests are green, the sampled audit has **no HARD findings** (overflow, clipped/unreachable control, overlap hiding content, dialog with no close, console error, contrast failure, data loss), and the PDF tests in §2 pass. Merge to `main`, deploy both repos, run the post-deploy browser check, record commits/URLs.

## 2. PDF review and fix — **Noto Sans everywhere, precise alignment**
Owner report: the PDFs are misaligned. Fix it at the root with one shared layout engine.

### 2.1 Fonts
- **Every PDF uses Noto Sans** (Regular + Bold, embedded as static TTF subsets; never a variable font, never Helvetica). Indic scripts use the matching **Noto Sans <script>** (Devanagari, Tamil, Malayalam, Kannada, Telugu, Bengali/Assamese, Gujarati, Gurmukhi, Odia) chosen **per text run by Unicode range**; digits and punctuation stay Noto Sans. Fonts are bundled in the repo (OFL), never fetched at runtime.
- Test: extract fonts from every generated PDF — all must be `NotoSans*`; zero `.notdef`/missing glyphs for the Latin + Indic samples.

### 2.2 One layout engine (`packages/pdf/layout.ts`), no ad-hoc offsets
- Geometry for each document lives in a table of **cells** `{x, y, w, h, align, valign, padding, fontSize, bold}` in points; every text draw goes through `drawTextInCell()`.
- **Measure with the real font** (`font.widthOfTextAtSize`, ascent/descent/cap-height from the font) — and measure each run with the **same font that draws it** (mixed-script runs measured per run, then summed).
- **Vertical alignment by baseline**: compute the baseline from the cell's box and the font's cap-height/x-height so all cells in a row share one baseline within 0.25 pt; never position by guessed `y` offsets.
- **Horizontal**: left/center/right with fixed inner padding (≥ 2 pt); numbers right-aligned in numeric columns with tabular digits.
- **Overflow policy**: shrink-to-fit down to a minimum size (7 pt), then wrap (word boundaries, max lines per cell), then ellipsis. Text must never cross a cell border or run outside the page margin.
- Multi-line blocks (remarks, comments) use one line-height (1.25 × size; 1.5 × for Indic) and are top-aligned inside the cell.
- Pagination (emergency list, rosters): repeat table header on every page, no orphan header, no split row, consistent margins.

### 2.3 Documents to fix (all of them)
S-21 (single and batch) · S-89 (student + assistant copies, 1/2/3 classrooms) · S-140 (with and without auxiliary classroom; crimson/slate/gold, dark text on gold) · S-88 and S-3 as V1 produces them · family-wise Emergency Contacts · duty rosters · schedules/large-print · CO Visit Pack parts. **Preserve the official layouts, positions and wording** as defined by the owner-supplied references and `docs/s21-alignment-review.md`; only correct alignment, fonts, overflow and spacing. Keep direct download (no preview).

### 2.4 Verify numerically (cheap) before looking at images
Write `scripts/pdf-geometry.ts` using pdf.js `getTextContent` to extract every text run `{page, x, y, w, h, font, size}` and assert:
1. All fonts are Noto Sans family.
2. **Same-column left edges equal** within 0.25 pt; **same-row baselines equal** within 0.25 pt; right-aligned numbers share one right edge.
3. No run exceeds its cell (±0.25 pt) or the page margin; no two runs overlap.
4. Label/value pairs keep consistent gaps; header text is centered on its cell center within 0.5 pt.
5. Page count, margins and orientation match the golden expectations (A4 and Letter).
Fixtures to include: 45-character names, Malayalam/Tamil/Hindi names, very long remarks (continuation), all 12 months, quarter-hour values (0.25/0.5/0.75), blank fields, a 7-member family, 500 emergency rows, 3-classroom S-140, S-89 for every part type.
Store the extracted geometry as JSON snapshots in `tests/pdf-geometry/`; changes must be reviewed. Keep the existing golden-parity tests green (text, page count) and add a 150-dpi per-page image diff with a small tolerance.
Then render **one contact sheet** (S-21, S-89, S-140, S-88, Emergency, a roster; English + one Indic sample) and look at it once. Fix only what the numbers or the sheet show; re-render once.

## 3. Remaining R1 items (only if still open; otherwise skip)
1. OCLM picker: Home/End/type-ahead pass; stays inside the viewport at 200% text on short screens; works for classroom counselors.
2. Auxiliary classroom hidden in **every** output: app schedule, print, S-140 PDF, live link; saved auxiliary drafts preserved when toggled off and restored when on; excluded from published output.
3. Quick regression on: report submit/correct/duplicate-click, AP revoke/undo, repeat assignments after reload, every dialog closing by button/Esc/outside/navigation.

## 4. Deliver
`docs/POLISH-REPORT.md`: deployed commits and URLs, HARD gates passed (counts), PDF geometry results, open items and what is **not** verified (real phones, real printers, WhatsApp, Razorpay). Then list R2 items in order: front-door cleanup → pricing config/page → website visual-lock test → domain switch → translation coverage → billing.

**Done when:** R1 is deployed and verified; every PDF is Noto Sans with measured, consistent alignment (geometry tests green); work is pushed; and R2 is written down.