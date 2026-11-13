# Congregation Assistant — UI/UX audit

4 November 2026 · demo mode (fictional data) · build `0737a9d` · phone 375×812 and desktop 1440×900

The app works, but it still reads like a toolbox, not a guided product. Publishers are well served: their Home is under two phone screens and says what to do. Admins and first-time buyers are not. Admin Home is 7.8 phone screens with 51 controls, page titles are slogans instead of names, and selected and unselected buttons look almost the same. The website tells buyers to "contact support", and its Contact page then says support email is not active.

How this was checked: an automated sweep of 40 app screens (15 admin and 5 publisher screens, each on phone and desktop) and 26 website views, with full-page screenshots. The sweep measured page length, horizontal overflow, controls, unlabeled buttons, text under 12 px and headings. All 11 PDF types the app makes were rendered and inspected. No runtime errors and no horizontal overflow were found anywhere.

## Scorecard

Page length is in screen heights (1.0 = fits on one screen). Long screens are not wrong on their own, but anything over 3 phone screens hides work below the fold.

| Screen | Phone screens | Desktop screens | Controls | Main problem |
| --- | --- | --- | --- | --- |
| Admin · Home | 7.8 | 4.0 | 51 | Too many jobs on one page; submissions table alone is ~1,500 px on phone |
| Admin · Settings | 4.9 | 3.0 | 35 | 5 `h1` headings; 34 texts at 8 px inside the experience previews |
| Admin · Schedule (Meetings) | 4.8 | 3.4 | 27 | 18 texts at 11.5 px; every part repeats a "Needs a person" picker |
| Admin · Forms (PDF) | 2.5 | 1.5 | 22 | Unselected options look like plain text |
| Admin · Reports | 2.4 | 1.7 | 16 | Says "0 submitted · 4 missing" while Home says "3 / 4 submitted" |
| Admin · Access | 2.3 | 1.3 | 9 | Role is a dropdown; 1 unlabeled control |
| Admin · Emergency contacts | 2.2 | 1.9 | 5 | Fine |
| Admin · People | 1.9 | 0.9 | 18 | Edit button placement differs per card; slogan title |
| Admin · Messages | 1.9 | 1.2 | 8 | Preview shows "Hello , your assignment is  on…"; 3 unlabeled controls |
| Publisher · Settings | 6.8 | 4.0 | 43 | Shows admin dashboard previews to a publisher |
| Publisher · Home | 1.7 | 0.9 | 5 | Good |
| Publisher · Reports / Schedule / People | ≤ 0.9 | ≤ 0.9 | ≤ 4 | People hub has one item |
| Website · Home | 12.0 | 7.9 | — | Long dark blank stretches between sections |
| Website · inner pages | 1.1–3.8 | 1.0–2.5 | — | Thin, text-only pages |

## Fix first

These cost trust or stop a new person from getting started.

1. **Buyers cannot reach you.** Pricing says "Contact support to arrange access". The Contact page says "Support email is not active yet. Do not send private congregation records through public channels." Every footer says "Support: ask your congregation administrator", but a buyer *is* the administrator. Give buyers one working contact route (email or form) and use it on Pricing, Contact and the footer.
2. **Numbers disagree between screens.** Admin Home shows "Submitted 3 / 4". Reports shows "0 submitted · 4 missing" for the same October 2026. A secretary who sees two different totals stops trusting both. In demo mode this is the first impression for every visitor.
3. **Selected and unselected buttons look the same.** The new button groups (Forms, Settings) and the existing tabs (Settings tabs, Schedule tabs, People tabs) show unselected options as bare text with no border or fill. On phones this reads as a list of labels, not choices, and the selected one is marked only by a thin outline. Give unselected options a visible tonal fill and the selected one a solid fill.
4. **Admin Home is a scroll, not a start.** The order is greeting → Start here → next task → 4 KPI tiles → SFTS totals → 7 tool buttons → monthly submissions table (search, 10 filters, a row per publisher) → group links → contact updates → announcements → assistant → 3 tips. The table, the KPI tiles and the tools all answer the same question ("who still has to report?") three times.
5. **Messages preview is broken by default.** Before anyone types, the Review message box shows "Hello , your assignment is  on 4 Nov 2026. Schedule:". Show the template with sample values, or hide the preview until a name is chosen.

## Mobile app

**Navigation**
- Getting to a tool takes three taps from a bottom tab: tab → section hub → tool, and the tool often has its own tabs inside. Hubs with one or two items (Messages: 1, Reports: 2, publisher People: 1) are extra taps with nothing to choose. Open the tool directly when a hub has one item.
- Every hub repeats "Choose what you want to do." and the same icon on every card (all People cards share one icon, all Admin cards a gear or shield). Use one icon per tool and drop the filler line.
- Forms has both "Schedules & rosters" and "Duties"; both lead to schedule PDFs.
- Publisher Reports duplicates Home: Home has "Submit report", and Reports has "Enter report" plus "Review report" per person, with different wording for the same job.

**Page titles**
- Titles are slogans on some screens and names on others: "A place for all." (People), "Keep reporting simple." (Reports), "A thoughtful reminder." (Messages) versus "Weekly schedule", "Forms to share", "Access". People navigate by names. Use the tab's name as the title ("People", "Reports", "Messages") and move the slogan into the subtitle if it stays at all.

**Controls**
- Dropdowns remain where 2–5 options fit as buttons: Reports "Report group", Access "Role", Messages "Template", and every "Needs a person" picker on the Schedule.
- People: "Publishers / Groups / Import Center" tabs wrap so "Import Center" sits alone on a second line and looks like a heading. Cards show "S-21" and "Options" on one row and "Edit" on its own row, but not on every card (Daniel Thomas has no Edit).
- Schedule: "Midweek / Weekend / Duties" plus "Print" wraps so "Print" sits alone below. Print is an action, not a view: make it a button.
- Schedule: "Download S-89" and "Send on WhatsApp" are grey until a person is chosen, with no hint why.
- Checkboxes render as a 44 px empty square with the label beside it ("Show special full-time servants", "Use an auxiliary classroom"). A switch would read as on/off at a glance.
- Settings tabs wrap to two rows for publishers ("Appearance · Privacy & data" / "Help & install").

**Text and headings**
- Settings renders 5 `h1` headings, because each experience preview contains a full greeting. Screen readers announce five page titles.
- The experience previews shrink real UI to 8 px text (34 elements). They are pictures pretending to be pages. Use a simple illustration or screenshot image instead.
- Schedule part rows use 11.5 px text for times and halls.
- The greeting splits the name onto its own line ("Glad you are here" / "Daniel.") at small size, which reads as a broken sentence.

**Publisher**
- Publisher Home is the model to copy: one report card with plain status, the next assignment, three shortcuts.
- Publisher Settings is 6.8 phone screens because it shows the admin-oriented experience picker (KPI previews with "Publishers 24", "Regular pioneers 3"). A publisher never sees those numbers.
- Publisher Schedule shows only "Your assignments" and asks them to use a link shared by the overseer to see the full schedule. The full schedule should be one tap away inside the app.

## Desktop app

- The content column is narrow (Home caps at ~760 px) on a 1440 px screen, leaving about half the window empty on the right of Home, Schedule and Settings. Use the width for two columns: work on the left, updates and links on the right.
- The sidebar shows only Today, People, Reports and Meetings. Messages, Forms & Print and Admin sit behind "More" even though the sidebar has room for all seven.
- Forms puts a mostly empty "Accuracy Guard" card in a full right-hand column with one button.
- People rows put "Edit" far right, away from "S-21" and "Options", so the row actions read as two groups.
- On Reports, the "Missing reports" list sits beside "Monthly submissions" with the same names, S-21 and Options buttons repeated.
- Settings desktop tabs ("Appearance · Congregation · Privacy & data · Help & install") show no clear selected state.

## PDFs

All 11 types render, paginate and stay inside their margins. The government forms are faithful. The quality drops in the app's own layouts.

| PDF | Verdict | Flaws |
| --- | --- | --- |
| S-21 publisher record | Good | Dates print as `1980-01-01`; the paper form reads day-month-year. Long remarks are cut with "[see notes]" without saying where the notes are |
| S-88 / S-3 attendance | Good | — |
| Emergency contacts | Usable | Group headings read "Family 0 family" (the word doubles). Phones print as `+910000000000` with no spacing, hard to read aloud in an emergency |
| Midweek (S-140 style) | Good | A short programme leaves most of the page blank; "Chairman: —" prints when nobody is assigned |
| Weekend / duty list | Weak | A plain text list under "Fictional schedule": no congregation name, date range, hall or table. It does not match the midweek design and looks unfinished next to it |
| S-89 slip | Good | — |

## Website

- **Home is 12 phone screens** and has long dark blank stretches between "First, publishers report" and Territory Management, and again above the footer. DESIGN.md allows no blank stretch over 96 px.
- **Pricing page** says "Simple plans for a congregation." but there is one plan. The page is 1.2 screens with one sentence and one button, weaker than the pricing section on Home. Either make it the full version of that section or redirect to it.
- **Inner pages** (Features, Security, Install, Help, Contact) are text-only with no product images. Features lists four items under a headline about "tools you reach for" without showing any of them.
- **Contact** contradicts Pricing (see Fix first, item 1).
- The ₹1,499 layout fix is live: one line, phone image beside it, no overlap at 320 px.
- Strengths worth keeping: every page loads with status 200 and no errors, one `h1` per page, no horizontal scroll, and an honest Security page.

## Fix plan

In order. Effort: S = under an hour, M = half a day, L = a day or more.

| # | Fix | Effort | Impact |
| --- | --- | --- | --- |
| 1 | One working contact route for buyers on Pricing, Contact and the footer | S | Unblocks sales |
| 2 | Make Home and Reports read submitted counts from the same source | S–M | Trust in every number |
| 3 | Visible fill for unselected button-group options and tabs | S | Every choice becomes obvious |
| 4 | Fix the Messages preview placeholders | S | First impression of Messages |
| 5 | Name-based page titles (People, Reports, Messages) | S | Orientation |
| 6 | Admin Home: move the submissions table to Reports; keep a "who's missing" count and one button on Home | M | Home drops from ~7.8 to ~4 phone screens |
| 7 | Skip one-item hubs; one icon per tool | S | One less tap |
| 8 | Replace experience previews with images; one `h1` on Settings; hide the picker for publishers | M | Settings drops ~2 screens; accessibility |
| 9 | Weekend and duty PDFs in the S-140 style (title, congregation, dates, table) | M | Printed schedules look finished |
| 10 | Desktop: two-column Home and Schedule; all sections in the sidebar | M | Uses the screen |
| 11 | Remaining dropdowns with ≤ 5 options become buttons (Report group, Role, Template) | S | Fewer hidden choices |
| 12 | Website Home: remove blank stretches; give Pricing real content | M | Shorter, more convincing site |

## Follow-up — 13 November 2026

Build `d83c7b6` (V4.1, Eclipse light), admin and publisher demos, 1366×850 and 375×812. Ranked by impact; DESIGN.md rule in brackets.

**High**
1. Reporting month on admin Today is the native date input: browser calendar icon and "October, 2026" with a stray comma [§4 no native pickers]. Use the house picker or a "‹ October 2026 ›" stepper.
2. Phone header spends ~150 px before content: congregation name and the icon row sit on two lines. Merge into one 56 px bar; move the role ("Main admin") into the avatar menu.
3. No colour on state: "1 pending", "Still to report", "0 unread" and Remind are plain black/grey [§1 colour on data]. Add `--warn` chips to pending/overdue and `--ok` to complete groups.
4. Blank stretches inside panels: ~60 px gap under "Still to report:"; Contact updates empty state padded by two empty lines [§5 frame checks]. Tighten; give the empty state an icon and one line.

**Medium**
5. Clock floats far right of the greeting on desktop, detached from the date. Put date and time on one line.
6. KPI sub-lines wrap ("50 hours · 3 Bible / studies"). Use "50 h · 3 studies" or let tiles grow.
7. "Copy all for WhatsApp" looks disabled through faded opacity [§7]. Use `aria-disabled` + `--text-3`, or keep it enabled.
8. Assistant bar placeholder ("add a report for Maria Thomas") is near-black and reads as typed text. Use `--text-3` and prefix "Try:".
9. Letter-spaced month eyebrow above "Monthly submissions" [§5 no eyebrows]. Title it "October submissions".
10. Sidebar filler: "Version 4.1" and the "A little more organised" tagline take nav space. Move the version to My account.

**Low**
11. Setup-guide card stays on the first screen; hide it once setup is complete (check the logic exists).
12. Publisher shortcuts: make the whole row the hit area; drop the tinted icon circles for a calmer list.
13. Announcements on phone sit under the bottom tab bar at rest; pad by the bar height.

Not checked this round: Eclipse Night, Paper and Forest themes; text at 130/200 %; the public site; territory manager; dialogs and forms. No console errors on Today.
