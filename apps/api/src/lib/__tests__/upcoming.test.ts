import { describe, expect, it } from "vitest";
import { RecurringFrequency } from "@worthlane/db";
import { nextFutureObligationDate, nextObligationDate, obligationStatus, parseDateOnly, toDateOnly } from "../upcoming";

describe("upcoming obligation dates", () => {
  it("clamps monthly month-end dates", () => {
    expect(toDateOnly(nextObligationDate(parseDateOnly("2026-01-31"), RecurringFrequency.MONTHLY))).toBe("2026-02-28");
    expect(toDateOnly(nextObligationDate(parseDateOnly("2028-01-31"), RecurringFrequency.MONTHLY))).toBe("2028-02-29");
  });

  it("advances a paid recurring item past today", () => {
    expect(toDateOnly(nextFutureObligationDate(parseDateOnly("2026-01-31"), RecurringFrequency.MONTHLY, parseDateOnly("2026-03-03")))).toBe("2026-03-28");
  });

  it("returns clear due statuses from date-only values", () => {
    const today = parseDateOnly("2026-07-12");
    expect(obligationStatus(parseDateOnly("2026-07-11"), false, today)).toBe("OVERDUE");
    expect(obligationStatus(today, false, today)).toBe("DUE_TODAY");
    expect(obligationStatus(today, true, today)).toBe("PAID");
  });
});
