# congregationassistant.com setup

The GitHub repository stays private. A hosted app is separate from source visibility. The owner's working review is https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=admin (owner-only ChatGPT sign-in).

## Hosting

Use Cloudflare Workers static assets for new hosting, as recommended by https://developers.cloudflare.com/pages/ and https://developers.cloudflare.com/workers/static-assets/ (checked 14 October 2026). `hosting/wrangler-app.jsonc` serves the app; `hosting/wrangler-site.jsonc` serves the public website. The Worker applies headers to static responses. `_headers` files are included for compatibility; Workers runtime headers are authoritative.

Add repository Actions secrets `CLOUDFLARE_API_TOKEN` (least privilege Workers Scripts Edit and necessary zone access to attach these custom domains) and `CLOUDFLARE_ACCOUNT_ID`. No credentials are committed. Missing secrets produce successful notices naming each missing secret. Set up each worker once if versions upload reports that it does not yet exist. PR runs upload preview versions and comment real URLs; main deploys production. Do not promote incomplete parity to a finished commercial release.

## DNS at GoDaddy and Cloudflare

1. Export the current GoDaddy zone before changing nameservers.
2. Import every record to Cloudflare. Copy the actual Titan DKIM selector, then run `TITAN_DKIM_SELECTOR=ACTUAL_SELECTOR node scripts/dns-preflight.mjs zone-export.txt work/dns-preflight.json`. The script refuses readiness without that selector; another provider’s DKIM record is not a substitute. JSON `{records:[{name,type,content,priority}]}` and BIND exports are supported. A passing result is required before a nameserver change, plus the manual checks printed in the report.
3. Preserve Titan: apex MX `mx1.titan.email` priority **10**, `mx2.titan.email` priority **20**, both DNS-only. Keep exactly one apex SPF TXT including `v=spf1 include:spf.titan.email ~all` (merge any other legitimate sender into this one record).
4. Copy the actual DKIM selector and record from Titan. Never substitute a placeholder. Create `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:security@congregationassistant.com` after creating that mailbox. Review 2–4 weeks of reports before moving to quarantine/reject.
5. Change GoDaddy nameservers to the **two actual nameservers assigned to this zone by Cloudflare**. Do not invent nameservers. Workers custom domains attach `congregationassistant.com`, `www.congregationassistant.com` and `app.congregationassistant.com`; Cloudflare provisions certificates. Check incoming/outgoing Titan email again.
6. Transactional email belongs on `mail.congregationassistant.com`. Keep provider SPF/DKIM/return-path records there; do not replace Titan apex MX. Configure that sender's actual provider credentials in Supabase Auth SMTP.

GoDaddy account, Cloudflare zone/token and Titan dashboard access are not bound to this session. This file provides exact configuration; no nameserver, mail or OAuth change has been made automatically.

## Supabase Auth / Google

Project: `ejosykrxjvwrhxfnputo`; project URL `https://ejosykrxjvwrhxfnputo.supabase.co`; configured region verified through the connected API: `ap-south-1` (Mumbai).

- Supabase Site URL: `https://app.congregationassistant.com`.
- Redirect allowlist: `https://app.congregationassistant.com/**`; add the **actual** Cloudflare app preview URL with `/**` when provisioned. Avoid unrestricted wildcard hosts. Local development: `http://localhost:5173/**` only in a development project.
- Google authorized JavaScript origin: `https://app.congregationassistant.com`. Provider redirect URI: `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`.
- Consent screen name: Congregation Assistant; authorized domain: congregationassistant.com; home: `https://congregationassistant.com`; privacy: `/privacy/`; terms: `/terms/`.
- Auth templates link through Supabase's generated `{{ .ConfirmationURL }}`; app links use configured `APP_URL`. Do not embed production secrets or tokens in public config.
- SMTP sender: a verified address on `mail.congregationassistant.com`; use the chosen transactional provider's actual SMTP host/port/user/secret. Support mail remains Titan at `support@congregationassistant.com`; security mail at `security@congregationassistant.com`.
- Edge Function CORS: allow the actual app origin and explicitly selected previews; handle OPTIONS. Never use `*` with credentials. Supabase REST handles its own CORS; database RLS remains the authorization boundary.
- In account dashboards enable and verify 2FA for Supabase, Cloudflare, GitHub and GoDaddy. The code does not claim those settings are already enforced.

## Verification

Run `EXPECTED_COMMIT=<full-sha> node scripts/verify-production.mjs`, then demo browser smoke, OAuth round trip and mail checks. Confirm the visible “Update available” prompt replaces an old service worker only after Reload. Do not set `domainConfigured` or `mailConfigured` true until these real checks pass. HSTS includes subdomains but **does not request preload**; evaluate all subdomains before submitting to a preload list.

`assetlinks.json` is deliberately empty until an actual signed APK package and SHA-256 signing certificate are supplied. Template: `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"ACTUAL_PACKAGE","sha256_cert_fingerprints":["ACTUAL_SHA256"]}}]`.

## Server-generated mail links

The configured-mail-links migration stores the five public URL/email values in a private configuration row and makes welcome/request messages read it. It has been applied after isolated queued-text tests. No message was delivered during these tests. If public-config.json changes, update the matching private configuration through a reviewed migration; SMTP credentials remain outside this table.

## POLISH configuration and cutover gate

public-config.json contains SITE_URL / compatible PUBLIC_SITE_URL, APP_URL and SUPPORT_EMAIL, plus distinct GitHub Pages fallback URLs. scripts/pages-config.mjs resolves the website/app origins and both base paths. CUSTOM_DOMAIN_READY defaults false. Only the owner-confirmed true switch permits an apex CNAME in the generated snapshot; no CNAME has been committed by this polish phase. Configure the switch only for the repository that owns that hostname. Fallback builds retain their project-scoped manifest and service worker; confirmed custom builds use root app scope and redirect the website's old /app entry to APP_URL. DNS and production provider settings are unchanged.

Supabase Site URL: https://app.congregationassistant.com/. Redirect allowlist: https://app.congregationassistant.com/**, https://photographicode.github.io/congregation-assistant/app/** and https://photographicode.github.io/Congregation-Assistant_Public/app/** while fallbacks remain active. Google OAuth authorized JavaScript origins: https://app.congregationassistant.com and https://photographicode.github.io. The Google OAuth redirect URI is the Supabase project's /auth/v1/callback endpoint, not a publisher report link. Add both intended and fallback origins to any application edge-function CORS allowlist; never use a wildcard for authenticated requests. Dashboard allowlists were documented, not changed by this code update. Verify real approved-account login before DNS handover.
