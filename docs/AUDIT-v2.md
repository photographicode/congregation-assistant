# V2 audit — current scope, 15 October 2026

The native candidate uses React escaping, local dependencies and role-filtered navigation, with authorization enforced by Supabase policies/RPCs. Public endpoint/publishable key are in public-config.json. No privileged key belongs in that file. Demo auth persistence/URL-session detection are disabled and tested browser flows make no backend calls. Account changes clear query state; device appearance is scoped per account and congregation.

Native PDFs now use original templates, embedded fonts and HarfBuzz shaping for eight Indian scripts. Seventeen golden fixtures, font/template hashes, selectable-text and pagination checks are documented in PDF-PARITY.md. Earlier notes describing missing native/Indic PDFs are obsolete. Latin font embedding causes explicitly measured visual differences; owner review remains required.

The current isolated SQL evidence covers additive V2 contracts, extended publisher fields, household cycles, own-session isolation, native export, expiry/expired-admin recovery and configured mail links. The new combined migration passed first and repeat runs. These tests do not constitute a complete role×RPC×tenant/anonymous abuse audit. Full rollback and recovery-format parity are unfinished.

Presentation acceptance includes 79 unit checks, fourteen theme contrast sets, six desktop/phone dashboard cases and targeted layout/browser suites. The complete physical-device, screen-reader, throttled performance/FPS, Lighthouse and full expanded matrix remain open. Source release gates intentionally fail, every whole-screen release flag remains false, and V1 source stays frozen until parity passes.

Private mode/E2EE claims, optional official-content import and WhatsApp Business remain disabled. Device/key/recovery/revocation/migration/sentinel lifecycle, support-access logging, full backup restore/transfer/wipe and several native product workflows remain unfinished. Repository security workflows and Dependabot are configured; that does not prove a completed clean scan.

Previous dependency checks found zero production advisories and remaining Tailwind-3 development glob advisories; no fresh all-dependency audit is claimed here. Real OAuth, transactional delivery, Cloudflare credentials, GoDaddy delegation, Titan records, custom-domain TLS and production CSP/cache behavior remain external acceptance tasks. DNS lookup attempts in this managed environment returned resolver connection failures, so current public DNS readiness was not established.
