import { create } from "zustand";
import type { Report } from "../../../../packages/core/repositories";
import { previousReportingPeriod } from "./dashboard-model.mjs";
import seedRows from "./demo-report-seed.json";
const SEPTEMBER = 8;
// The fictional month every demo screen starts from, so Home and Reports show the same totals.
function seed(): Report[] {
  const [y = 0, m = 1] = String(previousReportingPeriod()).split("-").map(Number),
    month = m - 1,
    service_year = y + (month >= SEPTEMBER ? 1 : 0);
  return seedRows.map((row) => ({ ...row, id: "demo-" + row.pub_id, cong_id: "demo", service_year, month, comments: "" }));
}
export const useDemoReports = create<{
  rows: Report[];
  update: (next: Report[] | ((old: Report[]) => Report[])) => void;
}>((set) => ({
  rows: seed(),
  update: (next) =>
    set((old) => ({
      rows: typeof next === "function" ? next(old.rows) : next,
    })),
}));
