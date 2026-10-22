# 0003 — Gate encryption claims on complete Vault evidence

Status: accepted restriction; full Vault acceptance is not established.

Retain PlainStore and the Store abstraction while completing the device, migration, recovery, revocation and sentinel contracts for Vault. Do not advertise end-to-end encryption merely because a cryptographic library or encrypted record format exists.

Encryption changes must define what remains visible to the service, key ownership, device enrollment, recovery, revoked-device behavior and the loss model. A successful happy-path encryption round trip is insufficient. Migrations must preserve production data and require a verified encrypted snapshot plus an isolated restore drill before any production change.

Keep secret material out of logs, diagnostics, fixtures and support reports. The local assistant's network isolation is a separate property from encryption at rest or end-to-end encryption; test and describe each separately.

Evidence: AGENTS.md, docs/engineering/RELEASE.md, packages/core/store.ts and the existing Vault-related tests. Open requirements remain in CHECKLISTS.md and docs/engineering/OPEN.md; this decision does not certify cryptographic completeness.
