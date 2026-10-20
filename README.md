# Congregation Assistant

Independent, unofficial congregation tools for publisher records, field-service reports, attendance, meeting schedules, assignments, duties and private report links.

The canonical website is [photographicode.github.io/congregation-assistant](https://photographicode.github.io/congregation-assistant/) and the app is at [/app/](https://photographicode.github.io/congregation-assistant/app/). The fictional admin demo is available at [/app/?demo=admin](https://photographicode.github.io/congregation-assistant/app/?demo=admin). `Congregation-Assistant_Public` is retained only as a path-preserving redirect for old links.

## Run and verify

Node.js 22 or newer is required.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
npm run check:bundle
npm run test:pdf
```

Focused browser, PDF, layout, interaction, accessibility, database and security checks run in the five workflows under `.github/workflows/`. Pull requests run bounded samples; the complete layout matrix runs on schedule or by manual dispatch.

## Architecture

- `apps/web/src/` contains the authenticated native app and public report forms.
- `apps/site/` contains the public website.
- `packages/core/` contains validated domain rules and repository contracts.
- `packages/ui/` contains shared themes, dialogs, pickers and interaction states.
- `packages/pdf/` contains the Noto-based measured PDF engine.
- `supabase/` contains additive migrations, RLS/RPC contracts and rollback files.
- `data/` contains normalized public meeting metadata.

`npm run build` creates `dist/` for the app and `dist-site/` for the website. `scripts/build-pages.mjs` packages the website at `/` and the app at `/app/`, using `BASE_URL`, `SITE_URL`, `APP_URL` and `CUSTOM_DOMAIN_READY` without embedding secret credentials.

## Security and privacy

The browser receives only the publishable Supabase key. Authorization is enforced by server roles, RLS and scoped RPCs. Demo mode does not contact Supabase. The on-device assistant never sends command text for parsing or training; it loads only records the signed-in role may access, previews writes before saving, and is restricted to Main Admin. OAuth secrets, service-role keys, DNS credentials and deployment tokens belong in provider settings.

The immutable `v1-final` tag and `tests/golden/v1/` retain the retired V1 reference. Legacy root apps and duplicate deployment trees have been removed from the active branch. Current evidence and known external limitations are recorded in [docs/POLISH-REPORT.md](docs/POLISH-REPORT.md) and [docs/qa/BUG-BASH-REPORT.md](docs/qa/BUG-BASH-REPORT.md).
