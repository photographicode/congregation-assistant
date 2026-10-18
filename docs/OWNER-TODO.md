# Owner setup and release tasks

The implementation report and PARITY contain product work that still blocks release. Account setup alone will not satisfy those gates.

1. Connect the intended Cloudflare account with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through repository secrets; never paste privileged tokens into chat or source. Hosting targets are Workers static assets, not new Pages projects. Follow DOMAIN-SETUP.md for the actual assigned nameservers and custom domains.
2. Verify the purchased Titan mailboxes and provider-issued MX/SPF/DKIM values. The DKIM preflight requires the actual Titan selector. Start DMARC at monitoring mode, then tighten after reviewing delivery. Transactional app mail and mailbox service are separate.
3. Add the working custom app origin/redirect to Supabase and Google OAuth. Only public configuration belongs in public-config.json. Real Google login, SMTP delivery and callback acceptance are still required.
4. Complete native parity, real role/public abuse, PDF visual review, expanded adaptive/device/performance checks and the encryption lifecycle. No claim or flag is enabled by merely supplying credentials.
5. The additive V2 migrations have isolated tests and connected-project rollout evidence. ALL-V2.sql is an ordered idempotent convenience bundle; do not run destructive legacy-auth removal before cutover acceptance. Full automatic rollback remains blocked pending a complete safe inverse; use verified backups.
6. After all release gates pass, open and merge one cutover PR, resolve the existing PRs/issues, deploy, and verify production root/redirects/cache/TLS. GitHub is already private and must stay private. GitHub CLI API access was blocked earlier, while the connected API and Git transport are available; no new PR is needed before acceptance.
7. Optional Android signing/store/payment/WhatsApp Business integrations stay disabled without their contracts and credentials. No DNS, mailbox, provider-account activation or real custom-domain deployment was completed.

## Current custom-domain and review handoff

The repository is already private; do not make it public for preview. Review at https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=admin using the owner's ChatGPT account. The website is included under `/site/`.

Cloudflare deploy currently skips because CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are absent. GoDaddy nameservers, Titan DKIM/mailboxes, Supabase redirect/SMTP settings and Google consent/origins need the dashboard access described in DOMAIN-SETUP.md. Confirm those real results before changing configuration readiness flags. PDF embedded-font differences are documented for review in PDF-PARITY.md. Public legal pages need qualified legal review. Operator name/response-time and account 2FA are not invented or asserted.

The current native records archive contains V2 groups/weekend/setup in addition to the established server export. It is deliberately not presented as the existing automatic restore format; full V2 recovery-format parity is still on the release checklist. Account sessions can be listed, global sign-out is provided, and admin idle timeout is a per-device option. Supabase may keep already-issued sign-in access alive briefly after refresh-token revocation; the UI explains this limit.

Native owner review: add `?demo=owner` to the review URL. Test creation, request approval and assigned-group account access with fictional data. Real Google owner login still requires the configured redirect/origin dashboard settings; the review’s ChatGPT access and the app’s Google access are distinct.

## Resume deployment

- Confirm S-1 treatment of SFTS with your branch. Separate SFTS informational totals do not change S-1 calculations.
- Confirm GoDaddy DNS before adding CNAME `congregationassistant.com`. No CNAME is deployed on the strength of domain purchase alone. Pages origin must also be added to Supabase/Google OAuth redirect settings for real login.

Production rollout completed: the reduced `v3_meeting_workflows` migration was accepted after removing department-function replacements. It is applied with authenticated-only privileges. Current attendant attendance, scoped group-link lists and setup/calendar saving are enabled. All three departments retain administrator-approved pools. No further migration approval is pending.

The concrete GoDaddy/Pages cutover sequence is in GITHUB-PAGES-DNS.md. The public snapshot repository is the proposed sole custom-domain owner; do not assign the same domain to both Pages repositories. Rebuild project-relative assets and the PWA scope for the domain before adding CNAME.

Resolved: automatic review accepted the reduced v3_meeting_workflows migration after department-function replacements were removed. It is applied, privileges are verified, and the attendant/group/setup controls are enabled. The earlier production-rollout blocker paragraph is historical. No approval is now required for that completed rollout.

Verify the Supabase authentication redirect allowlist and real Google login for both current previews: `https://photographicode.github.io/congregation-assistant/app/` and `https://photographicode.github.io/Congregation-Assistant_Public/app/`. The available connector does not expose authentication-configuration mutations, so this provider-dashboard setting was not changed. Fictional demos and live static/PWA checks do not prove approved-account login.

## NEXT batch: remaining acceptance

There is no workbook-file upload or owner publication-file request. English WOL fetching is automatic in weekly GitHub Actions; additional languages and complete Watchtower mapping remain engineering work. All tested Home/history/link-management migrations are already applied.

Full alignment, website mockups/full translations and broader V3 PARITY are unfinished engineering work, not account-setup tasks. Unverified offers, CO Visit Pack and E2EE claims remain off. Keep the custom-domain CNAME absent until the existing DNS-confirmation requirement in GITHUB-PAGES-DNS.md is satisfied; no DNS or mail records were changed in this batch.

NEXT deployment account result: source/public artifact deployments and live checks succeeded. Both scoped deployment tokens received HTTP 403 when changing Pages build_type. In **both repositories**, select **Settings → Pages → Build and deployment → Source → GitHub Actions**; current branch publishing can compete with artifact deployments on future commits. This is an account-permission limit, not a pending migration or automatic-approval rejection. See qa/NEXT-RELEASE.md for exact commits and successful run links.

## Current polish phase

No migration approval is being requested. No new production migration will run without the ordered snapshot and additive/down review. The working branch is not a released version; POLISH-REPORT.md lists remaining implementation and acceptance work. OWNER-MANUAL.md records the existing fallback URLs and eventual DNS/provider handover. Payment checkout and live founder data are not configured or advertised as active. Keep the existing hosts unchanged until the full release gates pass.

R1 shipping scope: docs/V3-R1-SHIP-ORDERS.md is current. Local PDF geometry (49 fixtures), reviewed Noto goldens (17), 294-view layout sample and safe manual offline retry pass; full Actions, production AP migration snapshot and live deployment checks are still pending at this checkpoint. R2 order is recorded in POLISH-REPORT. No DNS or billing activation is claimed.
