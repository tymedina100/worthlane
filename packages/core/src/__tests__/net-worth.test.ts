import { describe, expect, it } from "vitest";
import { computeNetWorthBreakdownMinor, computeNetWorthMinor } from "../net-worth";

const accounts = [
  { type: "CHECKING", currentBalanceMinor: 100_000 },
  { type: "SAVINGS", currentBalanceMinor: 50_000 },
  { type: "INVESTMENT", currentBalanceMinor: 25_000 },
  { type: "OTHER", currentBalanceMinor: 5_000 },
  { type: "CREDIT", currentBalanceMinor: 30_000 },
  { type: "LOAN", currentBalanceMinor: 70_000 },
];

describe("net worth", () => {
  it("adds every asset type and subtracts credit and loan balances", () => {
    expect(computeNetWorthMinor(accounts)).toBe(80_000);
  });

  it("returns separate asset and liability totals", () => {
    expect(computeNetWorthBreakdownMinor(accounts)).toEqual({
      assetsMinor: 180_000,
      liabilitiesMinor: 100_000,
    });
  });

  it("preserves the existing behavior for negative account balances", () => {
    expect(
      computeNetWorthMinor([
        { type: "CHECKING", currentBalanceMinor: -10_000 },
        { type: "CREDIT", currentBalanceMinor: -5_000 },
      ])
    ).toBe(-5_000);
  });

  it("returns zero for an empty account list", () => {
    expect(computeNetWorthMinor([])).toBe(0);
    expect(computeNetWorthBreakdownMinor([])).toEqual({ assetsMinor: 0, liabilitiesMinor: 0 });
  });
});
