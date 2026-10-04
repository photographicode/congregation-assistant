# Activate Google sign-in

The new Supabase project is connected and its schema is configured. Its Google provider is currently disabled. Provider activation requires a Google OAuth web client and its secret in the Supabase dashboard; the connected database tools do not expose provider configuration controls. Do not paste client secrets into chat or commit them to this repository.

1. In Google Cloud Console, configure an OAuth consent screen for this app and create an OAuth client of type **Web application**. During Google's Testing status, add each intended test account as a test user; move the consent screen to Production when ready for general use.
2. Add this **authorized redirect URI** to that Google OAuth client:

   `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`

3. In Supabase → Authentication → Sign In / Providers → Google, enable Google and enter the client ID and client secret there.
4. In Supabase → Authentication → URL Configuration, set the Site URL and add this redirect URL:

   `https://photographicode.github.io/congregation-assistant/`

   For the separate pilot deployment, also allow `https://photographicode.github.io/congregation-assistant/staging/` and `https://photographicode.github.io/congregation-assistant/staging/index.html`.

   If users open `index.html` directly, also allow `https://photographicode.github.io/congregation-assistant/index.html`. The app strips public-link parameters and URL fragments before starting OAuth.
5. The new project's `fresh-project.sql` schema already supplies memberships and RLS. Do not run the legacy `google-access.sql` over this schema.
6. The owner `photographicode@gmail.com` is already active in `ca_superadmins`. Sign in with that Google account, then create the first congregation and its approved administrator in Superadmin.
7. Validate private-record permissions with an approved account and an unapproved account. SQL tests passed on the live schema, but simulated JWT tests do not replace real OAuth sign-in.

8. Use **Access & Roles** to add approved emails and roles. Multiple roles for one congregation combine in the UI. Users with multiple congregations choose which one to open. Verify rejected users stay on a clear sign-in screen, restricted members retain Menu/help/settings/sign-out, and disabled members cannot access data directly.

Browser acceptance covers the app-side OAuth request, role routing, rejected/expired sessions, and navigation using a synthetic backend. It does not prove that the live Google provider is enabled or that live RLS matches the intended access model. Run actual Google sign-in with an approved test account and an unapproved account after configuration.
