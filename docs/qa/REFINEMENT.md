# Complete refinement phase — work in progress

Scope and acceptance: [owner orders](../V3-REFINEMENT-ORDERS.md). No additional product features. The supplied nine-theme stylesheet remains unchanged.

## Defect register

| Defect | Repair | Evidence / gate |
|---|---|---|
| Flattened report form, half-hour input | Native dedicated report card, participation, quarter hours, receipt/another, retained errors and submit guard | `check-refinement.cjs`; browser acceptance pending |
| Missing monthly AP review / destructive revoke | Scoped monthly list; compare-and-swap clears only `is_ap` | Local rollback-only `check-refinement.sql` passes; production migration applied, no report rows changed |
| Native OCLM dropdown / blanket repeat restriction | Shared searchable combobox, recency/cautions, manual repeats allowed | Browser and responsive gates pending |
| Auxiliary setting not saved / output clutter | Per-week program flag, conditional app/PDF columns, public filtering | SQL and S-140 on/off contract pass; browser persistence pending |
| Duplicate Gender | One canonical control and accessible name | Browser lifecycle/persistence pending |
| Dialogs remain visible / lose focus | Shared close and focus fallback, scrollable body; routine reporting inline | Inventory below; complete lifecycle matrix pending |
| Responsive issues | Unchanged geometry detector; shared layout repairs only | First comparable sample: 96 views, 17 widow findings, zero coverage errors; expanded audit pending |

## Dialog and popup inventory

All modals below use `packages/ui/Dialog.tsx` (Radix focus trap, overlay and scroll-lock lifecycle). Each has the shared Close control. Dirty forms switch the same dialog body to Keep editing / Discard, with no nested modal.

| Trigger / surface | Roles | State / dismissal |
|---|---|---|
| Add / Edit publisher | Admin, permitted people managers | Dirty guard; Save; Close / Escape / outside request |
| Setup guide (11 steps) | Admin | Dirty guard; Back / Next / Skip / Done; Close |
| Enter several reports / CSV review | Admin, field service, group overseer | Dirty selected rows; Save / discard / Close |
| Discard inline report | Publisher, report writers | Keep editing / Discard; Close / Escape cancel dismissal |
| Review auto-assignment | OCLM / admin | Accept / Cancel / Close / Escape |
| OCLM shared-draft conflict review | OCLM / admin | Local copy / confirm shared / error / Close |
| Search people and actions | Signed-in / demo roles | Query resets on opening; choose / Close / Escape |
| Quick actions | Signed-in / demo roles | Action navigates; Close / Escape |
| Assistant | Permitted report roles | Preview / pending / errors; Close / Escape |
| What’s new | Signed-in / demo roles | Read-only; Close / Escape |
| Mobile More tools | Signed-in / demo roles | Choose tool / Close / Escape |
| Group-link QR | Admin / field service / group overseer | Read-only; Close clears image and group |
| Owner congregation editor | Owner | Form / busy / error; Close |
| Owner workspace request review | Owner | Approve / decline / error; Close |
| OCLM assignment popup | OCLM / admin | Combobox; Enter / selection / Escape / Tab / blur / outside |

This inventory is not a claim that every state has passed testing. Release remains blocked until the scoped behavioral, geometry and live-deployment evidence is recorded.

First expanded role pass: 1,890 views, zero coverage errors, 38 text-widow findings (public report introduction, publisher introduction and owner approval explanation). No overflow/clipping findings. These remain a release blocker until the revised text passes the same detector.

Database verification: combined migration bundle applies twice in the isolated PostgreSQL 17 database; rollback-only refinement checks pass afterward. Production security-advisor categories/counts are unchanged: RLS-without-policy 26, anonymous definer RPC 13, authenticated definer RPC 95, password advisory 1. Existing intentionally callable RPCs and denied-by-default tables remain outside this refinement; no broad security settings were changed.
