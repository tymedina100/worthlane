import { describe, expect, it } from "vitest";
import { relativeUpcomingDate } from "../../mobile/src/lib/upcoming-date";

describe("mobile upcoming calendar labels", () => {
  it("labels today's bill Today at both ends of the local day", () => {
    for (const hour of [0, 6, 12, 23]) {
      expect(relativeUpcomingDate("2026-09-09", new Date(2026, 8, 9, hour, 59))).toBe("Today");
    }
  });
  it("preserves calendar boundaries for overdue and future bills", () => {
    const now = new Date(2026, 11, 31, 23, 59);
    expect(relativeUpcomingDate("2027-01-01", now)).toBe("Tomorrow");
    expect(relativeUpcomingDate("2027-01-02", now)).toBe("In 2 days");
    expect(relativeUpcomingDate("2026-12-30", now)).toBe("1 day overdue");
    expect(relativeUpcomingDate("2026-12-29", now)).toBe("2 days overdue");
  });
  it("compares dates across daylight-saving and leap-day boundaries", () => {
    expect(relativeUpcomingDate("2026-03-09", new Date(2026, 2, 8))).toBe("Tomorrow");
    expect(relativeUpcomingDate("2026-11-02", new Date(2026, 10, 1))).toBe("Tomorrow");
    expect(relativeUpcomingDate("2028-03-01", new Date(2028, 1, 28))).toBe("In 2 days");
  });
});
