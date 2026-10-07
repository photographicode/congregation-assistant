# Readable, simple scheduling

The reported phone screenshot squeezed a publisher name between status and removal controls. This release gives the assigned name the full width on phones and tablets, regardless of whether the app's optional larger-text setting is enabled. Names wrap at words; fixed-height containers no longer clip enlarged headings or tabs.

Everyday sequence: choose week → choose a person for each part → review and publish → check the live schedule. Status and removal remain available in Assignment options. Qualification, availability, same-week warnings, recency ordering, assistants, completed history, cloud conflict handling and immutable published-week history remain unchanged. Candidate cards show same-part history and conflicts rather than repeating qualification and total-count badges. Planning reminders are optional and collapsed initially. The person chooser gives search and names the full width on phones, explains qualification/availability once and removes duplicated headings and footer instructions. Enlarged tags grow with their text.

Large-text navigation uses two rows and measures its actual height. Content, publication controls and notices reserve that space. Publisher deletion names the person, explains permanence and history protection, gives the button an explicit Delete publisher label, and initially focuses Cancel. Cancellation, report-history protection and rejected deletions preserve records.

## Research used

- [W3C: text resizing](https://www.w3.org/WAI/WCAG21/Understanding/resize-text): enlargement must preserve content and functionality, including controls.
- [W3C: reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow): narrow viewports should not require scrolling in both directions for ordinary content.
- [W3C: older users](https://www.w3.org/WAI/older-users/developing/): readable text, adequate contrast, usable targets and clear navigation.
- [NW Scheduler assignment flow](https://nwscheduler.com/how-to/schedule/schedule-the-christian-life-and-ministry-meeting-clm/): selecting a part, choosing qualified/available people, recency and warnings.
- [Planning Center scheduling conflicts](https://help.planningcenter.com/en/142878-scheduling-conflicts-and-blockouts.html): keep conflicts visible when selecting people.
- [Nielsen Norman Group: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): keep less frequent actions secondary.
- [Reddit discussion about enlarged interfaces](https://www.reddit.com/r/UI_Design/comments/17wmuml/): qualitative user discussion only, not proof of accessibility or usability.

These references guide the design; no claim is made that this app is universally easiest or that competitors are inaccessible.

## Verification and remaining human acceptance

The new isolated browser test uses fictional records and blocks production database requests. It checks 320/390/768/1440-pixel widths with normal and 200% text, names, navigation overlap, secondary status, completion/removal, named deletion cancellation, report protection, failed deletion preservation and publication reachability. Chromium and WebKit run in release acceptance and against the deployed app. Existing permission, publishing/conflict, recovery, PDF and accessibility checks also remain.

Still required: on the reported phone, retain its existing maximum Android font/display settings and test choosing/changing a person, assigning an assistant, reviewing/publishing, viewing the live schedule and cancelling deletion. Repeat on an iPhone with large accessibility text. Have younger and older inexperienced users do these without coaching. Automated text enlargement is useful regression coverage, not a substitute for those device and human tests.
