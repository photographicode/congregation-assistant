# Owner setup and release tasks

The implementation report and PARITY contain product work that still blocks release. Account setup alone will not satisfy those gates.

1. Restore GitHub API access for PR/issue actions. Current CLI GraphQL requests are Forbidden, though Git transport successfully pushed v2/cutover. The attempted draft PR was not created. Read-only tools cannot open/merge the cutover PR or resolve PRs #7/#37 and issue #39.
2. Configure the chosen Cloudflare account and two Pages projects, then follow domain-and-email.md for GoDaddy nameservers, app/website hostnames and TLS. No provider-assigned nameservers or pages.dev targets are known yet.
3. Create and verify support@congregationassistant.com. Configure provider-issued MX/SPF/DKIM and appropriate DMARC; transactional email is separate.
4. Verify Supabase project ejosykrxjvwrhxfnputo, Google OAuth and magic-link settings; add the custom app redirect after domains work. The connected Supabase tool can read project metadata; browser/project network and real login acceptance are still unverified. Email-link UI stays off until approved-email authorization/callbacks are implemented.
5. Complete native parity, full role/public abuse/PDF/layout/performance tests and encryption lifecycle. Private mode/importer flags stay off.
6. Review and run SQL on isolated staging first. Auth-removal SQL is guarded, destructive and not automatically selected by the migration script. Production changes remain owner-run.
7. After acceptance, open one v2/cutover PR, resolve other PRs/issues with comments, merge and verify actual production root, redirects and cache replacement. Then make the GitHub repository private in Settings → General → Change visibility and use Cloudflare Pages for hosting. Repo privacy is an owner click; verify your plan's hosting/access constraints before switching.
8. Signing/store/payment/WhatsApp Business credentials remain optional and disabled. No mailbox, purchase, deployment, DNS mutation or account activation was completed here.
