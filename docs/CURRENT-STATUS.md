# Current deployment status — 2026-10-13

The owner explicitly requested deployment of all available unpaid work. This authorizes publishing the tested foundation before the full master specification is finished. It does not make incomplete features complete.

## Available deployment

- App: https://photographicode.github.io/congregation-assistant/ (existing stable entry)
- V2 preview: https://photographicode.github.io/congregation-assistant/v2/
- Updated website: https://photographicode.github.io/Congregation-Assistant_Public/
- App-hosted website copy: https://photographicode.github.io/congregation-assistant/site/
- SQL: seven additive migrations applied to the existing Supabase project. Existing 116 publishers and four congregations preserved; no destructive data conversion.

V2 includes six themes and Auto, responsive navigation, accessible dialogs, role-filtered tools, group creation, publisher forms with guarded email bindings, weekend drafts/publication/public reading, CSV/TSV/vCard review/import/undo, resumable setup, delivery preferences, manual WhatsApp Smart Share, and adapters to existing reports/midweek/duties. The website includes feature descriptions, delivery choices, honest privacy status, pricing, workspace requests with saved preferences, and install guidance. Existing browser installation and PDF features remain available.

## Disabled or unfinished

No paid provider has been enabled or purchased. WhatsApp Business, AI intake, optional paid hosting, Titan/custom-domain email and app-store publishing are not activated. The existing website price is an offer, not an automatic charge.

Private mode and E2EE claims remain disabled. Crypto primitives are implemented, but the full identity, key sharing, recovery, migration and sentinel lifecycle is unfinished. Standard mode remains the current privacy model. Official-content importer is disabled pending permission and implementation. A signed Android APK is unavailable; browser installation is available.

Other gaps include complete reports/attendance/midweek/duties rewrites, group administration beyond creation, full Links Hub/QR/revocation, XLSX/OCR and update-aware import undo, script-shaped custom PDF layouts, PWA maskable assets/physical-device verification, comprehensive performance and human acceptance. See [the requirement-by-requirement checklist](v2-release-checklist.md). This is not a declaration that the master README is complete.

## Verification

- V2 foundation workflow: https://github.com/photographicode/congregation-assistant/actions/runs/38412366144 — passed.
- Existing full browser/PDF/database/cloud workflow: https://github.com/photographicode/congregation-assistant/actions/runs/38412366216 — passed after retry of a noticeboard timing failure.
- 37 V2 checks, TypeScript, existing app checks and production build pass; browser checks cover desktop/mobile demo flows, dialogs, household guard, weekend, import undo, app/site accessibility and 200% reflow.
- Production dependency audit: zero known vulnerabilities. Five high development-only advisories remain through Tailwind 3/braces.
- Published V2 asset hashes and live browser checks passed in run 38422194266 and again after packaging guide downloads in run 38422509247.

## Credentials and remaining owner inputs

[REQUIREMENTS.md](REQUIREMENTS.md) names required variables, account locations and remaining setup. Existing connected GitHub/Supabase access was sufficient for this deployment. No secret credentials are exposed in this report. Optional missing external credentials were not fabricated or purchased.

## Publication checkpoint

PR #38 merged to main at `26505567a26cbe0656b4c1dc330fd3e60bcfea8e`. Canonical website published from commit `6492274ec39b7e90b4a8b0b8e9f1b31a752f6f2f`.

App hosting rollout: https://github.com/photographicode/congregation-assistant/actions/runs/38422005921

Website hosting rollout: https://github.com/photographicode/Congregation-Assistant_Public/actions/runs/38422011651

Public asset hashes and V2 browser acceptance are checked by the Published V2 verification workflow; canonical website acceptance checks local and published assets plus isolated request fixtures in desktop Chromium, mobile Chromium and mobile WebKit. No live requests or messages are sent by these fixtures.
