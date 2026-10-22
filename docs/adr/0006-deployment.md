# 0006 — One canonical application and evidence-bound releases

Status: accepted; quality branch is not release-ready.

congregation-assistant is the canonical source and deployment. The former public repository redirects while preserving path, query and hash; it does not host another maintained application. Keep the locked public website separate from app source and artifacts.

Deploy from main only after every required quality, database, browser, PDF and security job passes. Current-source fingerprints invalidate retained interaction/dialog proof after relevant source or policy changes. Deployment consumes UI evidence from its own workflow run. Never use old reports or a previous release override to bypass the current quality orders.

GitHub Pages is the current verified host. It cannot supply all required HTTP security headers; Cloudflare activation requires configured accounts, DNS/callback verification and deployed-header checks. Buying the domain is not evidence that DNS, TLS, auth redirects or mail are activated.

Rollback uses a previously verified application artifact and a reviewed database compatibility plan, without resetting production records. Repository protection, Pages-source settings and environment reviewers require OWNER dashboard configuration. Evidence: .github/workflows/deploy.yml, scripts/quality-fingerprint.mjs and docs/engineering/RELEASE.md.
