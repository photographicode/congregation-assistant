import { describe, expect, it } from "vitest";
import {
  assignmentRecency,
  compareAssignmentRecency,
} from "../../packages/core/assignment-recency";
describe("assignment recency", () => {
  const now = "2026-10-20T12:00:00Z";
  it.each([
    [null, "Never", null],
    ["2026-10-20", "This week", 0],
    ["2026-10-13", "Last week", 1],
    ["2026-09-08", "6 weeks ago", 6],
  ] as const)("labels %s", (last, label, weeks) =>
    expect(assignmentRecency(last, now)).toMatchObject({ label, weeks }),
  );
  it("sorts never and longest gaps first", () => {
    const rows = [
      { last: "2026-10-19" },
      { last: null },
      { last: "2026-09-01" },
    ];
    rows.sort((a, b) => compareAssignmentRecency(a.last, b.last, now));
    expect(rows.map((row) => row.last)).toEqual([
      null,
      "2026-09-01",
      "2026-10-19",
    ]);
  });
});
