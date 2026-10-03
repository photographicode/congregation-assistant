# Detailed debugging: secure backend readiness

Reviewed 3 October 2026 against main commit `de5f8ae`.

This branch prepares the app for project `ejosykrxjvwrhxfnputo`. It does not change `app-config.js`, deploy the website, migrate old data, or alter either database.

## Findings addressed

- Cached Superadmin and legacy password session flags no longer open a secure project before Google membership verification. Missing OAuth clears those flags.
- A partial project URL/key configuration fails closed instead of combining new configuration with the old project fallback.
- Legacy congregation-only public URLs are rejected on secure projects. Legacy overseer URLs lead to Google login and resume approved Google sessions; they do not enter group-password screens or fetch private tables.
- Rejected attendance reads display errors. A genuinely missing monthly record remains an empty form.
- Names in group member/pending lists and report remarks in group and overseer screens are escaped before insertion into HTML.
- Legacy password operations explain that secure projects use Google roles. Overseer links for secure projects point to the clean login URL.
- Secure projects explicitly refuse the unconfigured scheduled-wipe flow. The old implementation uses browser-triggered deletes, ignores write results, and updates congregation fields unavailable to ordinary administrators under the fresh schema. A transactional, authorized backend implementation is required before this feature can be offered.

## Verification

40 command-line regression checks pass, including six added cases covering these findings. Generated S-21, S-3, S-88, and emergency-contact PDFs pass page-coordinate checks. Added browser startup coverage for secure legacy URLs in desktop Chromium, mobile Chromium, and mobile WebKit, with all Supabase network traffic blocked and an in-memory fixture substituted.

Local browser execution is blocked: the Playwright browser download returned invalid/truncated archives. Browser acceptance must pass in the pull-request workflow before this branch is ready to merge. No browser pass is implied by the command-line results.

## Already completed on the new project

The guarded fresh SQL was applied after confirming zero public tables/functions, Auth users, and Storage buckets. The owner `photographicode@gmail.com` is an active Superadmin. All ten tables have RLS; SQL tenant/role/public-link tests passed with fixtures rolled back. Auth Site URL and both requested redirects were saved. Intentional executable SECURITY DEFINER functions still produce advisor warnings.

## Remaining before switching the website

1. Configure Google OAuth Client ID and Client Secret securely; Google is currently disabled. Register `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback` in the Google OAuth client. Supabase displays this exact callback, but Google Cloud configuration has not been verified.
2. Validate a real Google owner login, congregation provisioning, role assignment, cross-account isolation, and public links against the new project.
3. Finish the secure scheduled-wipe backend or keep the explicit unavailable state.
4. Verify physical mobile devices, clipboard permissions, and print alignment. Midweek drafts remain device-local; unsupported PDF scripts still require embedded Unicode fonts.
5. Configure both the new project URL and public client key with `secureBackend: true` only after explicit approval to switch. Never place a service-role key or OAuth secret in frontend files. Review any old-data migration separately.
