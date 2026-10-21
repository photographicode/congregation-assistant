# DESIGN.md — Congregation Assistant design system

> **Agents: read this file before touching any UI.** It follows the Stitch / awesome-design-md nine-section format. It encodes three references that apply to every task in this project: **(1) Taste Skill** (premium, anti-generic art direction, a real-browser check, quiet panels, aligned figures, colour spent on data), **(2) Vercel Web Interface Guidelines** (focus, forms, animation, typography, content handling, touch, performance, i18n), **(3) awesome-design-md** (this document structure). Tokens follow DTCG naming. If a rule here conflicts with an older instruction, **this file wins for visuals**.

---

## 1. Visual Theme & Atmosphere
**Product:** a calm, trustworthy workbench for congregation secretaries and overseers (people, reports, S-21, schedules, duties, attendance). Used on phones, often by older users, often in large-text mode.
**Mood:** quiet, premium, unhurried. Whitespace and hierarchy do the work; colour is spent on **data and state**, not decoration. Familiar to people who use jw.org and JW Library: content first, large readable type, bottom tabs on phone.
**Density:** two axes the user controls — **Experience** (Calm / Balanced / Lively) and **Theme** (mood). Experience changes richness (charts, motion, background), never capability.
**Art direction (Taste Skill):** one clear idea per screen; no template look (no gradient-orb heroes, no emoji icons, no card-soup, no identical rounded rectangles everywhere). Each screen has a clear title on first view, equal margins, no section shoved to one side, no random blank stretches. Dashboards and app screens use **quiet panels, aligned figures and honest data**; navigation folds away on phones.
**Themes (11):** `mono-light`, `mono-dark`, `paper`, `lagoon-glass`, `neon-night`, `sunset-pop`, **`eclipse`** (black-and-white Sunset Pop), **`eclipse-night`**, `neo-brutal`, `forest`, `aurora`. Tokens live in `themes.css`, `v3-eclipse-theme.css`, `v3-dialog-layer.css`. Mapping to Taste Skill styles: Eclipse/Sunset ≈ *soft* (soft contrast, whitespace, spring motion); Mono ≈ *minimalist* (editorial, restrained); Neo-Brutal ≈ *brutalist*; Glass themes ≈ *soft with depth*.
**Brand constraints:** independent and unofficial; no JW logos/trade dress; no emoji; icons are Lucide (inline sprite).

## 2. Color Palette & Roles (semantic; never raw hex in components)
| Token | Role |
|---|---|
| `--bg`, `--bg-image` | page canvas and its gradient layer (a fixed pseudo-element, never `background-attachment: fixed`) |
| `--surface`, `--surface-solid`, `--surface-2` | panels/cards (glass in glass themes), opaque fallback, secondary tint |
| `--text-1/2/3` | primary / secondary / tertiary text (≥ 7 / 4.5 / 4.5:1) |
| `--accent`, `--text-on-accent`, `--link` | primary action, text on it, links |
| `--ok --warn --danger` (+ `--tone-*`) | state; always paired with icon + text |
| `--border`, `--border-w`, `--shadow-card` | outlines and card elevation |
| **Overlay layer:** `--dialog-bg/-head/-border/-bw`, `--scrim`, `--scrim-blur`, `--shadow-dialog`, `--input-bg`, `--input-border` | dialogs, sheets, popovers, toasts, inputs — **opaque and visibly separate from the page** |
| **OCLM scope only:** `--oclm-crimson #7E0024`, `--oclm-slate #575A5D`, `--oclm-gold #BE8900`, `--oclm-gold-ink #9A6B00` | S-140 colours inside the OCLM schedule, its print/PDF and live link only. White text only on crimson, slate and **gold-ink** (4.69:1); text on the lighter official gold is dark `#1F1600` |
**Rules:** text never sits directly on a gradient — it sits on a panel; contrast is measured on the **composited** colour over the brightest gradient behind it; hover/active/focus **increase** contrast (Vercel).
**Button shades (ease of access):** primary = solid accent; **secondary = tonal** (accent at 12% on surface); tertiary = ghost text; outline; **danger solid** and **danger tonal**; **success tonal**; neutral tonal. Row actions use tonal shades (S-21 tonal-accent, Remind tonal-warn, Revoke tonal-danger) so every action is visibly a button.

## 3. Typography Rules
Self-hosted OFL fonts, `font-display: swap`, metric-matched fallbacks, Latin subset + Indic scripts on demand (`unicode-range`).
| Theme | Display | Body | Numbers/labels |
|---|---|---|---|
| mono-light / mono-dark | Instrument Serif | Inter | JetBrains Mono |
| paper | Newsreader | Source Sans 3 | — |
| lagoon-glass | Outfit | Inter | — |
| neon-night | Space Grotesk | Inter | JetBrains Mono |
| sunset-pop / **eclipse / eclipse-night** | Bricolage Grotesque | DM Sans | — |
| neo-brutal | Archivo Black | Inter | Space Mono |
| forest | Fraunces | Source Sans 3 | — |
| aurora | Sora | Inter | — |
Indic: Noto Sans <script> (Noto Serif where the theme is serif and the script exists), `line-height ≥ 1.7`, no letter-spacing. **PDFs: Noto Sans only.**
**Scale (rem × `--text-scale`):** 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 1.875 · 2.25 · 3 (greeting). Headings `text-wrap: balance`; paragraphs `pretty`. **Figures use `font-variant-numeric: tabular-nums`.** Typographic punctuation: curly quotes, the ellipsis character `…`, non-breaking space between a number and its unit (`12.5 h`).
**Inputs are ≥ 16 px on mobile** (prevents iOS zoom). Never disable zoom.

## 4. Component Stylings (every interactive component defines all states)
States: default · hover (`@media (hover:hover)`, +contrast) · `:active` (scale .98) · `:focus-visible` (2 px ring, never `outline:none` without replacement; `:focus-within` for compound controls) · disabled (`aria-disabled`) · loading (inline spinner, width unchanged) · selected (`aria-pressed`/`aria-selected`) · error.
- **Button:** heights 36/44/52, radius = `--radius-s`, tonal/solid/ghost/outline/danger variants (see §2). `touch-action: manipulation`. Hit area ≥ 44 px (48 px in the public report form).
- **Select/Picker (ours, everywhere — no native `<select>`):** ARIA combobox + listbox; trigger shows value + avatar/icon; popover (≥ 600 px) or bottom sheet (phone); search field; sections *Suggested / Everyone / Needs a check / Unavailable*; rows show name, **"6 weeks ago"** style recency (never a raw date; tooltip has the date), and a caution chip when needed; keyboard ↑ ↓ Home End type-ahead Enter Esc; stays inside the viewport; virtualized > 100 rows. For ≤ 5 options use a **segmented control or chips** instead of a menu.
- **Inputs:** visible label, `autocomplete`, correct `type`/`inputmode`, inline error with fix, `--input-bg` so fields never blend into panels, paste never blocked, **submit is never disabled** — incomplete submits surface validation and focus the first error.
- **Dialog / Sheet:** opaque `--dialog-bg`, 1–3 px `--dialog-border`, `--shadow-dialog`, scrim, header with 4 px **tone strip** (`data-tone="info|success|warning|danger"`), sticky footer, visible 44 px Close, Esc, focus trap/return, scroll lock released, one at a time. Prefer inline panels, popovers and toasts for simple actions.
- **Toast:** opaque, tone strip, auto-dismiss 5 s (8 s with Undo), pauses on hover/focus, max 3, close button.
- **Table (spreadsheet style):** borderless, `tabular-nums`, sticky header, row hover, zebra optional, sortable headers (buttons with `aria-sort`), faded rows via `--text-3` (never `opacity`) , row actions as tonal buttons, `content-visibility: auto` + virtualization beyond 50 rows.
- **No disclosure widgets:** no `<details>`, no chevron-to-reveal. Content is shown flat; grouping uses sections, tabs, segmented controls or inline panels. Only elements that look like buttons are clickable; non-interactive text is never styled like a link.
- **Navigation:** phone bottom tabs (5) with a **More grid of every tool**; tablet rail + master–detail; desktop grouped sidebar (sticky, bounded, scrollable). Skip link, one `<h1>` per page.
- **Skeletons** mirror final content exactly; empty/sparse/dense/error states are designed for every list.

## 5. Layout Principles
4 px spacing scale (4/8/12/16/24/32/48/64); one container padding per breakpoint; max content width 1200 px (1440 wide). Grid rows `align-items: stretch`. Cards in a row have equal height. Equal outer margins; the first screen always shows a clear title. **Home (Gemini-style welcome):** centered column (max 760 px): greeting → prompt bar → suggestion chips → *Group report links* → **People table** → RP / AP lists → AP review. Figures aligned right with tabular digits. Colour used for data (status, counts), not decoration.
**Frame checks (Taste Skill):** title visible on first screen · equal margins · no section shoved to one side · no blank stretches > 96 px · aligned figures.

## 6. Depth & Elevation
Layers (z-tokens): page 0 < sticky nav 20 < popover 30 < scrim 35 < dialog 40 < toast 50. **Page cards** may be glass; **overlay layers are never glass** (opaque, bordered, shadowed). Max three `backdrop-filter` layers on screen (top bar, bottom bar, hero). Shadows are theme tokens; Neo-Brutal uses hard offsets; Mono uses borders instead of shadows.

## 7. Do's and Don'ts
**Do:** use tokens only · measure text on the composited surface · make every action a visible button · show recency as "N weeks ago" · keep forms forgiving · design empty/error/loading states · test 320–1920 px at text 100/130/200% · respect `prefers-reduced-motion/-contrast/-transparency`.
**Don't:** use emoji/glyph icons · `outline:none` without replacement · `transition: all` (list properties; transform/opacity preferred) · native `<select>` · `<details>`/chevron reveals · colour-only state · text on bare gradients · fixed-pixel heights for content · opacity for "disabled/faded" text · layout reads in render · generic template looks.
**Anti-slop test:** if the screen could belong to any other app by swapping the logo, it needs a stronger idea, hierarchy or data.

## 8. Responsive Behavior
Phone <600: bottom tabs, one primary action, sheets, cards with visible action rows, inputs ≥ 16 px. Tablet 600–1023: icon rail + master–detail. Desktop ≥1024: sidebar + content + optional inspector. Detect text scale / contrast / motion / transparency and adapt (Layout Doctor); user choice wins. Short landscape: slim side rail, collapsed hero. Safe areas, `dvh`, keyboard-aware (`visualViewport`).

## 9. Agent Prompt Guide
**Quick reference:** background `var(--bg)`, panel `var(--surface)`, overlay `var(--dialog-bg)`, text `var(--text-1/2/3)`, accent `var(--accent)`, radius `var(--radius-*)`, motion `var(--dur)` + `var(--ease)`.
**Ready prompts**
- *"Build/modify `<screen>` following DESIGN.md. Use only tokens; define all component states; use our Select, never native; no `<details>`; figures tabular; check at 320/390/768/1024/1440 and text 100/200% before you finish."*
- *"Review `<files>` against the Vercel Web Interface Guidelines: focus, forms, animation, typography, content handling, touch, performance, i18n. Report `file:line`."* (`scripts/vercel-guidelines-audit.mjs` automates the greppable ones.)
- *"Audit `<screen>` with the Taste Skill frame checks and the anti-slop test; list three fixes; apply them; re-check once."*
**Review checklist (every PR):** tokens only · states complete · keyboard + screen-reader path · alignment audit zero findings · contrast on composited surfaces · no emoji · no native select · no disclosure widgets · skeleton mirrors content · `translate="no"` on names/numbers/user text · one `<h1>`.