# 0001 — Native web application stack

Status: accepted; quality migration in progress.

The native application uses React 18, TypeScript, Vite, TanStack Query, Zod and the Supabase client. Shared domain logic belongs in packages/core, reusable presentation in packages/ui and document generation in packages/pdf. The public marketing site is a separately built, locked design.

Keep this stack during refinement. Replacing it would increase the behavior that needs characterization without resolving the measured component, CSS and access-control gaps. Validate data at boundaries with Zod and use query caching for asynchronous state. Do not introduce a second application implementation or embed V1 in an iframe.

Evidence: apps/web/package.json, apps/web/src/main.tsx and .dependency-cruiser.cjs. The intended repository layer is not yet fully extracted from features; see docs/engineering/OPEN.md. Dependency upgrades require the existing tests, browser/PDF contracts, licence policy and supply-chain scans.
