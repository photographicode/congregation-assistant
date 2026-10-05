# Pilot status — 5 October 2026

Current phase: deployed secure staging, preparing for a small congregation pilot. Paid launch is not ready. This replaces older notes that deployment and browser testing were unverified.

## Verified

- Software and Website are published on GitHub Pages. The secure staging version is separate from the legacy main backend. Published asset checks and desktop Chromium, mobile Chromium and mobile WebKit acceptance passed on the previous release.
- 48 regression checks cover scheduling, publication failure recovery, actual session cleanup on sign-out, role workspaces, combined Google roles, assistants, reminders, Additional Duties and PDF generation.
- Secure backend row-level security is enabled on every application table. Anonymous direct reads are denied on all private tables, including owner approval, roles, publishers, reports and attendance.
- Live rollback contracts verify two-congregation isolation with simulated identities, section and group boundaries, immediate grant revocation, stable schedule links, failed publication recovery and private-field filtering. These do not prove real Google OAuth works.
- Additional Duties support custom sections (Attendant, AV, Cleaning) and sub-duties with 1–4 people each. Stable identifiers preserve qualifications and past assignments when names change.
- Role-based reminder settings and browser installation are available. Closed-app alarms require importing calendar reminders; automatic background push or messaging is not configured.
- Website provides a feature guide, trial email draft, fictional previews and one introductory annual offer capped at ₹1,499. It does not send requests or charge automatically.

## Still pending

1. Finish interactive Google sign-in and Google test-user approval. On 5 October, the user saved provider/URL settings and supplied screenshots of the correct Google origin and callback. A live readiness check verified Google enabled and the authorization redirect using the intended Client ID and Supabase callback. This does not prove an actual account login works. Add the staging directory URL explicitly to allowed redirects and keep pilot users on staging. The client secret belongs only in the provider dashboard; rotate any secret shared in chat.
2. Create the approved owner's Supabase Auth password account privately. Owner approval exists; a metadata query confirmed the account does not. Use the normal username login after activation, without Google.
3. Actual Google sign-in by two approved test accounts in different congregations. Test direct API access with real sessions, unauthorized and revoked accounts, sign-out, expired-session recovery, failed saves, schedule publication and live links.
4. Review the old backend and prepare a backed-up, tested data migration before changing the main software configuration. Current connection cannot audit the old project. Do not treat the legacy root as the secure pilot.
5. Review the official OCLM DOCX when supplied. Keep Additional Duties separate from the official meeting program and preserve the current usable workflow.
6. Full backup and restore rehearsal, shared-draft strategy for OCLM assistants, plain-language privacy/retention/support terms, and pilot user acceptance.
7. Define server-enforced paid entitlement and trial expiry before Razorpay. Prefer one clear congregation plan; do not implement three tiers without a concrete feature mapping. Complete the small pilot and resolve critical issues before paid launch.

## Publication safeguards

The new release adds no-referrer on app and website, noindex on software, a recognized-secret scan, and Pages exclusions for setup documents, SQL, tests and internal source. Verify the exclusions against deployed URLs before calling them live. Search indexing controls do not provide access control. The public repository and its history remain public; no repository visibility change is claimed.

Anyone possessing a published schedule token can read its assigned names and duty details. Report/attendance tokens grant scoped form operations. Keep tokens private to intended recipients and use revocation where supported. Current storage and transport protections are not end-to-end encryption.

The advisor reports intentional privileged RPC warnings. Role RPCs validate active identity and membership; public-link RPCs operate under token contracts. A clean security audit is not claimed. Review advisor guidance at https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.
