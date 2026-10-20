# Hosting and domain handover

The working public website remains https://photographicode.github.io/congregation-assistant/ and its native app remains https://photographicode.github.io/congregation-assistant/app/. The source repository also serves the same website/app structure at https://photographicode.github.io/congregation-assistant/.

Keep both current hosts working until DNS, HTTPS and real approved-account login have been verified. Domain purchase alone does not activate DNS or authorize a premature CNAME cutover. The latest polish orders assign DNS changes to the owner.

Intended settings: SITE_URL=https://congregationassistant.com; APP_URL=https://app.congregationassistant.com; SUPPORT_EMAIL=support@congregationassistant.com. public-config.json includes SITE_URL and the compatible PUBLIC_SITE_URL alias. BASE_URL is the build-time absolute directory path: `/` for an app subdomain and `/congregation-assistant/app/` for the canonical GitHub Pages fallback. scripts/build-pages.mjs supplies the fallback configuration and scoped manifest/worker paths automatically.

Before cutover, configure Supabase redirect URLs and Google OAuth origins for both current fallback paths and the intended app domain, following DOMAIN-SETUP.md. Verify a real approved Google account; demo isolation does not prove provider login.

Select GitHub Actions as the Pages publishing source in each repository. Workflow attempts to change this setting received HTTP 403; deployment success does not prove this setting was changed.

Do not commit a CNAME until CUSTOM_DOMAIN_READY=true is set in repository variables after DNS is ready. The Pages builder reads CUSTOM_DOMAIN_READY and emits CNAME only after that explicit switch. Set it only in the repository chosen to own the website hostname, never both. Keep it false in the source Pages fallback if the public snapshot owns the domain. Regenerate the public snapshot with the confirmed custom configuration after the complete polish gates pass. The complete polish release remains open, as recorded in POLISH-REPORT.md. Do not assign the same hostname to both repositories. Follow GITHUB-PAGES-DNS.md for the existing Pages fallback DNS procedure.

No new production migration may run without a pre-migration snapshot and an additive migration with a reviewed down path. Never reset production records. Payment-provider and mail credentials belong in repository/provider secret settings, never source or chat.
