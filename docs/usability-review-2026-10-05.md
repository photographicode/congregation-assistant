# Everyday-workflow review — 5 October 2026

Reviewed from main 87068d4 and website e3a469a, rather than assuming older reviews describe this release. No congregation records were migrated or deleted. Screenshots and browser tests use fictional fixtures and block production database requests.

| Task | Shortest clear sequence | Confirmation and recovery | Review outcome |
|---|---|---|---|
| Sign in | Continue with Google → approved workspace | Denied access explains account approval; sign-out returns to login | Existing server approval retained; essential styling now bundled so hidden dialogs do not depend on a styling CDN |
| Request access | Request trial → authorized request → reference | A saved request is separate from an unsent email draft | Existing server request retained; alternate public email now uses the approved support address |
| Publisher Home | Read next assignment or open named reporting month | Online-save result remains next to report; failure keeps entries | Reporting month appears in heading; optional comment collapsed; failed Home loading has Try again |
| Administrator Home | Open the task needing attention | Task summary plus familiar navigation | Failed task-summary loading offers Try again |
| Reports | Choose period → enter report → save | Rejected writes retain entries | Existing report and recovery safeguards retained |
| Attendance | Choose meeting/month → enter count → save | Saved result; unsaved month draft retained | Existing hidden PDF render areas remain hidden; no speculative removal of useful attendance data |
| Schedule | Choose week → assign people → review | Save label distinguishes device and online draft | People setup is secondary; stale device-only wording corrected |
| Publish | Check warnings → expand full schedule if needed → Publish this week → Open live | Durable publication state and stable link; rejected publication preserves previous live week | One publish action; full paper preview collapsed initially; phone publish target enlarged; review opens at the review controls |
| Duties | Expand Additional Duties → define slots → qualify → assign → publish | Definitions are draft state; publishing exposes assigned names | Existing qualification, auxiliary-classroom and disable/preservation behaviour retained |
| Reminders | Set desired reminders → save → check next times | Device/calendar reminders differ from background delivery | No delivery promise before sender activation and real delivery test |
| App installation | Browser install or Safari Share → Add to Home Screen | Installed-app guidance; ordinary browser still works | Existing Android and iOS guidance retained |
| Notifications | Enable notifications → Test this device → Settings help if missing | Device display test is explicitly separate from background delivery | Duplicate enable controls removed; background options secondary; registration wording does not imply delivery |
| Recovery | Export encrypted backup → keep password → rehearse restore | Fingerprint prevents replacing changed data; wrong password/tamper rejected | Existing workspace recovery retained; website no longer describes only contact/report exports |
| Settings | Choose readable appearance / larger text | Persistent appearance; access unaffected | Larger-text alert offset corrected above navigation |
| SuperAdmin | Review requests → set up workspace; review status and access | Server owner check, manual payment status, clear expired trials | Existing owner dashboard retained; broad support access disclosed rather than promising exclusive congregation access |

## Trust and presentation
Founder wording uses only the approved India/full-time-service description. The FAQ makes independent and unofficial status clear. Public support is congregationassistant0@gmail.com. Device frames are charcoal; screenshot colours remain the actual app colours. Shared-link bearer access and owner/backend access are explained. Policy and Terms drafts are excluded from release pending requested changes and approval.

## Delivery preparation
Existing workers are deployed, but deployment does not establish delivery. Prepare Brevo with congregationassistant0@gmail.com only after Brevo verifies/accepts it. Configure keys privately in Supabase. Push requires VAPID signing keys, browser public key, private scheduled invocation, and a closed-app test including iOS Home Screen. No credentials belong in chat or source. Do not advertise remote delivery until provider receipts and actual receipt are verified.

## Human acceptance still required
Use fictional records with a younger first-time user and an older first-time user. Without coaching, ask each to sign in, find their next assignment, submit the named month's report, record attendance, publish one week and check its live schedule, then retry a failed save without losing work. Observe wrong turns, missed confirmations, text enlargement and device notification settings. Automated checks are not a substitute for these sessions.
