# New Supabase project and live links

The new project `ejosykrxjvwrhxfnputo` is healthy in Mumbai, with the fresh schema and active Superadmin owner already configured. The live SQL authorization contracts passed with all test data rolled back. **Google sign-in is disabled**, and the application still uses its original backend. See [the connection audit](connection-audit.md) for evidence and remaining limitations.

Steps 1, 3, and 4 below are complete for this project. Do not create a duplicate project or rerun the fresh-only schema. Follow the remaining authentication, backup, and activation steps. The CLI alternative is for another empty project, not this configured database.

1. Sign into Supabase using your Google account and create a **new** project on the free plan. Choose the region nearest your users. Keep the database password in a password manager. The existing project and its records remain untouched.
2. Set up Google OAuth as described in `google-sign-in.md`, using the **new** project's callback URL. Allow `https://photographicode.github.io/congregation-assistant/` and `/index.html` in Supabase URL Configuration. Set the former as Site URL.
3. Run `fresh-project.sql` in the new project's SQL Editor. It deliberately refuses an existing `congregations` table. Do not run it on the old project.
4. In that trusted editor, insert your exact verified Google email into `ca_superadmins` using the commented statement at the bottom. The requested owner email is `congregationassistant0@gmail.com`; verify spelling before granting it access. The public website's existing contact address is a separate setting.
5. Put the new Project URL and **public anon/publishable key** into `app-config.js`, set `secureBackend: true`, and deploy. No database password, service-role key, or Google OAuth secret belongs in that file or GitHub.
6. Use the normal superadmin password login, open the owner workspace, and create the first congregation with its administrator's approved Google email. Provisioning creates the congregation and admin membership in one transaction. The default trial is 30 days; the introductory annual price is ₹1,499, with manual payment recording rather than an automatic checkout.
7. Export and retain backups from the existing application before moving any data. Re-create congregation IDs and import contacts/reports in the new project. Attendance and memberships require separately reviewed migration; scheduler browser data remains congregation-scoped on the current device. No automatic copy of private records is performed.
8. Publish an OCLM week, copy its new `?mode=oclm&token=…` link, and open it in a separate browser. Change an assignment and **Update this week**. The same link reads the new cloud snapshot and checks for changes every 30 seconds and on returning to the page. Draft edits are not public until published. Withdrawing a week changes the same link; old `#live=…` and `data=…` URLs remain frozen copies and must be replaced.
9. New report and attendance links use capabilities scoped to their congregation/group/publisher. Public visitors cannot read the underlying data tables. Group overseers use approved Google accounts for private tools. Tokens are shareable access: distribute them to intended users and revoke a token by setting `ca_public_links.active=false` in the trusted dashboard; links expire after one year by default.
10. Verify two congregations and approved/rejected/disabled accounts using the matrix in `README.md`, plus a real mobile browser. CI tests the schema on an isolated PostgreSQL service and browser flows with a simulated backend. Those tests do not configure your live provider or prove its deployment state.

If administrative access is connected using secure environment bindings, the CLI alternative is one command:

```sh
./scripts/setup-new-project.sh
```

It requires `CA_DATABASE_URL`, `CA_OWNER_EMAIL`, `CA_SUPABASE_URL`, and `CA_SUPABASE_ANON_KEY` in secure environment settings, plus `psql`. It creates the fresh schema, grants the owner, and writes public browser configuration. Google sign-in/project creation still requires the dashboards. Deploy only after checking the project URL and testing Google login; do not switch the current live app to an unconfigured database.
