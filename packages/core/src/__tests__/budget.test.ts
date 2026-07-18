import { describe, expect, it } from "vitest";
import { calculateBudgetProgress } from "../budget";

describe("calculateBudgetProgress", () => {
  it("calculates remaining budget and percent used", () => {
    expect(calculateBudgetProgress(100_000, 23_500)).toEqual({
      amountMinor: 100_000,
      spentMinor: 23_500,
      remainingMinor: 76_500,
      percentUsed: 23.5,
    });
  });

  it("keeps overspending visible as a negative remainder and uncapped percentage", () => {
    expect(calculateBudgetProgress(10_000, 12_500)).toMatchObject({
      remainingMinor: -2_500,
      percentUsed: 125,
    });
  });

  it("handles a zero budget defensively", () => {
    expect(calculateBudgetProgress(0, 0).percentUsed).toBe(0);
  });

  it("rejects fractional minor units and negative spending", () => {
    expect(() => calculateBudgetProgress(10_000.5, 2_000)).toThrow("safe integer");
    expect(() => calculateBudgetProgress(10_000, -1)).toThrow("cannot be negative");
  });
});
