import { describe, expect, it } from "vitest";
import { fromMinorUnits, toMinorUnits } from "../money";

describe("money boundaries", () => {
  it("converts between decimal display values and integer minor units", () => {
    expect(toMinorUnits(123.45)).toBe(12_345);
    expect(fromMinorUnits(12_345)).toBe(123.45);
  });

  it("rejects non-finite values", () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow("finite");
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY)).toThrow("finite");
  });
});
