# End-to-end encryption: concrete release plan for review

Status: **not active**. The live Supabase records are not end-to-end encrypted. Password-encrypted backup exports protect the exported file only. The fictional experiment is not loaded by index.html, not included in the service worker, has no server API, and cannot migrate records.

## What encryption must protect

Private contact details, emergency details, dates of birth and service reports should become ciphertext before leaving an authorized device. Database operators and SuperAdmin would retain operational metadata but would not receive record-decryption keys. Membership and notification metadata must be minimized and explicitly disclosed. Public notice-board names and duties are deliberately published by an overseer; that minimal public projection is an intentional disclosure, not private encrypted storage.

A malicious operator who controls the JavaScript delivered to the browser can steal keys or plaintext after an update. E2EE cannot fully exclude that operator in the present hosted web app. Account compromise, unlocked devices, screenshots and exported PDFs remain outside database encryption. No “only you can access your data” claim is justified.

## Proposed access boundaries

| Scope | Intended readers | Revocation requirement |
| --- | --- | --- |
| Contacts and emergency details | Main administrator; individually approved records officers | Rotate scope keys; deny future reads; old decrypted copies cannot be recalled |
| Service reports | Main administrator and approved report officers; publisher's own reports | Separate publisher envelopes or equivalent scoped protocol; no broad publisher report key |
| OCLM draft | OCLM overseer and authorized assistants | Separate draft key from private records and from department keys |
| Department drafts | Own overseer and authorized assistants | Separate AV, Attendant and Cleaning keys and epochs |
| Public notice board | Anyone holding the public link | Publish names/duties only; revoking a link cannot erase copies already obtained |
| Support/SuperAdmin | Operational metadata by default | Reading private records requires an explicit reviewed temporary grant; cannot grant itself unnoticed |

These are **proposed**, not statements about current enforcement. The administrator currently has ordinary backend access. Existing features must not lose access while the protocol is evaluated.

## Protocol decision before integration

Compare a maintained implementation of [MLS (RFC 9420)](https://www.rfc-editor.org/rfc/rfc9420.html), which specifies authenticated group membership/epochs, with [HPKE (RFC 9180)](https://www.rfc-editor.org/rfc/rfc9180.html), which specifies recipient encryption but does not by itself solve group membership, device identity, rollback or recovery. HPKE needs an independently verified recipient directory and lifecycle protocol. No handwritten replacement for either protocol will be called production E2EE. Choose based on web/mobile support, audited implementation, maintained dependencies, persistent group-state safety and licensing. No new paid service is authorized.

The isolated Web Crypto experiment checks AES-GCM record envelopes only. Associated data binds congregation, data scope, record ID, key epoch and revision. Nonces are randomly generated, 96 bits; require a per-key usage limit and rotation before real deployment. Keys are non-exportable and exist in memory only. Expected context must come from verified local protocol state, not an untrusted server envelope. The test's rejection of a different expected revision is **not** a complete rollback-protection system.

## Device sharing and recovery proposed for review

1. An already verified administrator device confirms a new device's fingerprint out of band. Google sign-in alone does not verify an encryption key.
2. Group state/keys reach that verified device through the chosen protocol. The server stores ciphertext and signed membership events, never plaintext private keys.
3. Store device keys using reviewed non-exportable device storage. Never put plaintext keys in localStorage. A lost-device/revoked-member action rotates affected scopes and epochs.
4. Proposed recovery: two explicitly trusted administrator devices, plus an optional password-protected offline recovery package. No recovery download is required to publish ordinary schedules. Agree who may recover keys before activation; losing every key can make ciphertext unrecoverable.
5. New accounts must complete enrollment without revealing reusable credentials in an email. Recovery and recipient verification need simpler human-tested steps, not hidden automatic key trust.

## Migration sequence and go/no-go checks

- Inventory every plaintext write/read: direct publisher/report tables, report imports, transfers/PDFs, public forms, statistics, backups, queues, realtime and offline caches. Server statistics/search/exports must move to authorized clients or use a separately reviewed mechanism; these cannot silently keep plaintext copies.
- Implement authenticated device enrollment, scope sharing, recovery, signed epoch/rollback state, revocation and encryption of offline pending changes in a fictional environment first. Verify two devices, simultaneous edits, lost-device recovery, removed-member denial and tampered recipient directories.
- Prototype encrypted data APIs with deny-all direct table access, authorized ciphertext RPCs, version conflicts and audit metadata. No backend service key in the browser.
- Show a concrete reversible migration plan with record counts/checksums, encrypted backups, exact schema/API changes, maintenance window, rollback access and recovery owners. Obtain review before changing live data, access or keys.
- Run a pilot with fictional data and younger/older human testers. Then a narrowly authorized congregation pilot. Require an independent security review of protocol integration before advertising E2EE.
- Disable plaintext reads/writes only after all clients and background services are compatible. Check retained database backups/logs/exports separately; historical plaintext backup retention needs a real decision.

**Outstanding decisions:** recovery custodians; support emergency-access policy; encrypted public form submission approach; vetted browser-compatible group protocol/implementation; historical plaintext retention. No automatic live activation or key/data migration is included in this draft.
