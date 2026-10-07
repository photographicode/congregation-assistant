# OCLM simplicity and accessibility review — 7 October 2026

## Changes and reasons

- One visible week selector replaces the duplicate nearby-week browser and arrows. This week remains a quick reset. Existing saved weeks are retained in the selector.
- Assign the whole week fills remaining meeting parts and missing assistants. Existing assignments and titles stay. Undo restores the preceding meeting draft.
- Section headings are labelled buttons with expanded state and controlled content. Small phones start with Treasures expanded; other sections can be reviewed separately. Part timing is a secondary control.
- Publisher appointment, name and gender refresh from the congregation roster; linked facts cannot be edited in the meeting roster. Qualifications and availability are separate meeting settings. Existing identifiers, qualification exceptions, department roles and assignment history stay.
- Away date pickers replace the need to type date ranges. An expandable list remains available to review and remove dates. Failed validation retains entered work.
- JSON program import and manual weekly-reading/opening/concluding-comment inputs are removed. Bible reading assignments and standard S-140 opening/concluding timing remain. Previously saved program data remains supported.
- Department setup, assignments, qualification checkboxes and empty department cards are removed from the private OCLM editor and review. Independently published departments remain on the public notice board.
- Linked publishers cannot be deleted through the secondary meeting roster. Archiving a legacy unlinked roster entry preserves every historical assignment. Publisher database deletion still has its named confirmation and history protection.
- Browser-specific installation guidance has numbered steps. A dismissible Home reminder appears on mobile after login; installed/public views are excluded. Notification settings remain accessible directly from reminder settings and do not claim remote delivery.
- Keyboard focus returns to the same assignment after choosing a person, even when the row is redrawn. Destructive confirmation buttons use separate rows on small screens, including WebKit with doubled text.
- Tablet shell spacing was incorrectly treated as a desktop sidebar offset (250px). Desktop spacing now starts at 1024px; public layouts retain zero sidebar offset.
- Website capture scripts hide only the demo-session banner. Real demo sessions retain it. Fictional-data captions and charcoal mockup frames remain.

## Review and verification scope

Representative regression flows cover sign-in/denial, role routing, publisher records/search, reports, attendance, OCLM selection/assignment/review/publication, department requests and independent publication, transfers, administrative approvals, reminders, import review, backup failure/recovery and sign-out. These tests exercise concrete UI controls with fictional records and block production APIs.

Chromium and hosted WebKit suites cover representative phone, tablet and desktop widths, 100%/200% text, keyboard focus, visible active navigation, chooser and publish reachability. The full accessibility matrix spans seven themes and the built-in larger-text mode. Actual Realme 12 maximum display/font settings, iOS/Android installation and physical printing still need human acceptance; automated browser emulation does not certify every device or every accessibility criterion.

No live data migration, provider switch, paid service or encryption-key migration is part of this UI release. Background push/email delivery remain inactive. The application is not E2EE; encrypted recovery exports are a separate feature.
