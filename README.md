# Congregation Assistant

Independent, unofficial congregation tools for publishers, service reports, attendance, meeting schedules and sharing. Access is controlled by approved accounts and server policies. Private mode is disabled until its complete device, recovery, migration and sentinel tests pass.

## Review and release status

The native candidate is available in the [private owner review](https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=admin). Use the owning ChatGPT account; the GitHub repository remains private. Publisher and command-centre demos use `?demo=publisher` and `?demo=owner`.

The Revival brief takes precedence: the existing main/V1 release stays default until every native screen passes parity. This branch is a review candidate, not a completed cutover. `v2-screen-flags.json`, [PARITY](docs/PARITY.md) and [CUTOVER-REPORT](docs/CUTOVER-REPORT.md) show remaining work. Production release checks deliberately block incomplete screens. Custom domains and mail are prepared but unlinked; provider credentials and assigned DNS values are still required.

Home now has real scoped repositories, month selection, KPI filters, monthly submissions, direct bulk entry and user-initiated reminders. Calm/Balanced/Lively, Glass themes and account-separated device preferences share the same tools. Native PDF Studio, report CSV/bulk/year logs, emergency contacts and the owner request/directory UI are available for review. Real cross-device appearance acceptance, complete V1 parity, production permissions/performance acceptance and E2EE lifecycle remain unfinished.

## Run

Requires Node.js 22 or newer.

```sh
npm i
npm run dev
npm test
npm run check
npm run build
npm run test:browser
```

`dist/` is the Vite app at the deployment root. `dist-site/` is the separate public website. `npm run preview` serves the compiled app and its website under `/site/` for local review. Fictional demonstrations use `?demo=admin` and `?demo=publisher`; they must never call the backend.

## Architecture

- `apps/web/src/main.tsx`: authenticated shell and role-filtered navigation.
- `apps/web/src/v2/`: native screens, public forms, appearance and cryptography.
- `apps/web/src/data/`: workspace-scoped, validated repository factories. Query state uses TanStack Query. Supabase policies and RPCs enforce authorization independently of navigation.
- `packages/ui/`: shared tokens, accessible dialogs and greeting component.
- `apps/site/`: public website with a fictional, interactive product tour.
- `supabase/`: database contracts, migrations and owner-run rollout scripts.

Legacy source remains temporarily because the complete native parity gate is not met. It is excluded from both generated deployment outputs. See [parity](docs/PARITY.md) and the [cutover report](docs/CUTOVER-REPORT.md). This branch is not a completed production release.

## Configuration and deployment

`public-config.json` contains non-secret `SUPPORT_EMAIL`, `PUBLIC_SITE_URL` and `APP_URL`, plus verified domain/mail readiness flags. The support address is intended configuration; its mailbox is not provisioned by this repository. `BASE_URL=/` builds for a custom-domain root; `BASE_URL=/congregation-assistant/` builds for project GitHub Pages. `VITE_BUILD_HASH` is generated automatically.

The browser uses a publishable Supabase key, never a service-role key. The existing project configuration is in `apps/web/src/v2/client.ts`. OAuth secrets, DNS credentials and hosting tokens belong in provider settings or a secret manager. SQL is not applied by a front-end build. See [database rollout](docs/DB-ROLLOUT.md), [domain setup](docs/domain-and-email.md), and [owner tasks](docs/OWNER-TODO.md).

The deployment workflow builds and uploads compiled artifacts. It deliberately requires the full cutover release gate before publication. Do not bypass that gate to remove missing product capabilities.

## Security and verification

Approved Google accounts, email links and scoped public tokens replace shared password UI. SuperAdmin authorization must remain approved Google only. Public tokens enter through URL fragments and are removed from the address bar; the scoped weekend session is separate from its bearer. CSP disallows external scripts and frames. Protected data is not cached by the service worker.

`npm run check` runs V2 unit/contrast/source checks and TypeScript. `npm run check:bundle` checks generated app/site output for legacy markers. `npm run check:release` additionally checks retained legacy source and incomplete parity. Browser checks cover narrow screens, doubled text, dialogs, report submission, demo isolation, redirect behavior and old cache migration. `CA_LAYOUT_FULL=1 npm run test:browser` enables the larger layout matrix. Backend contract tests and real account acceptance must pass before production release.
