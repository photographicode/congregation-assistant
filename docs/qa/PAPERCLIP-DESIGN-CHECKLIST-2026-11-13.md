# Paperclip design requests: checklist and cross-examination

13 November 2026. Source: Paperclip PHO-10 → PHO-13 `design-review.md` (Nova, 9 Nov; 25 findings), handoff `design/handoff.md` (PHO-36), build PHO-37/PHO-38. Files: `F:\Claude\webstudio\sites\congregationassistant-redesign\design\design-review.md`, `...\congregationassistant-studio\design\`.
Checked against the **real app** (`congregation-assistant`, local dev, admin demo) and `dist-site` — not the Paperclip prototype.

## Cross-examination of Paperclip's "done"
- PHO-10, PHO-13 and PHO-37 are marked **done**. That is not true of the product.
- All the build work targeted a **static prototype** in `webstudio/sites/congregationassistant-studio`, not this repo. Nothing from PHO-37 reached `congregation-assistant`.
- The handoff splits the build into Chunks 0–7. Only **Chunk 0** (PHO-38, tokens) ever became an issue. Chunks 1–7 were never created.
- PHO-38's last real action was changing a date in a `tokens.css` comment. Its prior run ended in "exhausted the bounded… repair". PHO-37's last three comments are "ACP agent reported a terminal service failure", then it was marked done.
- The prototype work is uncommitted in `webstudio` (6 modified, 4 untracked files under `congregationassistant-studio`).
- Some findings are stale or wrong for the real app: language routes exist (P0-2), the site has no placeholder quotes (P0-3).

## Checklist (real app)
Legend: ✅ done · 🟡 partial · ❌ pending

| ID | Request | Status | Evidence |
|---|---|---|---|
| P0-1 | Enter report never opens an already-reported person; explicit "Edit report" + "editing" banner | ❌ | Reports → Enter report opens Daniel Thomas pre-filled (3 studies, 50 h), no banner. "Edit report" row buttons exist. |
| P0-2 | No dead language links; `hreflang`, `x-default`, Urdu `dir="rtl"` | ✅ | `dist-site/{as,bn,…}` exist; 14 `hreflang` incl. `x-default`; `dist-site/ur` has `dir="rtl"`. |
| P0-3 | No placeholder testimonials | ✅ | No "placeholder"/"testimonial"/"lorem" in `apps/site`, `dist-site/index.html`. |
| P0-4 | Report submit visible on phone (sticky) | ❌ | Submit button is `position: static` at the form end. |
| P0-5 | One brand colour across app, site, manifest, icon | ❌ | `dist/manifest.webmanifest` `theme_color #3E58A8` (navy, from `scripts/build-v2.mjs`); app Eclipse is black/white; territory manifest `#E4E8EE`. |
| P0-6 | One consistent trust/security block | 🟡 | "Mumbai, India (Supabase ap-south-1)" in locale copy; not re-audited across hero/FAQ/security page. |
| P1-1 | No hub pages; nav opens the working screen | 🟡 | Reports and Meetings open working screens. People still opens a "Choose what you want to do" card hub. |
| P1-2 | Nav items are real links with `aria-current` | 🟡 | `aria-current="page"` present; items are still `<button>` (`packages/ui/AppShell.tsx`), so no open-in-new-tab. |
| P1-3 | One canonical URL per screen | 🟡 | `?section=people` → `?screen=people&tool=publishers`; no build-up seen, but two param schemes. |
| P1-4 | Compact ~56 px people rows, aligned actions, role filter | ❌ | Publisher rows 84–114 px; S-21/Options/Edit not column-aligned; search only, no role/group filter. |
| P1-5 | Remind wherever a missing person appears | ❌ | Home has Remind; `Reports.tsx` has no remind. |
| P1-6 | One control language (toggles, steppers, chips) | ❌ | Report form: checkbox tiles + plain number boxes. |
| P1-7 | Form starts at top; no "Cancel report" | ❌ | Opens scrolled down the page; button text "Cancel report" (`refine.cancelReport`). |
| P1-8 | Hours only after the pioneer switch | ❌ | Hours field always shown. |
| P1-9 | Meetings copy matches actions; "Wed 11 Nov 2026"; label "Conductor" | 🟡 | No dd-mm-yyyy dates found. "Import the week's parts" still shown with no Import button; `oclm.student` still "Student / assigned brother". |
| P1-10 | Each feature in one place | ❌ | My account ×3 (rail footer, avatar, More); assistant ×3 (top bar, More, Home bar). |
| P1-11 | Territories reachable from the app | 🟡 | Separate subdomain app; linked from sign-in and Settings, not from the app nav. |
| P1-12 | `:focus-visible` only; one scroll; normal placeholders; compact phone header | 🟡 | Phone header fixed today (126 → 65 px). Placeholders use `--text-3`. Ring still visible on the nav after a mouse click. |
| P1-13 | Price in hero/nav; honest proof; sticky phone CTA | 🟡 | ₹1,499 and Pricing on the home page; hero/nav placement and CTA not checked. |
| P1-14 | Site and app read as one product | 🟡 | Site and app both V4 Eclipse; manifest navy breaks it (P0-5). |
| P2-1 | One font stack, no duplicate tokens | ✅ | `--font-body`/`--font-display` defined once in `themes.css`. |
| P2-2 | No console errors; every field labelled | 🟡 | No errors on Today; not swept per screen. |
| P2-3 | Sentence case ("Submit report") | ❌ | `refine.submit` = "Submit Report". |
| P2-4 | `prefers-color-scheme` default; reduced motion | ✅ | "Follow system" theme; `prefers-reduced-motion` in `shell.css`, `design-system.css`. |
| P2-5 | Designed empty/loading/error states | 🟡 | Today has them; other screens not swept. |

**Totals:** ✅ 4 · 🟡 11 · ❌ 10. Open P0s: P0-1, P0-4, P0-5.

## Not checked
Phone sizes for report form and People; public site hero/nav and trust copy; every screen's console; territory manager.
