# New-user walkthrough and audit follow-up — 4 Nov 2026

The walkthrough followed a new congregation from the website to sign-in, then the admin demo (setup guide, people, reports), the publisher demo (home, report form) and the owner demo. Live pages were read in the browser at phone and tablet widths. Fixes were checked on the local dev build. No real account was signed in and no form was submitted on the live site.

## Blocking issue found

**A new congregation had no way to join.**
- The sign-in page offered only Google sign-in and the demos.
- Its "Request a workspace" link and the pricing page's "Contact us about access" both led to the Contact page, which says support email is not active.
- The database already had a request function (`submit_workspace_application`), but no screen used it.

## Fixed in this change

| Area | Before | Now |
| --- | --- | --- |
| Joining | A dead end (above) | `/app/?request=workspace` is a request form. Sign-in, the no-access screen, pricing and contact all link to it. Requests appear in the Command centre, as before |
| Territories | The site promised splitting maps and printing cards as app features | The site says Congregation Assistant manages territories, and that making maps is a separate service requested at `/app/?request=territory` |
| Territory tracking | — | The Command centre lists territory map requests with New / In progress / Done / Declined, the contact's email and the date |
| Report links | "All publishers" made one link that covered the whole congregation | Links cover one group. The database refuses new congregation-wide links; existing ones keep working until rotated |
| Congregation record | Every role could read the congregation's email, notes, billing and wipe fields | Members read the name, status and feature switches only. The owner reads the rest through `ca_owner_congregations()` |
| Role list | Re-running `collaborative-departments.sql` dropped the `cleaning` and `weekend` roles | One complete role list everywhere |
| Rate limits | Random tokens from one address added a database row each, and rows were kept 2 days | The address is checked first, and old rows are purged after 2 hours |
| Greeting | "Hello this evening" with "Daniel." on its own line | One line: "Good evening, Daniel." (the wording varies by day) |
| Setup guide, basics | Free-text day and time boxes; "Wed" or "7pm" failed with a server error | Day buttons (Mon–Sun) and time pickers |
| Setup guide, privacy | Offered an unreleased "Private — verification pending" mode with E2EE warnings | Standard mode only, explained in plain words |
| Setup guide, wording | "dropdown list", "stable live link", "once your account is approved" | Plain sentences |
| Reports | "1 studies", "0 hours" for publishers, "1 auxiliary pioneers", "Reporting month: 2026-10" | "1 study", hours shown only when reported, "1 auxiliary pioneer", "October 2026" |
| Add publisher | The name box stretched to the height of the gender buttons | Normal height |

## Owner actions (in order)

1. Back up the database.
2. In the Supabase SQL editor, run `supabase/migrations/20261104120000_security_hardening.sql`.
3. Then run `supabase/migrations/20261104130000_audit_followups_territory_requests.sql`. Until it runs:
   - the territory form tells visitors to email support;
   - the Command centre says territory requests turn on after the update;
   - the owner console reads congregations the old way.
4. In Supabase, go to Authentication → Sign In / Providers and turn off **Email**. The app signs in with Google only.
5. Finish the support@ mail test, then set `mailConfigured: true`. Until then, approved workspaces get no welcome email: copy the welcome letter from the request review and send it yourself.

## Still open

### Product

1. **Territory Management is not in the app.** The site lists it as "Up next". Requests can be taken now; the manager itself still has to be built.
2. **Mail is not sending.** Welcome letters and reminders queue up but are never delivered while `mailConfigured` is false.
3. **The welcome letter may link to the old address.** `workspace-applications.sql` writes `photographicode.github.io/congregation-assistant/`. Check whether `20261014121628_v2_configured_mail_links.sql` replaced it on the live database.

### Admin experience

4. **Home repeats itself.** "Submitted 3 / 4" and "Monthly submissions 3 of 4" both show, the missing publisher appears twice, and the group link cards show on Home and again in the last setup step.
5. **Raw months remain on Home.** For example "SFTS monthly totals 2026-10" and "Group report links 2026-10".
6. **Jargon:**
   - "SFTS"
   - "Auxiliary Pioneer Review Log"
   - "Review mapped APs"
   - "Revoke" next to an auxiliary pioneer, which does not say what it undoes
   - "Last submission: No submission time recorded"
7. **Slogans as page headings,** such as "A place for all." (Publishers) and "Keep reporting simple." (Reports). A heading should name the page.
8. **Add publisher:**
   - The save button reads "Save publisher & email".
   - The group picker still looks like a dropdown.
   - Full name is required but has no required marker.
9. **Setup guide:**
   - "Delivery mode" mentions a "scoped personal link" and an "optional Business service" that does not exist.
   - The Schedule step says midweek and weekend but opens only the weekend schedule.

### Publisher experience

10. **Extra step to report.** "Submit report" on Home opens the household list, not the form.
11. **Wrong list contents.** The publisher appears in their own "People you report for" list.
12. **Admin button shown.** A publisher sees "Print monthly roster".
13. **Dropdown.** The publisher picker in the report form is still a dropdown.

### Operations

14. **Unexplained deploy failure.** The deploy for `3023f4d` failed at "Compare every published file and audit the live bytes". That commit changed only SQL and docs, so it is probably a cache race. The logs need `gh` or a GitHub token to read.
15. **Missing security headers.** GitHub Pages cannot send HSTS or frame-ancestors (see `docs/security/SECURITY-AUDIT-2026-11-04.md`).

## How the fixes were checked

- **Database:** both migrations, their down files and a second run were applied in PGlite, an in-memory Postgres, on top of `fresh-project.sql`, `workspace-applications.sql` and the rate-limit migration. The tests showed:
  - The owner reads the full congregation record; publishers and admins get "permission denied" on email and notes.
  - An email-password sign-in is not owner.
  - A congregation-wide report link is refused; group and attendance links still work.
  - Territory requests are rate-limited after 3 an hour, the honeypot field rejects bots, and only the owner can list or update them. A status change keeps the saved note.
  - Workspace requests are limited to 3 an hour, and `get_public_attendance` is closed to anonymous callers.
- **App:**
  - Strict types and eslint report nothing new in changed files.
  - The style and CSS audits report nothing new; the only remaining finding is in `oclm.css`, which this change did not touch.
  - The greeting tests pass (6 of 6), and the app and site builds pass.
  - The marketing-site browser check passes.
  - Both request forms, the owner's territory list, the setup guide, the reports list and Add publisher were checked in the dev build.
