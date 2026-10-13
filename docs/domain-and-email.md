# Domain and email rollout

Current verified app address: https://photographicode.github.io/congregation-assistant/
Current public site: https://photographicode.github.io/Congregation-Assistant_Public/
Keep these until DNS and hosting have been verified. Source configuration is `public-config.json` (and the compatibility `app-config.js`).

Planned names:
- `congregationassistant.com`: public site.
- `www.congregationassistant.com`: redirect to apex.
- `app.congregationassistant.com`: application.
- `mail.congregationassistant.com`: transactional sender, separate SPF/DKIM.
- Optional `status.congregationassistant.com`: service status.

For Titan / GoDaddy mailbox delivery, configure MX `mx1.titan.email` priority 10 and `mx2.titan.email` priority 20. Apex SPF: one TXT record `v=spf1 include:spf.titan.email ~all`. Obtain the exact DKIM selector and value from Titan, rather than inventing either. Begin DMARC with `p=none` and a working `rua` mailbox; monitor 2–4 weeks before tightening. Create `hello@`, `support@`, `billing@`, `dmarc@`. Never create multiple SPF records on the same hostname. The transactional subdomain uses the selected provider's verified records, not copied Titan records.

Before switching URLs:
1. Configure hosted site domain and TLS; verify apex/www redirect and app links.
2. Add verified domains, privacy/terms URLs, app branding and correct origins to Google OAuth consent configuration. Review verification requirements.
3. Set exact Supabase Auth Site URL and allowed callback URLs for app/staging. Avoid broad wildcard callbacks in production. Test Google login on the final origin.
4. Verify SMTP sender, provider API secret, bounce/complaint handling and an actual delivered test email.
5. Verify CORS for the app and request form; check cache/header policy on the final domain.
6. Update public configuration only after the endpoints work. Preserve the old address during rollout.

DNS and mail changes were not applied because no DNS/Titan access was available. SMTP/provider keys cannot be retrieved from public records.
