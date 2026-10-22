# 0002 — Store interface and local-first behavior

Status: accepted; repository adoption incomplete.

Use the Store interface for cached reads and staged writes. Domain repositories define tenant-scoped requests and parse responses. The UI displays loading, conflict, offline and forbidden states rather than treating cached data as proof that a server write succeeded.

Keep local preference storage separate from congregation records. packages/core/storage.ts preserves existing preference formats, guards unavailable browser storage and provides an in-memory fallback. The diagnostic ring is memory-only and never records supplied exception text.

Offline availability is capability-specific: a document generated after its first successful load does not prove that all data, fonts or mutations work offline. Account switching and sign-out must clear the relevant store/account scope. Retry only safe operations; a staged mutation must retain its idempotency/conflict contract.

Evidence: packages/core/store.ts, packages/core/repositories.ts, packages/core/storage.ts, packages/core/errors.ts and scripts/check-pdf-browser.cjs. Several feature calls still bypass typed repositories; completing that migration is Q5 work.
