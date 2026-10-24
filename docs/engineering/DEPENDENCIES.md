# Dependency maintenance

Generated from the committed lockfile, 2026-10-23. Production `npm audit --omit=dev --audit-level=high` passed (0 vulnerabilities). OSV has a separately tracked unresolved braces advisory; npm audit is not proof that OSV is clear.

| Dependency | Resolved version | Upgrade plan and risk |
|---|---|---|
| react | 18.3.1 | Separate planned major PR; no launch bulk upgrade. Validate rendering, build/CSS, offline and PDF/browser acceptance. |
| react-dom | 18.3.1 | Separate planned major PR; no launch bulk upgrade. Validate rendering, build/CSS, offline and PDF/browser acceptance. |
| vite | 6.4.4 | Separate planned major PR; no launch bulk upgrade. Validate rendering, build/CSS, offline and PDF/browser acceptance. |
| tailwindcss | 3.4.17 | Separate planned major PR; no launch bulk upgrade. Validate rendering, build/CSS, offline and PDF/browser acceptance. |
| typescript | 5.9.3 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| @supabase/supabase-js | 2.57.4 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| zod | 4.1.12 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| pdf-lib | 1.17.1 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| @pdf-lib/fontkit | 1.1.1 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| playwright | 1.62.1 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| vitest | 4.1.12 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| wrangler | 4.151.3 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |
| fflate | 0.8.3 | Patch/minor updates grouped weekly; major changes reviewed separately with focused contracts. |

React 19, Vite 7 and Tailwind 4 require separate compatibility work; current launch hardening does not bundle major upgrades. See `.github/dependabot.yml` and `.github/workflows/security.yml` for weekly grouping, immutable actions, full-history scans, OSV and production SBOM/license checks.
