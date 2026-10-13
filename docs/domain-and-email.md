# congregationassistant.com domain and email setup

The domain is purchased at GoDaddy. Prepared source targets:

| Host | Purpose | Output |
| --- | --- | --- |
| congregationassistant.com | Public website | dist-site |
| www.congregationassistant.com | Redirect to public website | Hosting redirect |
| app.congregationassistant.com | V2 app | dist |

**No DNS, hosting, certificate or mailbox change has been made.** Exact assigned Cloudflare nameservers and project hostnames do not exist in this session, so they must not be invented.

## Recommended Cloudflare Pages setup

1. Create a Cloudflare zone for congregationassistant.com and copy the two nameservers Cloudflare actually assigns. Import/review existing DNS records, including MX/TXT records if mail is already configured.
2. In GoDaddy → Domain → DNS → Nameservers, enter those two assigned nameservers. Registration stays at GoDaddy; DNS moves to Cloudflare. Do not delete existing email records during the switch.
3. Create two Pages projects from this repository. Both run `npm ci && npm run build` with Node 22. App output directory is `dist`; website output directory is `dist-site`. Set `BASE_URL=/`.
4. Add congregationassistant.com under the website project's Custom domains. Add app.congregationassistant.com under the app project's Custom domains. Let Cloudflare create their CNAME records using the actual project pages.dev hostnames. Add www to the website project and a permanent www → apex redirect preserving path/query.
5. Wait for both domain states and certificates to become active. Test HTTPS website, app sign-in, app demos and a deep-link refresh. Keep deployment gated until PARITY is complete.

Cloudflare requires the apex domain to be a zone on the same account, with Cloudflare nameservers. A subdomain can instead stay on GoDaddy DNS: first associate it in Pages, then add `CNAME app → <actual-app-project>.pages.dev` at GoDaddy. Do not place a made-up target or an apex CNAME into GoDaddy DNS.

Verified reference: https://developers.cloudflare.com/pages/configuration/custom-domains/

## Authentication URLs

In Supabase Auth URL Configuration, add exact approved redirects for `https://app.congregationassistant.com/` and set that as the production Site URL once the release is live. Retain the existing Pages callback while validating. Google OAuth's authorized redirect URI is the Supabase provider callback, `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`, not the website domain. Confirm actual project/provider settings in its dashboard before saving.

Google approved-account sign-in and email magic links require their providers to be enabled and verified. Magic links must not confer SuperAdmin privilege. The proposed auth-removal migration keeps SuperAdmin approved Google only.

## Mailbox and sending

Create support@congregationassistant.com with the chosen mailbox provider. Buying the domain alone does not create it. Use only the provider-issued MX, SPF and DKIM records and verify receiving/sending. Add DMARC initially according to the provider's guidance; tighten after deliverability verification. Do not add invented MX hosts or multiple SPF records. Transactional app mail uses separately configured SMTP/sending credentials; a support mailbox does not configure Supabase mail automatically.

Update `domainConfigured` and `mailConfigured` in public-config.json only after verification. Values remain false now. There is no automatic DNS/API integration in this branch.
