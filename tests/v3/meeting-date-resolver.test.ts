import { describe, expect, it } from "vitest";
import { resolveMeetingType } from "../../packages/core/meeting-date-resolver";
describe("meeting type date resolver", () => {
  const days = { midweek: 3, weekend: 0 };
  it("resolves midweek in the congregation timezone", () =>
    expect(
      resolveMeetingType(
        new Date("2026-10-21T13:00:00Z"),
        days,
        "Asia/Kolkata",
      ),
    ).toBe("midweek"));
  it("resolves weekend", () =>
    expect(
      resolveMeetingType(
        new Date("2026-10-25T04:00:00Z"),
        days,
        "Asia/Kolkata",
      ),
    ).toBe("weekend"));
  it("asks for clarification between meetings", () =>
    expect(
      resolveMeetingType(
        new Date("2026-10-23T04:00:00Z"),
        days,
        "Asia/Kolkata",
      ),
    ).toBeNull());
  it("respects timezone at a date edge", () =>
    expect(
      resolveMeetingType(
        new Date("2026-10-20T20:00:00Z"),
        days,
        "Asia/Kolkata",
      ),
    ).toBe("midweek"));
});
