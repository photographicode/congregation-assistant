# Release and database safety

Every quality gate must pass before merge or publication. A baseline records existing lint debt; it is not permission to increase debt. Failed coverage, style, layout, PDF, security or role-isolation gates block release. The earlier release bypass is superseded.

Use conventional commits and changesets for user-visible notes. Review sensitive paths through CODEOWNERS. The OWNER must configure protected main and production environment reviewers; repository files cannot enable those dashboard controls by themselves.

Database order: expand → validate/backfill → contract. Before any production migration, create an encrypted snapshot in an approved location, verify decryption and a real isolated restore, and record metadata-only evidence. Keep keys outside the repository/logs. Test the migration twice in an isolated database, test its down path, and run role/tenant/RLS contracts. A function-definition snapshot is not a data backup. Never delete production records as a migration shortcut.

Rollback application code by deploying a previously live-verified commit through the same pipeline. Database rollback uses the reviewed down path only if it preserves intervening data; otherwise restore into an isolated project and reconcile with the owner. Preserve original templates and golden PDFs. No rollback drill is claimed until a dated run demonstrates it.
