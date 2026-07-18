import { describe, expect, it } from "vitest";
import {
  allocateByPercentages,
  allocateEqual,
  allocateGoalContributions,
  allocateResponsibility,
} from "../allocation";

describe("money allocation", () => {
  it("allocates an odd cent using a stable member-ID tie-break", () => {
    expect(allocateEqual(1_001, ["tyler", "rachel"])).toEqual([
      { memberId: "tyler", amountMinor: 500 },
      { memberId: "rachel", amountMinor: 501 },
    ]);
  });

  it("does not change the remainder recipient when input order changes", () => {
    expect(allocateEqual(1_001, ["rachel", "tyler"])).toEqual([
      { memberId: "rachel", amountMinor: 501 },
      { memberId: "tyler", amountMinor: 500 },
    ]);
  });

  it("preserves negative totals", () => {
    expect(allocateEqual(-1_001, ["tyler", "rachel"])).toEqual([
      { memberId: "tyler", amountMinor: -500 },
      { memberId: "rachel", amountMinor: -501 },
    ]);
  });

  it("allocates zero to every member", () => {
    expect(allocateEqual(0, ["tyler", "rachel"])).toEqual([
      { memberId: "tyler", amountMinor: 0 },
      { memberId: "rachel", amountMinor: 0 },
    ]);
  });

  it("rejects empty and duplicate member lists", () => {
    expect(() => allocateEqual(100, [])).toThrow("at least one member");
    expect(() => allocateEqual(100, ["tyler", "tyler"])).toThrow("unique");
  });

  it("allocates percentage responsibilities using basis points", () => {
    expect(
      allocateByPercentages(1_001, [
        { memberId: "tyler", basisPoints: 6_000 },
        { memberId: "rachel", basisPoints: 4_000 },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 601 },
      { memberId: "rachel", amountMinor: 400 },
    ]);
  });

  it("supports zero-percent members without losing cents", () => {
    expect(
      allocateByPercentages(10_001, [
        { memberId: "tyler", basisPoints: 10_000 },
        { memberId: "rachel", basisPoints: 0 },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 10_001 },
      { memberId: "rachel", amountMinor: 0 },
    ]);
  });

  it("rejects invalid percentage plans", () => {
    expect(() =>
      allocateByPercentages(10_000, [
        { memberId: "tyler", basisPoints: 5_000 },
        { memberId: "rachel", basisPoints: 4_999 },
      ])
    ).toThrow("10000 basis points");

    expect(() =>
      allocateByPercentages(10_000, [
        { memberId: "tyler", basisPoints: 10_001 },
        { memberId: "rachel", basisPoints: -1 },
      ])
    ).toThrow("non-negative integer");
  });

  it("assigns a responsibility to one member", () => {
    expect(
      allocateResponsibility(12_500, { mode: "MEMBER", memberId: "rachel" })
    ).toEqual([{ memberId: "rachel", amountMinor: 12_500 }]);
  });
});

describe("goal contribution plans", () => {
  it("supports equal contributions", () => {
    expect(
      allocateGoalContributions(20_001, "EQUAL", [
        { memberId: "tyler" },
        { memberId: "rachel" },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 10_000 },
      { memberId: "rachel", amountMinor: 10_001 },
    ]);
  });

  it("supports exact custom-dollar contributions", () => {
    expect(
      allocateGoalContributions(50_000, "CUSTOM", [
        { memberId: "tyler", customAmountMinor: 30_000 },
        { memberId: "rachel", customAmountMinor: 20_000 },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 30_000 },
      { memberId: "rachel", amountMinor: 20_000 },
    ]);
  });

  it("rejects incomplete or mismatched custom-dollar plans", () => {
    expect(() =>
      allocateGoalContributions(50_000, "CUSTOM", [
        { memberId: "tyler", customAmountMinor: 30_000 },
        { memberId: "rachel", customAmountMinor: 19_999 },
      ])
    ).toThrow("must total");

    expect(() =>
      allocateGoalContributions(50_000, "CUSTOM", [
        { memberId: "tyler", customAmountMinor: 30_000 },
        { memberId: "rachel" },
      ])
    ).toThrow("requires an amount");
  });

  it("supports income-proportional contributions", () => {
    expect(
      allocateGoalContributions(10_000, "INCOME_PROPORTIONAL", [
        { memberId: "tyler", incomeMinor: 300_000 },
        { memberId: "rachel", incomeMinor: 200_000 },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 6_000 },
      { memberId: "rachel", amountMinor: 4_000 },
    ]);
  });

  it("uses overflow-safe arithmetic for large proportional plans", () => {
    expect(
      allocateGoalContributions(999_999_999_999, "INCOME_PROPORTIONAL", [
        { memberId: "tyler", incomeMinor: 5_000_000_000_000 },
        { memberId: "rachel", incomeMinor: 5_000_000_000_001 },
      ])
    ).toEqual([
      { memberId: "tyler", amountMinor: 499_999_999_999 },
      { memberId: "rachel", amountMinor: 500_000_000_000 },
    ]);
  });

  it("rejects an all-zero income basis", () => {
    expect(() =>
      allocateGoalContributions(10_000, "INCOME_PROPORTIONAL", [
        { memberId: "tyler", incomeMinor: 0 },
        { memberId: "rachel", incomeMinor: 0 },
      ])
    ).toThrow("greater than zero");
  });
});
