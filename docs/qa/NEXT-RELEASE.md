# NEXT release — verified live

18 October 2026 (India). This is a tested V3 increment; full V3 acceptance remains open.

- Website: https://photographicode.github.io/Congregation-Assistant_Public/
- App: https://photographicode.github.io/Congregation-Assistant_Public/app/
- Inspect with sample records: https://photographicode.github.io/Congregation-Assistant_Public/app/?demo=admin
- Source mirror: https://photographicode.github.io/congregation-assistant/

Source commit: `f0a0d67d437538bee6d319d70ebbc120031c3ad0`. Public snapshot: `c2cd184462d5c25b07ddd1119c99fab140a73c32`.

Both [source deployment](https://github.com/photographicode/congregation-assistant/actions/runs/39073120817) and [public deployment](https://github.com/photographicode/Congregation-Assistant_Public/actions/runs/39073165965) succeeded, including post-deployment browser checks. Both live apps report the exact source commit, controlling service workers, preserved unrelated-app caches, zero browser errors, zero demo cloud calls and zero assistant parsing/review/cancel requests.

## Included

Direct worker PDF downloads, S-89 student/assistant slips, S-140, approved-pool duty rosters, filtered emergency PDFs, non-blocking accuracy notices, scoped Home group links and Links Hub rotation/revocation, opening-seeded suggestions, weekend talk history/backfill, browser-first install flow, requested theme fonts with licensed script WOFF2, automatic verified English WOL programs and dated Watchtower metadata, and the static B/W website.

Automatic source refresh preserves compatible existing assignment IDs and chosen meeting date/time. Saved offline assignments survive reload and sync exactly once on reconnect. All tested Home/history/link-management migrations are applied; no migration approval remains pending.

## Evidence

- Source CI: full lint, TypeScript and unit/legacy suite; six synthetic parser cases; 60 responsive views with zero regression findings.
- 26 direct download events at 390/1440 px; CI maximum 1,078 ms; no preview dialog.
- 17 regenerated PDF golden text/page/coordinate comparisons; original template hashes and embedded-font contract pass.
- Group-link isolation/rotation/revocation, install branches, talk history, nine-theme active font requests and signed-in automatic-source checks pass.
- Real WOL CI: four anchors pass; 59 English weeks. Raw HTML is not committed.
- Contrast: 351 panel cases plus four OCLM cases; 3,705 rendered text pairs in 108 CI views; zero failures. Required thresholds and supplied theme CSS are unchanged.
- Native IndexedDB/Web Locks recovery, two-tab single writes, conflict review, offline reload and reconnect pass.
- Website: four widths, six script locales/RTL, no JavaScript fallback, zero third-party requests/errors. Initial gzip ≤121 KB; JS 3,349 bytes. Mobile Lighthouse 100 in all four categories, CLS 0.
- Full-history/working-tree secret scan: source 2,479 blobs and public 996 blobs; no privileged-key findings. Frozen `v1-final` remains unchanged.

## Still open

The complete app/website alignment matrix, role/dialog coverage and text-widow corrections are unfinished. The comparable 12-view sample improves from 30 findings to one; a separate 40-view narrow/200% sample has 48 text widows. No contact sheets or mockups were rendered while that gate remains red.

Other WOL languages, complete Watchtower/history and exceptional-week coverage; expanded/localized urgent suggestions; Indic visual/CLS acceptance; full site translations, optimized mockups/OG assets, sticky story/typing visuals and capture pipeline remain open. Twelve draft locales currently translate navigation/hero and fall back to English for remaining copy.

CO Visit Pack, unverified founding/Starter/Founders offers and E2EE claims stay off. Remaining V3 PARITY, complete restore/export packs and real OAuth/WhatsApp/payment/device acceptance remain open. Existing legacy acceptance workflows are separate from the successful release pipeline; a whole-product green CI claim is not made.

## Owner account settings

Both deployment tokens received HTTP 403 when selecting Actions as the Pages publishing source. Deployments and live checks succeeded through the existing configuration. In each repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions** to prevent competing branch builds on future updates.

Custom-domain CNAME remains withheld under the existing owner DNS-confirmation requirement. No GoDaddy DNS or mail settings changed. Follow `docs/GITHUB-PAGES-DNS.md` and `docs/OWNER-TODO.md`; real account/OAuth, DNS/mail and physical-device acceptance cannot be inferred from demo checks.

Detailed machine evidence: `NEXT-DEPLOYMENT.json`, plus the dated QA reports in this directory.
