# Incident response

1. Record a minimal reference/time/severity locally. Preserve audit metadata without copying publisher names, reports, tokens or backup keys into chat/issues/logs.
2. Contain the affected path: revoke compromised credentials/links, stop unsafe writes, or roll back to a verified artifact. Preserve evidence and avoid deleting data.
3. Determine affected tenants/data and earliest/latest exposure with access-controlled evidence. Involve the OWNER and appropriate legal/security contacts.
4. Apply and test a fix in isolation, verify authorization/tenant boundaries, and stage recovery before restoring normal access.
5. OWNER/legal counsel determines applicable notifications and statutory deadlines, including the requested 72-hour planning window. This document does not assert that one deadline applies to every incident or jurisdiction.
6. Communicate confirmed facts, impact, workarounds and next update time. Do not promise resolution before it is known.
7. Document root cause, measured recovery, action owners and prevention tests. Run a tabletop/restore drill and retain dated evidence.

Escalation contact is the configured security email in public-config.json and security.txt. Account access, alert routing and delivery acceptance require OWNER verification. Never invent an incident, breach notification or completed exercise.
