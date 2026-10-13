# Credentials, requirements and release inputs

Updated 2026-10-13. Never paste private keys or passwords into chat, commit them, or add real values to this file. Configure secrets in the destination dashboard or CI secret store. This file deliberately contains setup instructions and public identifiers, not secret values.

## Access obtained and verified

| Service | Observed access | Result |
|---|---|---|
| GitHub `photographicode/congregation-assistant` | Git transport and connected GitHub app | Branch `v2/all` can be pushed; one review PR is used. Existing Pages destination retained. |
| GitHub `photographicode/Congregation-Assistant_Public` | Read-only clone verified | Website source/template copied to `apps/site`. Separate canonical site publication has not occurred. |
| Supabase `ejosykrxjvwrhxfnputo` | Authenticated Supabase connector | Additive foundation/fix migrations applied; rollback contract tests pass; existing records preserved. |
| Public Supabase URL/key | Publishable client configuration | Already available in app configuration; not a server credential. |
| npm | Registry access | Dependencies installed with committed lockfile; production dependency audit reports zero vulnerabilities. |

The shell's GH_TOKEN did not authenticate to the CLI; Git transport and the connected GitHub app work. No token was copied into files or output.

## Owner-managed service setup

| Requirement | Where to obtain/configure it | Secret names / configuration | Current status |
|---|---|---|---|
| Cloudflare Pages (optional hosting move) | Cloudflare dashboard → API Tokens → scoped Pages edit token; account dashboard | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PROJECT_NAME` in GitHub Actions | No binding observed. Existing GitHub Pages remains the target. |
| Transactional sender | Brevo or other approved provider; verify `mail.congregationassistant.com` | Provider key in Supabase Edge Function secrets; SPF/DKIM in DNS; verified From address | Not configured/verified by this task. No named-mail delivery promised. |
| Domain / Titan mail | GoDaddy DNS and Titan dashboard | MX/SPF/DKIM/DMARC, support/hello/billing/dmarc mailbox creation | DNS ownership and mailbox access not present. Existing support address retained as fallback. |
| WhatsApp Business | Meta Business portfolio + WhatsApp Manager | Verified number ID, app secret, access token, verify token, approved utility templates in server secrets | Optional; disabled. Cannot self-issue Meta credentials or finish business verification on the owner's behalf. |
| Narrow AI parser | Owner-selected LLM provider dashboard | Provider API key in server secrets; daily budget and allowed intents | Optional; disabled, and always incompatible with Private mode. |
| Razorpay | Merchant dashboard after KYC | Test/live key IDs and secrets in server secret store; verified webhook secret | No merchant activation performed; never charge from client code. |
| Android signing | Owner-controlled keystore generation; keep a secure offline copy | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` in CI | No production signing identity created. Production key ownership must remain with owner. |
| Google Play | Play Console account, fee and required testing eligibility | Developer account and reviewed distribution/payment policy | Do not automatically publish. |
| JW.org/WOL content authorization | Written permission from rights holder | `docs/permissions/jw-org-authorization.md`, scope and date; `JW_IMPORT_ENABLED` only after verification | Document template supplied; importer remains disabled. |
| Optional public-form challenge | Cloudflare Turnstile dashboard | Site key public; secret key server-side | Not configured; anonymous endpoint audit still required. |
| Independent E2EE review | Qualified security reviewer | Threat model, protocol, reproducible build and test evidence | Not commissioned. No E2EE release claims. |
| Human pilots | Younger and older first-time users plus pilot congregation | Phone with 200% text; setup/publish acceptance notes | Not performed. |

## Development requirements, distinct from credentials

These are unfinished implementation/verification, not things a missing API key will fix:

- Full Private-mode lifecycle: 12-word recovery ceremony, signed key approval/pinning, QR device approval, custodians, role envelopes, revocation epochs, lazy re-encryption, complete data inventory/migration and plaintext removal after verified backup/restore.
- Full E2EE known-answer, fuzz, two-context lifecycle, 1,000/5,000-record performance and no-plaintext sentinel suite. Crypto primitives passing is insufficient.
- Complete rewritten reports/attendance/midweek/duties/SuperAdmin screens; currently preserved through the legacy adapter.
- Full PersonPicker, shared availability/qualification checks, visiting-speaker address book, public Midweek/Weekend switch, publish rollback and link rotate/revoke/QR actions.
- XLSX/on-device OCR imports, household batch confirmation, update-aware import undo, script-shaped custom PDF layouts and remaining print presets.
- Complete delivery enforcement plus per-publisher consent and opt-out storage; new server requests now persist their catalogue choices.
- Legacy XSS/inline-handler/CSP migration, all-icon replacement, source/tree cleanup and the full accessibility/performance/PWA matrix.

## Local commands

Node 22+ and npm are needed. `npm ci --ignore-scripts`, `npm run check:v2`, `npm test`, `npm run build:v2`. CI runs Playwright with an isolated/demo backend. Do not point browser fixtures at production records. For database rollout use `docs/DB-ROLLOUT.md` and the dry-run/apply script; direct SQL credentials are not needed for the connector path already used here.
