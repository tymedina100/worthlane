import { describe, expect, it } from "vitest";
import { upcomingInputSchema } from "../upcoming";

const input = { name: "Bill", amount: 12.34, dueDate: "2026-09-20" };
describe("upcoming input", () => {
  it("accepts calendar dates and preserves explicit null reminder preferences", () => {
    expect(upcomingInputSchema.parse({ ...input, reminderTiming: null })).toMatchObject({ type: "BILL", reminderTiming: null });
    expect(upcomingInputSchema.safeParse({ ...input, dueDate: "2028-02-29" }).success).toBe(true);
  });
  it("rejects impossible dates, fractions of cents and unexpected ownership fields", () => {
    for (const patch of [{ dueDate: "2026-02-29" }, { dueDate: "2026-04-31" }, { amount: 1.001 }, { amount: 0 }, { userId: "forged" }]) {
      expect(upcomingInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
  it("keeps patches partial without inserting create defaults", () => {
    expect(upcomingInputSchema.partial().parse({ isActive: false })).toEqual({ isActive: false });
  });
});
