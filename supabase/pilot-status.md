# Pilot status — 5 October 2026

Current phase: secure production release deployed; human congregation pilot acceptance remains open. Paid launch is not ready. This replaces earlier notes describing a separate secure staging backend or unverified Google-provider sign-in.

## Released and verified

- Software [PR 23](https://github.com/photographicode/congregation-assistant/pull/23), release `6c50d606e25270f6ffad2c661095e0dcab4f8548`: production and staging use secure project `ejosykrxjvwrhxfnputo`.
- Website [PR 9](https://github.com/photographicode/Congregation-Assistant_Public/pull/9), release `e3a469a6f47d08b756c0bac745d48c99eb62d4a4`: actual software previews with fictional Demo Congregation records, public S-140 schedules, responsive device controls and updated feature guides.
- [Acceptance run](https://github.com/photographicode/congregation-assistant/actions/runs/37350234721) passed: 55 regression checks, three cloud conflict checks, encrypted-backup roundtrip/wrong-password/tampering, browser and PDF checks, isolated PostgreSQL permission/recovery contracts, and 504 accessibility cases. Representative automated checks do not cover every physical device or complete a human pilot.
- Google-provider sign-ins exist for all three nominated identities. The owner is Google-only; the password route is retired. Automated browser tests verify sign-out, auth-server failure and stale-session recovery.
- `photographicode@gmail.com` administers `ca-pilot-a`; `joelagith7777@gmail.com` administers `ca-pilot-b`. Earlier congregation memberships are preserved. `congregationassistant0@gmail.com` remains SuperAdmin only.
- Live rollback contracts using the real pilot user IDs and trusted Google claims verified both congregation boundaries, private drafts, stale-save/publication rejection, per-week preservation, stable links, history restore and denial of the old publication bypass. All synthetic writes were rolled back. This is not an interactive browser test performed on behalf of those users.
- Existing secure records remain intact: 112 publishers, two reports, four congregations and one publication at deployment. A private pre-change data snapshot was retained outside Git; it is not a full project disaster backup. The unused legacy configuration is archived and excluded from Pages; no unavailable legacy database export is claimed.
- Shared scheduling includes assistants, qualification exceptions, away periods, reviewed monthly programs, additional duties, actual assignment types and explicit completion status. Version checks prevent silent overwrites. First shared drafts adopt existing published weeks. Only the selected week is published from the server draft; history restore keeps the stable link.
- Publisher accounts bind to one same-congregation record and use narrow personal-assignment/report RPCs. Group bulk entry stays within the assigned group. Main Admin Home, larger text and clear device/online/published states are included.
- Encrypted exports include records, settings, schedules, qualifications, duties and history. Restore checks scope and intervening changes, and preserves current billing, access grants and link tokens. Existing server history remains with a new restoration version; exported history supports operator recovery. Local reminder preferences are device settings.

## Remaining activation and pilot work

1. Testers must select their pilot workspace, save/publish, open the live link and sign out on their own devices. Exercise two-device conflicts, assistants, failed saves, revoked access and recovery; an overseer must approve a real S-140 week. Provider sign-ins and fixture tests do not complete this acceptance step.
2. Private email/push workers and queues are deployed/prepared, but delivery is not activated. Configure private sender/signing keys and scheduled server jobs, then verify inbox and closed-app delivery, revocation, cancellations, retries and monitoring. See [email activation](../docs/email-activation.md) and [push activation](../docs/push-activation.md). Never share private credentials in chat or source.
3. Rehearse live operational backup/restore and document retention, deletion and incident handling. Use an appropriate Supabase paid backup setup before paid personal-record use. Workspace exports and isolated database restore tests do not replace project disaster recovery.
4. Resolve permission or replacement for distributed official forms before commercial launch. No JW.org/WOL scraping or copyrighted workbook library is enabled; reviewed imports require appropriate rights.
5. Configure merchant payments, verified captured-payment webhooks, entitlement, receipts and refunds before charging. Keep one clear congregation plan within ₹1,499 annually.
6. Measure capacity in small batches. No tested maximum congregation count or defensible overall completion percentage exists yet.

## Security in simple terms

Google proves who signed in. The server separately checks what that account can do for that congregation. Database permissions enforce these limits even if someone alters a browser request. Connections use HTTPS; downloaded backups use a separate encryption password that never reaches the server.

Anyone possessing a published schedule link can see its assigned names and duties, but not contacts, reports or qualifications/away information. Keep links with intended recipients. Device recovery copies require a secure personal device. Ordinary online records are not end-to-end encrypted; no system guarantees zero risk.

Advisor notices remain for intentional permission-checked privileged RPCs and token-scoped public forms. Private worker tables have RLS without browser policies because browser access is denied. Supabase password leak protection is not enabled; application access requires Google rather than a Supabase password. This is not claimed as a clean independent security audit. Guidance: [public RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
