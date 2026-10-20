import { describe, expect, it } from "vitest";
import { autoAssign, programSchema } from "../../packages/core/meeting";
describe("Congregation Bible Study reader", () => {
  it("parses and assigns an independent reader slot", () => {
    const parts = programSchema.parse({
      reading: "Psalm 1",
      sourceMonth: "2026-10",
      reviewed: true,
      parts: [
        {
          id: "BibleStudy",
          type: "BibleStudy",
          section: "living",
          title: "Congregation Bible Study",
          minutes: 30,
          assistant: false,
          reader: true,
        },
      ],
    }).parts;
    const people = [
      {
        id: "conductor",
        name: "Conductor",
        appointment: "Elder",
        roles: ["BibleStudy"],
      },
      {
        id: "reader",
        name: "Reader",
        appointment: "MS",
        roles: ["BibleStudyReader"],
      },
    ];
    const assigned = autoAssign(people, {}, "2026-W43", parts);
    expect(assigned["2026-W43"].BibleStudy.personId).toBe("conductor");
    expect(assigned["2026-W43"].BibleStudyReader.personId).toBe("reader");
  });
});
