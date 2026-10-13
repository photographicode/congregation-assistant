# Congregation Assistant

The owner's V2 cutover instructions take precedence over the earlier preview plan. Native app source lives in apps/web/src/v2, repositories in apps/web/src/data, shared UI in packages/ui, and website in apps/site. Build only these trees; never copy legacy root scripts into deployment output.

Complete and verify native parity before deleting remaining legacy implementation. docs/PARITY.md must report real gaps; do not mark a capability complete because a demo, placeholder, link, or unverified backend call exists. Release is blocked until npm run check:release and all browser/database acceptance gates pass. Work on v2/cutover; ship one PR only when its gates pass.

Run npm test, npm run check, npm run build, npm run check:bundle and npm run test:browser. Prefer targeted checks after fixes. Run expanded matrices in nightly CI. Source and production publishing are separate from SQL: never automatically apply destructive production migrations. scripts/apply-migrations.sh skips destructive auth removal unless explicitly selected by the owner.

No real records or secrets in fixtures. No window-based application singletons, V1 iframes, inline handlers, pictographic icons or password authorization. Browser APIs such as window.visualViewport are allowed. Demo must never call Supabase. Do not enable E2EE claims until the complete device, migration, recovery, revocation and sentinel suites pass.
