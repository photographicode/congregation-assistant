# V3 FINAL ORDERS — one repo, measured PDF fixes, separated dialogs, Aurora/glass, real interactivity, bug-bash

Refinement only. **No new features.** These orders override earlier ones where they conflict. Do not ask questions. Push to `v3/resume` after **every numbered item**; merge to `main` and deploy only when the gates in §8 are green.

## 0. Method: "arena" (decide by comparing options, then act)
For each problem below I compared candidate solutions and **chose the winner** (the tables show why). Do not re-debate; implement the winner. If you find a *better* option with evidence, write it in `docs/DECISIONS.md` and proceed.

**Credit rules:** `grep`/line ranges (no whole-file reads); last 20 lines of logs; one spec at a time; **sampled audits only while working** (widths 320, 390, 768, 1024, 1440 × text 100/200% × themes mono-light, lagoon-glass, aurora × touched screens, ≤ 300 views); the full matrix runs once in GitHub Actions and you read its summary JSON only; images ≤ 6 total; a fix that fails twice → log it and move on.

---

## 1. TWO REPOS → ONE (they publish the same app twice)
**Evidence:** `docs/DEPLOYMENT-2026-10-17.md` says both repositories are live with the same app ("Source app mirror" and "Public snapshot"); 17 workflows overlap (GitHub Pages **and** Cloudflare Workers deploys, plus several manual/legacy matrices); `staging/`, `public-site-preview/`, `archive/`, `experiments/`, `v2/`, V1 root files and `app-v2-bridge.js` still sit in the tree (~12 MB).

| Option | Single source of truth | Old links keep working | CI cost / drift risk | Effort | Verdict |
|---|---|---|---|---|---|
| A. Keep both, sync | no | yes | double deploys, drift | medium | ✗ |
| **B. One canonical repo + redirect stub in the other** | **yes** | **yes** | **half the CI, no drift** | **low** | **✔ choose** |
| C. Delete the second repo | yes | **breaks shared links** | low | low | ✗ |

**Do:**
1. **Canonical repo = `photographicode/congregation-assistant`.** One Pages site from it: website at `/`, app at `/app/`. Remove every step that pushes to or builds a "public snapshot" in `Congregation-Assistant_Public`. Update links, manifest (`start_url/scope/id`), service-worker scope, share links and `deployment.json` to the canonical URLs (from config; keep `BASE_URL`/`CUSTOM_DOMAIN_READY` switches).
2. **After** the canonical deploy is verified live, replace the contents of `Congregation-Assistant_Public` with just `index.html` + `404.html` that redirect (meta refresh + JS) to the canonical URL, **preserving the path** (e.g. `/app/...`). Keep it 90 days, then archive. Never push the full app there again.
3. **Workflows: 17 → 5.** Keep/merge into: `ci.yml` (lint, typecheck, unit, build; PR + push), `e2e.yml` (browser, layout, overlay, interaction, a11y audits: sampled on PR, full on schedule/dispatch), `pdf.yml` (golden + geometry contracts), `deploy.yml` (single deploy to Pages; optional Cloudflare job only when `DEPLOY_TARGET=cloudflare` and secrets exist; includes post-deploy verification and a `workflow_dispatch` "verify custom domain" job), `scheduled.yml` (meeting fetch + security scans). **Delete** the rest (`acceptance`, `cutover-layout`, `demo-screens`, `deploy-app`, `deploy-site`, `github-pages`, `google-readiness`, `published`, `r1-full-matrix`, `r1-report-delta`, `v2-acceptance`, `v3-verification`, `verify-production`, old `deploy`) after moving any still-useful step.
4. **Remove dead trees** after confirming no test/build imports them (grep first): V1 root files (`index.html`, `app*.js/css`, `pdf-tools.js`, `public-links.js`, `weekend*.{html,js}`, `service-worker.js`, `offline.html`, `manifest.webmanifest`, `tailwind.config.cjs`, `_config.yml`), `app-v2-bridge.js`, `v2/`, `v2-screen-flags.json`, `staging/`, `public-site-preview/`, `archive/`, `experiments/`. **Verify tag `v1-final` exists** (create it from the last commit that still contains V1 if missing) and that `tests/golden/v1/` stays. Add `scripts/check-no-legacy.mjs` to CI.
5. Rewrite `README.md` (what it is, run/test/build/deploy, architecture, env vars, security), refresh `AGENTS.md`, and delete stale status docs (merge anything valuable into `docs/`).

---

## 2. PDF REGRESSIONS — measured on `tests/golden/r1` vs `tests/golden/v1`
V1 was right; the new Noto-template PDFs regressed. **Measured evidence** (poppler `pdftotext -bbox`, 120-dpi renders):
| # | Defect | V1 | Now |
|---|---|---|---|
| P1 | **S-88 title is off-centre** | +0.1 pt | **−27.0 pt** |
| P2 | **S-21 month labels** are bigger and inconsistent in size/vertical position | 9.71 pt tall, all equal | **12.84–13.86 pt**, varying (March/May smaller) |
| P3 | **S-21 check marks** (Male/Female/Other sheep/Anointed and the "Shared in Ministry" column) are drawn as text glyphs and sit **off-centre** (low/right) in their boxes | centred | off-centre |
| P4 | S-21 label/value baselines differ (`Name:` vs value; birth/baptism lines); header sub-labels use mixed sizes ("Bible Studies" larger than "Shared in Ministry") | consistent | inconsistent |
| P5 | **S-88** month labels sit higher than the numbers in the same row; "Service Year / 2025–2026" header lines mis-aligned; 3-line headers too tight ("Total"/"Attendance" boxes overlap 3.0 pt) | clean | misaligned |
| P6 | **S-3** Congregation-name and Month values are not on the dotted-line baseline and are larger than their labels | aligned | off |
Emergency list: acceptable (check the fixture label "Family N family").

**Arena for the fix:** (1) patch each offset by hand — fast but regresses again ✗; (2) **geometry-vs-V1 diff gate + shared layout API, fix to match V1 geometry** — precise, repeatable ✔; (3) redraw all forms from scratch — slow, risks the official layouts ✗. **Do (2):**
1. In `packages/pdf`, every text/box draw goes through `drawTextInCell()` using `template-cells.json` geometry; vertical position from the font's **cap-height/baseline** so all cells in a row share one baseline (±0.25 pt); horizontal centring uses measured width of the exact font/run.
2. **Check marks and tick boxes are vector paths** (two stroked lines) computed from the checkbox rectangle's centre — never text glyphs (`✓`).
3. **Restore V1 geometry:** read V1's S-21/S-88/S-3 code in `pdf-tools.js` (tag `v1-final`) and copy font sizes, baselines, centring and padding exactly (month labels uniform at V1's size; S-88 title centred on the page/table centre; S-3 values sit on the dotted baseline at label size or V1's size). Fonts stay **Noto Sans** (Regular/Bold) everywhere; Indic runs use Noto Sans <script>.
4. Headers with 2–3 lines use `lineHeight ≥ 1.2 × size` (Indic 1.5×) so line boxes never overlap.
5. **New gate `scripts/pdf-vs-v1.mjs`** (pdf.js `getTextContent`): match runs by normalized text/order between `golden/v1` and regenerated output for S-21, S-88, S-3 and assert **centre-x within 1.0 pt, baseline-y within 0.75 pt, font size within 0.2 pt** (except documented intentional changes). Add the generic checks from `V3-PDF-AND-SHIP.md` §2.4 (same-column edges, same-row baselines, no overflow/overlap, all fonts `NotoSans*`). Add **property-based tests** (`fast-check`, MIT): random names (1–60 chars, Latin + Indic), 0–12 months, random hours (multiples of 0.25), random remarks length → no overflow/overlap, baselines equal.
6. Also generate and measure **S-89** (student + assistant, 1/2/3 classrooms) and **S-140** (with/without auxiliary; dark text on gold). Same gates.
7. Regenerate `tests/golden/r1/*`, commit, then render **one** contact sheet (S-21, S-88, S-3, S-89, S-140, Emergency) and look once.

---

## 3. DIALOGS LOOK LIKE ONE THING WITH THE PAGE → separate layer + colors
**Evidence:** `packages/ui/theme-bridge.css` styles `.card,.dialog` with the **same** `background:var(--surface)`, border, shadow and `backdrop-filter`; glass themes make `--surface` translucent, so a dialog is literally "another card on the same glass".

**Arena:**
| Option | Separation | Keeps theme character | A11y/contrast | GPU cost | Verdict |
|---|---|---|---|---|---|
| A. **Opaque overlay layer** (own tokens), dark/colored scrim, tone strip, sticky footer | **strong** | yes (per-theme border/shadow/scrim) | **verified ≥ 5.7:1** | **low** | **✔** |
| B. More blur on glass | weak (still glass) | yes | text over moving gradient | high | ✗ |
| C. Full-screen pages instead of dialogs | strong | n/a | fine | low | ✗ (loses context; contradicts earlier decisions) |

**Do (A):**
1. Add the provided **`v3-dialog-layer.css`** to `packages/ui` and import it **after** `theme-bridge.css`. **Remove `.dialog` from the shared `.card,.dialog{…}` rule** so dialogs stop inheriting card glass.
2. Use the tokens everywhere overlays appear: `.dialog-overlay` (scrim + blur per theme), `.dialog` (opaque `--dialog-bg`, `--dialog-border`, `--shadow-dialog`), header (`--dialog-head` + 4 px **tone strip**), sticky footer, `.assignment-options`/`.popover`/`.menu`/`.toast` (opaque, same layer), inputs (`--input-bg/--input-border` so fields don't blend into the surface).
3. **Colors with meaning:** add `data-tone="info|success|warning|danger"` to the shared Dialog/Toast API. Destructive confirms use `danger` (red strip, red primary button), saved/complete use `success`, cautions use `warning`, everything else `info` (accent). Never rely on color alone: keep an icon + text. Mono themes keep black/white and rely on the heavier border and icon.
4. Order of layers via the z-index tokens: page < sticky nav < popover < overlay < dialog < toast. Dialogs sit **above** the bottom bar; scrim covers it.
5. Tests (computed styles, all 9 themes): dialog background alpha = 1; overlay alpha ≥ 0.40; border width ≥ 1 px; box-shadow ≠ none; header strip present; contrast of text-1/2/3 and primary button on dialog ≥ 4.5:1; toast/popover same checks. Visual: one contact sheet of an open dialog in all nine themes (1 image).

---

## 4. AURORA (and Lagoon) glass fixes
Static analysis of Aurora: translucent `--surface: rgba(18,11,46,.66)` everywhere, `body{background-attachment:fixed}` + 24 px blur on every card. Fix:
1. **Replace `background-attachment: fixed`** with a fixed pseudo-layer (`body::before{content:"";position:fixed;inset:0;z-index:-1;background:var(--bg-image)}`) — avoids iOS repaint jank.
2. **Limit `backdrop-filter`** to ≤ 3 layers on screen (top bar, bottom bar, hero). Cards/lists use an **opaque tinted surface** (≥ 0.86 alpha) with the glass border; on phones and `prefers-reduced-transparency` use solid.
3. **Contrast on the real composite:** for every text token (text-1/2/3, link, placeholder, disabled) compute against the surface alpha-composited over the **brightest gradient area behind it**; all ≥ 4.5:1 (text-1 ≥ 7:1). Fix the **backdrop** stops if needed, not the text tokens.
4. Inputs, tabs, chips and rows must be distinguishable from the panel (tokens `--input-bg`, `--surface-2`); focus ring visible on glass (2 px accent + 2 px offset contrasting outline).
5. Performance gate: 4× CPU-throttled trace keeps ≥ 55 fps on scrolling Home/People in Aurora and Lagoon.
6. Run the sampled audit on Aurora and Lagoon for Home, People, Reports, Midweek, Settings; list every defect found in `docs/POLISH-REPORT.md` with evidence and fix all HARD ones.

---

## 5. INTERACTIVITY — make it feel alive (refinement of states, not new features)
**Problem:** controls look static (V1 had hover/press life). **Arena:** per-screen tweaks ✗ vs **one shared state system + an automated audit** ✔.
1. **State system for every interactive element** (`button, [role=button], a, .chip, .row, .card-link, .tab, .switch, .segmented, .assignment-option`): `cursor:pointer`; `transition` on transform/background/border/shadow using `--dur/--ease`; `@media (hover:hover)` **hover** = accent-tinted background (8–12%) + 1 px lift for primary/cards; **`:active`** (works on touch) = `scale(.98)`; **`:focus-visible`** ring; **disabled** = 50% + `not-allowed` + `aria-disabled`; **loading** = inline spinner, width unchanged; **selected** = accent fill/`aria-pressed`.
2. **Feedback moments:** save → a 200 ms check-draw on the button; toast slides in; counts animate once; lists get a short stagger on first paint; sheets/dialogs spring open/closed (≤ 220 ms); route changes fade (≤ 150 ms); skeleton shimmer for loading; row hover reveals actions on desktop, swipe on touch. All disabled under `prefers-reduced-motion` (state changes remain, motion removed).
3. **Audit `scripts/interaction-audit.ts`** (Playwright): on each key screen, for every interactive element assert (a) `cursor:pointer`; (b) hover (emulated) changes at least one of background/border/shadow/transform; (c) `:active` differs; (d) focus-visible outline exists with ≥ 3:1 contrast; (e) a transition duration > 0 unless reduced motion; (f) tap target ≥ 44 px; (g) no layout shift on hover/loading. Zero HARD findings (b, d, f).

---

## 6. BUG-BASH ("debug till it's hell") — add the tests, run once in CI, fix every HARD finding
Create `tests/hell/` (each spec ≤ 2 min; run in `e2e.yml`, not locally):
1. **Data integrity:** report submit/correct/duplicate-click; AP revoke/undo (totals honest); group delete/archive; household reporting; import + undo; draft conflicts; migrations idempotent (apply twice); RLS tenant-isolation and role matrix (admin, OCLM, weekend, group overseer, attendance, duties, publisher, household, anonymous, SuperAdmin).
2. **Chaos:** offline mid-submit; slow/lossy network; HTTP 500/timeout injection; expired session; concurrent edits; clock skew/DST/service-year rollover; 500 publishers × 200 weeks.
3. **Input fuzz:** 200-char names, leading/trailing spaces, diacritics, Indic, RTL, zero-width characters, pasted Excel values (`1,5`, `1.5 h`), 0.25 steps, negative/huge numbers, XSS payloads in names/comments, CSV-injection strings in exports.
4. **Security:** CSP/headers, XSS sweep, role-escalation attempts, anonymous-RPC throttling, link-token brute force, secret scan on tree + history.
5. **Accessibility:** axe on every route/dialog/theme; keyboard-only flows; focus order/return; forced-colors; reduced motion.
6. **Browsers:** Chromium + WebKit + Firefox smoke of the critical flows.
7. **Hygiene:** zero console errors/warnings, zero failed network requests, no unhandled rejections, no broken internal links, no orphaned overlays.
8. **PDFs:** property-based geometry tests from §2.
Record results in `docs/qa/BUG-BASH-REPORT.md` (found / fixed / open, with severity). **Sev1/Sev2 must be zero** to ship.

---

## 7. Remaining refinement items (only if still open)
OCLM picker keyboard (Home/End/type-ahead) and viewport placement at 200% text; auxiliary classroom hidden in every output (app, print, S-140, live link) with drafts preserved; offline report queue **only if safe** (else clear online-only message); text-wrap defects counted **only per the definition in `V3-POLISH-RESUME.md` §2** (never shorten copy to satisfy a detector).

## 8. Gates, deploy, report
**HARD gates:** no horizontal overflow; no clipped/unreachable control; no overlap hiding content; every overlay dismissible; zero console errors; contrast pass (real text/surface pairs incl. dialogs and Aurora); data-integrity and RLS tests green; PDF gates (§2) green; interaction audit (b, d, f) green; Sev1/Sev2 = 0.
**Deploy:** merge → canonical repo Pages → post-deploy browser check (site `/`, app `/app/`, service worker takeover, assistant zero network, direct download) → then convert `Congregation-Assistant_Public` to the redirect stub (§1.2). Update `docs/POLISH-REPORT.md` (commits, URLs, gate counts, open items, what is **not** verified: real phones/printers/WhatsApp/Razorpay).

**Done when:** one repo publishes one site; every PDF matches V1 geometry within tolerance with Noto Sans and vector check marks; dialogs, popovers and toasts are visibly separate, colored layers in all nine themes; Aurora/Lagoon are readable and smooth; interactive elements respond visibly; the bug-bash reports zero Sev1/Sev2; and everything is deployed and verified.