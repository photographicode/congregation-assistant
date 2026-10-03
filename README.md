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

The HTML points to an existing Supabase project. This repository has no verified database migrations or authoritative RLS policy definitions. Do not assume that the existing project has the required tables or permissions simply because a client key is present.

The data workflows require these tables: `congregations`, `publishers`, `reports`, `meeting_attendance`, `group_access`, and `congregation_access`. Optional wipe-request logging uses `wipe_requests`. Legacy OCLM cloud helpers also reference `get_oclm_state`, `save_oclm_state`, `upsert_oclm_public_snapshot`, and `get_oclm_public_snapshot` RPCs; their definitions are absent here. The visible midweek scheduler currently saves to browser storage rather than those RPCs.

The embedded “Copy setup SQL” action only sketches the role-access table and enables RLS. It does not implement complete authorization. Google sign-in needs the Google provider enabled, redirect URLs configured, an authenticated admin identity mapping, and verified policies/RPCs that enforce the intended permissions.

The legacy admin and group-password workflows use browser-side password checks/database filters. The superadmin credential is also present in the browser source. These mechanisms are **not a production authorization boundary**. Before using the app with real congregation data, replace them with authenticated server-enforced authorization, remove/rotate the exposed master credential, and verify isolation for every table and RPC. The public Supabase anon key itself is intended to be public; database policies must enforce access.

Public report and attendance links identify a congregation in the URL. Their actual read/write scope depends on backend enforcement. Verify public-link permissions and cross-congregation isolation against the project before enabling these workflows for real users.

Midweek data is now stored under congregation-specific browser keys. Existing unscoped scheduler data is copied to the first authenticated congregation that opens the scheduler, and the original keys are retained. New installations start with an empty roster. SFTS overrides remain device-local. Shared scheduler links contain a snapshot: copy and resend an updated link after changing a published schedule. An already-sent link does not update automatically, and removing a week from a new link does not revoke old links.

## Verification status

The current revision passes 26 command-line regression checks and coordinate checks for all four generated PDF samples. The samples were visually reviewed, including long names, overflowing remarks, event markers, large families, and long addresses.

Real-browser checks could not run in the managed environment: both local HTTP sockets and Chromium were rejected with `Operation not permitted`. Network-enabled retries were interrupted before execution. CDN reachability, live Supabase permissions, OAuth, actual browser downloads/clipboard, keyboard focus behavior, and desktop/mobile visual layouts remain unverified.

For browser acceptance testing, use an isolated test Supabase project or an intercepted backend. Exercise each navigation tab, each dialog's cancel/save/error states, imports/exports, shared public links, and all themes at desktop and phone widths. Check the browser console for errors and inspect actual downloaded files. No production Supabase data was changed during this review.
