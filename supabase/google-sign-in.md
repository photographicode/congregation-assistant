# Activate Google sign-in

The browser integration is implemented. Provider activation still requires access to the Google Cloud and Supabase dashboards; this workspace has no administrative connection to either project. Do not paste client secrets into chat or commit them to this repository.

1. In Google Cloud Console, configure an OAuth consent screen for this app and create an OAuth client of type **Web application**. During Google's Testing status, add each intended test account as a test user; move the consent screen to Production when ready for general use.
2. Add this **authorized redirect URI** to that Google OAuth client:

   `https://fbnongloqxzepqhpnvlm.supabase.co/auth/v1/callback`

3. In Supabase → Authentication → Sign In / Providers → Google, enable Google and enter the client ID and client secret there.
4. In Supabase → Authentication → URL Configuration, set the Site URL and add this redirect URL:

   `https://photographicode.github.io/congregation-assistant/`

   If users open `index.html` directly, also allow `https://photographicode.github.io/congregation-assistant/index.html`. The app strips public-link parameters and URL fragments before starting OAuth.
5. Run `audit-access.sql` in the SQL editor and review existing policies/schema. Review and run `google-access.sql` to configure account membership. It includes the Main Admin role, restricts self-service reads to a verified Google identity, restricts account management to administrators of the same congregation, and refuses to run over unknown access policies. The existing table must match the documented schema. Review existing constraints, grants, and indexes if migration fails; do not bypass its review guard.
6. Bootstrap the first administrator using the commented insert at the bottom of that migration, replacing its congregation ID and email. Sign in with that Google account. Existing password sessions cannot grant server-authorized account-management writes under these policies.
7. Confirm authenticated members can read the permitted congregation profile fields. Independently verify table/RPC permissions for publisher records, reports, attendance, emergency details, and schedules using `README.md`'s tenant/role matrix. The membership migration does not implement those other policies or move the local scheduler to a shared cloud store.
8. Use **Access & Roles** to add approved emails and roles. Multiple roles for one congregation combine in the UI. Users with multiple congregations choose which one to open. Verify rejected users stay on a clear sign-in screen, restricted members retain Menu/help/settings/sign-out, and disabled members cannot access data directly.

Browser acceptance covers the app-side OAuth request, role routing, rejected/expired sessions, and navigation using a synthetic backend. It does not prove that the live Google provider is enabled or that live RLS matches the intended access model. Run actual Google sign-in with an approved test account and an unapproved account after configuration.
