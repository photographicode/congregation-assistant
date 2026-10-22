# Reporting a vulnerability

Email security@congregationassistant.com with the affected version and steps to reproduce. Do not include congregation records, credentials or exported documents. Please report vulnerabilities privately before public disclosure. This project has not undergone an independent security audit.


Engineering controls and current gaps are tracked in CHECKLISTS.md and docs/engineering/EVIDENCE.md. CI scans full-history secrets, source security, production dependencies and SBOM/licences. A configured scanner is not a completed security audit; passing results and remaining scope must be reported. New action references require verified immutable upstream commits.

GitHub Pages cannot supply application-controlled HSTS or frame-ancestors response headers. The app retains its CSP meta policy; Cloudflare hosting is required for the complete header policy. Domain purchase alone does not activate that deployment. The OWNER must verify provider origins, protected branches/environments, session configuration, mailbox delivery and security contact routing.

See docs/engineering/THREAT-MODEL.md and docs/INCIDENT-RUNBOOK.md for assets, role boundaries and incident handling. Diagnostics remain local and exclude messages/stacks/record contents. Never attach customer data, live tokens, service keys or unencrypted backups to issues or CI artifacts. No independent penetration test or guaranteed response time is claimed.
