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
