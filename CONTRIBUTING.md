# Contributing

Read AGENTS.md, DESIGN.md, CHECKLISTS.md and docs/V3-QUALITY-ORDERS.md. Use an isolated branch and fictional fixtures. Preserve the locked website, original forms and frozen goldens.

Use `npm ci --ignore-scripts`. Run the affected characterization test before changing behavior, then focused tests after the change. Run one browser/PDF spec at a time; development samples are limited to 300 views and six images. Full matrices run in Actions.

Use conventional commit titles (`fix:`, `feat:`, `refactor:`, `test:`, `docs:`, `chore:`). A changeset records a user-visible release change. PRs must describe behavior, validation, risks and rollback. Owner review is required for security, database, core, PDF, hosting and workflow changes.

Existing ESLint violations are recorded in the native bulk-suppression file. Do not regenerate or enlarge it to hide new violations; fix violations, then prune obsolete entries. Do not weaken tests, budgets or coverage thresholds. Log a fix that fails twice in docs/engineering/OPEN.md and move to the next independent task.

Deploy only after every quality gate passes. Production migrations require verified encrypted backups, isolated idempotency tests, additive/down paths and no data deletion. Do not use customer records in tests or logs.
