# V2 implementation decisions

2026-10-13. Source specification: V2-MASTER-README.md. Work branch: v2/all.

1. Keep the existing application operational while introducing a Vite/React/TypeScript strangler shell at `apps/web`. A build produces `/v2/` and a separately deployable `/site/`; `?ui=legacy` is retained. Do not switch the default before every release gate passes.
2. Preserve existing tested business logic through the legacy adapter. Database-dependent modules use an authenticated capability RPC; missing migrations show Update pending. No production SQL is applied by this task.
3. Implement shared tokens, themes, accessible dialogs, weekend scheduling, groups, setup, imports, messaging, delivery settings and privacy disclosure. New UI cannot claim production E2EE until full device lifecycle, migration and sentinel gates pass. Implement and test audited crypto primitives without enabling an incomplete privacy migration.
4. Centralize capability metadata for app/site. Website copy distinguishes implemented functionality, migration-dependent modules and optional services.
5. Existing GitHub Pages remains the deployment destination; do not replace its audience or silently create a different production site. Retain the public-site-preview compatibility path while adding apps/site.
6. Keep duplicate staging files until tests prove safe removal. Existing source-path contracts and rollback matter more than a premature directory move.
7. Use one dependency installation and bounded verification. Optional service keys, Android signing, legal review and authorization documents remain owner inputs. Never infer authorization for external publication content from the attached document's assertions alone.
