# Private-mode threat model

Goal: an honest, opt-in mode where the service stores only ciphertext for the documented sensitive scopes and cannot decrypt it. This goal is not met by the current release and Private mode remains unavailable.

Assets: publisher identity/contact data, appointments, dates, reports, attendance, draft/published schedules, visiting speakers, offline work and backups; admin/principal identity keys, scope epoch keys and recovery secrets.

Trust boundaries: account authorization does not establish cryptographic access; download authorization is checked by server RLS/RPCs, while decryption is checked by possession of a wrapped scope key. The server must not assign publisher group scope keys. Households receive report-intake envelopes for their principal only. URL fragment keys must never be sent to the server.

Threats: a malicious/compromised operator, record tampering, wrong-scope substitution, replayed revisions, forged public keys, revoked devices retaining old keys, lost recovery material, XSS, compromised dependencies, hostile imports and accidental plaintext in logs/caches/exports.

Limits: app hosting administrators can replace delivered code. CSP, no third-party scripts, build identification, reproducible instructions and explicit updates mitigate but do not remove this trust. Compromised devices, screenshots, PDFs, exported plaintext and already copied records cannot be recalled. Login emails, IDs, role/group metadata, scopes, timestamps and sizes remain visible. Older database backups may retain pre-migration plaintext until retention expires.

Unimplemented mitigations are tracked in AUDIT-READINESS.md. Do not describe them as active protections.
