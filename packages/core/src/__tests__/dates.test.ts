import { describe, expect, it } from "vitest";

import { calendarDateInTimeZone, monthRangeInTimeZone, weekRangeInTimeZone } from "../dates";

describe("bank calendar dates", () => {
  it.each([
    ["2026-09-01", "America/Phoenix", "2026-09-01T07:00:00.000Z"],
    ["2026-03-08", "America/Los_Angeles", "2026-03-08T08:00:00.000Z"],
    ["2026-03-09", "America/Los_Angeles", "2026-03-09T07:00:00.000Z"],
    ["2026-09-01", "Asia/Tokyo", "2026-08-31T15:00:00.000Z"],
  ])("preserves %s in %s", (date, zone, expected) => {
    expect(calendarDateInTimeZone(date, zone).toISOString()).toBe(expected);
  });
  it("rejects invalid and timestamp inputs", () => {
    for (const value of ["2026-02-30", "2026-13-01", "2026-09-01T00:00:00Z"]) {
      expect(() => calendarDateInTimeZone(value, "UTC")).toThrow();
    }
  });
});

describe("weekRangeInTimeZone", () => {
  it("uses local Sunday boundaries across a spring DST change", () => {
    const range = weekRangeInTimeZone(new Date("2026-03-10T12:00:00Z"), "America/Los_Angeles");
    expect(range.start.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-03-15T07:00:00.000Z");
  });
  it("keeps Saturday evening in the prior week even when UTC is Sunday", () => {
    const range = weekRangeInTimeZone(new Date("2026-08-02T02:00:00Z"), "America/Phoenix");
    expect(range.start.toISOString()).toBe("2026-07-26T07:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-02T07:00:00.000Z");
  });
});

describe("monthRangeInTimeZone", () => {
  it("uses the household month when UTC is already in the next month", () => {
    const range = monthRangeInTimeZone(
      new Date("2026-08-01T02:00:00.000Z"),
      "America/Phoenix"
    );

    expect(range).toMatchObject({ year: 2026, month: 7 });
    expect(range.start.toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-01T07:00:00.000Z");
  });

  it("accounts for daylight-saving offsets at both month boundaries", () => {
    const range = monthRangeInTimeZone(
      new Date("2026-03-15T12:00:00.000Z"),
      "America/Los_Angeles"
    );

    expect(range.start.toISOString()).toBe("2026-03-01T08:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-04-01T07:00:00.000Z");
  });

  it("keeps UTC month boundaries exact", () => {
    const range = monthRangeInTimeZone(new Date("2026-01-10T12:00:00Z"), "UTC");

    expect(range.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("rejects invalid dates and time zones", () => {
    expect(() => monthRangeInTimeZone(new Date("invalid"), "UTC")).toThrow(
      "instant must be a valid date"
    );
    expect(() => monthRangeInTimeZone(new Date(), "Not/A_Zone")).toThrow();
  });
});
