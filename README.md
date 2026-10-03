# Congregation Assistant

A static browser application for publisher records, service reports, attendance, emergency contacts, and midweek scheduling. There is no production build step. Serve `index.html`, `app.css`, `app-support.js`, and `pdf-tools.js` together.

## Run locally

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. Use HTTP locally and HTTPS in production; OAuth and clipboard behavior should be checked using a served URL rather than opening the HTML file directly.

The browser loads Tailwind, the Supabase JavaScript client, PDFLib, and Google Fonts from their CDNs. If the cloud client fails to load, the app still initializes and displays a reload notice. Cloud saves require a working connection. `npm install` is only needed for the development checks below.

## Development checks

Node.js 18 or newer is recommended.

```sh
npm install
npm test
```

The checks use a small DOM fixture and an in-memory Supabase stand-in. They exercise startup, button references, themes, scheduler navigation, error recovery, imports, cache isolation, reporting dates, attendance updates, and all four PDF exports. They do not contact or modify the production database.

Sample PDFs are written to a temporary directory, whose location is printed after the tests. To use a specific output directory:

```sh
CA_CHECK_OUTPUT=/tmp/congregation-pdf-check npm test
```

With Python and Poppler installed, check text coordinates and render the generated files for visual review:

```sh
python3 scripts/check-pdf-layout.py /tmp/congregation-pdf-check --render
```

Browser acceptance checks run with an isolated in-memory backend and block production Supabase traffic:

```sh
npx playwright install --with-deps chromium webkit
npm run test:browser
```

The GitHub `Application acceptance` workflow runs the regression/PDF checks and browser suite on pull requests. Browser coverage includes desktop Chromium, mobile Chromium at 390 pixels, and mobile WebKit at 375 pixels; a 1,000-publisher fixture; repeated tab switching; draft retention; rejected and successful attendance saves; dialog closing; real PDF downloads; scheduler navigation; and screenshots for seven themes. Results, screenshots, and PDFs are uploaded as workflow artifacts. Screen emulation still requires follow-up on physical devices.

A read-only Supabase metadata audit and tenant/role verification checklist are in [supabase/README.md](supabase/README.md). The audit must be run against a configured project before an authorization migration can be designed safely.

The PDF checks verify page bounds and the S-3 congregation/month field boundary. A human should still review alignment, print scaling, and physical printer margins.

## Interface and PDF behavior

- Appearance settings offer Lagoon, Blue, Crimson, Green, Scheduler, Daylight, and Midnight. The selected theme persists on the device. PDF appearance stays independent of these themes.
- Forms retain their values after rejected saves. Busy buttons prevent repeated submissions, and errors remain visible long enough to read.
- Public attendance accepts both meetings and lets the submitter select the reporting period. Blank counts leave existing counts unchanged, and saves update only entered fields.
- CSV backups preserve quotes, commas, multiline remarks, publisher IDs, household links, and emergency fields. Legacy contacts files can still be imported. Imports commit locally after the cloud batch succeeds.
- S-21 keeps the supplied official form, uses bounded fields, and moves overflowing remarks to a continuation page without losing the full text.
- S-3 name and month entries sit above the dotted line, with measured width and baseline checks.
- Dashboard, publisher, and missing-report tables show 50 records per page; exports still include the full selected dataset. Bulk-entry forms render in one batch and keep every input available to save.
- Mobile navigation avoids redrawing hidden scheduler views and clears stale dialog scroll locks. Attendance drafts survive tab changes until saved, scoped to congregation and reporting month. Touch activity throttles synchronous storage writes, and mobile panels avoid expensive backdrop blur.
- S-3 and S-88 keep their supplied official templates and use dark text suitable for printing.
- Emergency contacts export as selectable PDF text with measured row heights, repeated page headers, family continuation labels, and grayscale rules. Long rows can continue onto another page.
- The PDF fonts currently support the standard Helvetica character set. Names in unsupported scripts produce an explicit Unicode-font error; they are not silently replaced. Full multilingual PDF support still requires an embedded Unicode font and font shaping support where applicable.

## Backend setup and production blockers

The HTML points to an existing Supabase project. The new project has the verified fresh schema and role policies. The original project remains unaudited and is still selected by the live configuration. See [connection-audit.md](supabase/connection-audit.md) for the activation blocker and live SQL checks.

The data workflows require these tables: `congregations`, `publishers`, `reports`, `meeting_attendance`, `group_access`, and `congregation_access`. Optional wipe-request logging uses `wipe_requests`. Legacy OCLM cloud helpers also reference `get_oclm_state`, `save_oclm_state`, `upsert_oclm_public_snapshot`, and `get_oclm_public_snapshot` RPCs; their definitions are absent here. The current midweek scheduler saves drafts to congregation-specific browser storage and publishes sanitized snapshots through the stable public snapshot RPCs. `supabase/fresh-project.sql` defines the new project contract; it has not been applied to a live project.

The embedded “Copy setup SQL” action only sketches the role-access table and enables RLS. It does not implement complete authorization. Google sign-in needs the Google provider enabled, redirect URLs configured, an authenticated admin identity mapping, and verified policies/RPCs that enforce the intended permissions.

The existing project's legacy admin and group-password workflows still use browser-side database filters. The exposed Superadmin master password has been removed; Superadmin now requires a verified Google account approved by `ca_is_superadmin`. Fresh projects use `secureBackend: true`, verified memberships, role policies, and capability-limited public forms. The existing project has not been migrated or audited: do not treat client-side restrictions as a production authorization boundary.

Public report and attendance links identify a congregation in the URL. Their actual read/write scope depends on backend enforcement. Verify public-link permissions and cross-congregation isolation against the project before enabling these workflows for real users.

Midweek drafts are stored under congregation-specific browser keys. Publishing updates a cloud snapshot and keeps one token-based URL per congregation. Public pages refresh every 30 seconds and on focus/visibility changes. Failed publishing preserves the previous link/snapshot. Only assigned names and published assignments enter the snapshot; contacts and unrelated roster entries do not. The old `#live=` and encoded `data=` links remain snapshots and cannot receive future updates or be revoked; replace them with the new token link. The draft editor is still device-local; shared draft editing is a future step.

## Verification status

The current revision passes 34 command-line regression checks and coordinate checks for all four generated PDF samples. The samples were visually reviewed, including long names, overflowing remarks, event markers, large families, and long addresses.

Browser acceptance now runs in GitHub Actions with an isolated backend. Desktop Chromium, mobile Chromium, and mobile WebKit passed navigation with 1,000 publishers, attendance draft retention, rejected and successful saves, modal closing, actual PDF downloads, scheduler views, and all seven themes. Browser runs exposed and fixed two interaction bugs: Escape targeted a modal title instead of its container, and an invisible toast intercepted bottom-navigation taps. Screenshot review also corrected desktop sidebar overlap and Daylight label contrast. The workflow checks sidebar positioning and stores screenshots and results as artifacts.

Local browser execution remains blocked by `EPERM` on the HTTP listener. Physical devices, live Supabase authorization, OAuth, and clipboard permissions still need verification. The new-project schema and policies have been audited through Supabase; rollback contract tests passed. Google OAuth is disabled and real-account sign-in remains unverified.

For additional browser acceptance testing, use an isolated test Supabase project or an intercepted backend. Exercise each navigation tab, each dialog's cancel/save/error states, imports/exports, shared public links, and all themes at desktop and phone widths. Check the browser console for errors and inspect actual downloaded files. The new project received reviewed performance migrations; all synthetic SQL test data was rolled back. Browser fixtures never write production records.

## Published website

The existing site is [GitHub Pages](https://photographicode.github.io/congregation-assistant/), published from `main`. Pull-request branches are tested but do not update this website until merged. The `Published website verification` workflow waits for the deployed HTML, CSS, and helper scripts to match the commit, then runs the isolated browser acceptance suite against that HTTPS URL. It intercepts the cloud client and blocks production Supabase requests, so verification does not change live database records. Deployment hashes, screenshots, and browser results are saved as workflow artifacts.

If a browser still shows an older interface after a successful deployment, reload once with cache bypass or reopen the site in a private window. Deploying this frontend does not establish the existing backend's authorization guarantees; the audit described above is still required.

## Navigation and Google accounts

The mobile Menu includes every permitted section, plus help, announcements, appearance settings, and sign-out for all roles. Large labeled controls and a scrolling menu sheet keep options reachable on small screens. Desktop sections stay together without a spacer. S-3 name/month fields now have 4pt of left padding.

Google sign-in handles multiple roles, congregation selection, denied memberships, and expired sessions. Limited-role sessions fetch only their relevant data categories, and changing navigation context cannot grant extra screens. Backend RLS must enforce the same permissions. See [Google provider activation and account setup](supabase/google-sign-in.md); the new Google provider must be enabled in the dashboard before activating the project.

## New backend and public website

See [new-project.md](supabase/new-project.md) for a guarded fresh schema, Google owner setup, data migration boundaries, and a one-command CLI setup once secure administrative access is connected. The new project `ejosykrxjvwrhxfnputo` is configured and connected. Its Google provider is disabled, so activation remains pending. `app-config.js` retains the current project until a tested new one is configured. New congregations default to a 30-day trial, with an introductory ₹1,499/year offer and manual payment records; there is no payment gateway or automatic charge. The separate public site is maintained in `photographicode/Congregation-Assistant_Public`.

The app can be added to a home screen through its manifest and Install app menu item. Its service worker caches public app files only and checks the network first; it does not cache Supabase responses or provide offline cloud editing.
