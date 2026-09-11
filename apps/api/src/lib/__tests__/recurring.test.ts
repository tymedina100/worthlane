vi.mock("@/lib/personal-ledger", () => ({ personalLedger: vi.fn(async (userId: string) => ({ accounts: [], transactionWhere: { userId } })) }));
import { describe, it, expect, vi } from "vitest";

vi.mock("@worthlane/db", () => ({
  prisma: {},
  RecurringFrequency: {
    WEEKLY: "WEEKLY",
    BIWEEKLY: "BIWEEKLY",
    MONTHLY: "MONTHLY",
    QUARTERLY: "QUARTERLY",
    YEARLY: "YEARLY",
  },
}));

import { detectRecurring, normalizeMerchant, type TransactionLike } from "../recurring";

function tx(daysAgo: number, amount: number, merchantName: string): TransactionLike {
  const date = new Date("2026-07-01T12:00:00Z");
  date.setDate(date.getDate() - daysAgo);
  return { amount, date, merchantName, categoryId: "cat-1", accountId: "acc-1" };
}

describe("normalizeMerchant", () => {
  it("lowercases and strips store numbers and punctuation", () => {
    expect(normalizeMerchant("STARBUCKS #1234")).toBe("starbucks");
    expect(normalizeMerchant("Netflix.com *NFLX881")).toBe("netflix com");
    expect(normalizeMerchant("SPOTIFY   P0X")).toBe("spotify p0x");
  });
});

describe("detectRecurring", () => {
  it("detects a monthly subscription with a stable amount", () => {
    const txns = [tx(95, 15.99, "Netflix"), tx(64, 15.99, "Netflix"), tx(33, 15.99, "Netflix"), tx(3, 15.99, "Netflix")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe("MONTHLY");
    expect(result[0].averageAmount).toBeCloseTo(15.99);
    expect(result[0].occurrenceCount).toBe(4);
  });

  it("tolerates a small price increase within the amount cluster", () => {
    const txns = [tx(92, 15.49, "Hulu"), tx(61, 15.49, "Hulu"), tx(30, 16.99, "Hulu"), tx(0, 16.99, "Hulu")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe("MONTHLY");
  });

  it("detects weekly charges", () => {
    const txns = [0, 7, 14, 21, 28].map((d) => tx(d, 12.5, "Gym Club"));
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe("WEEKLY");
  });

  it("detects biweekly charges", () => {
    const txns = [0, 14, 28, 42].map((d) => tx(d, 250, "Daycare LLC"));
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe("BIWEEKLY");
  });

  it("ignores irregular purchases at the same merchant", () => {
    const txns = [tx(80, 43.12, "Amazon"), tx(61, 12.99, "Amazon"), tx(20, 105.5, "Amazon"), tx(4, 9.99, "Amazon")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(0);
  });

  it("requires at least 3 occurrences for monthly cadence", () => {
    const txns = [tx(33, 9.99, "Disney Plus"), tx(2, 9.99, "Disney Plus")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(0);
  });

  it("rejects gaps that are too irregular for a cadence", () => {
    const txns = [tx(60, 20, "Water Co"), tx(40, 20, "Water Co"), tx(0, 20, "Water Co")];
    // gaps: 20, 40 — median 30, both deviate >20%+2 from the median → not stable
    const result = detectRecurring(txns);
    expect(result).toHaveLength(0);
  });

  it("groups store-numbered merchants together", () => {
    const txns = [tx(90, 50, "COMCAST #001"), tx(60, 50, "COMCAST #002"), tx(30, 50, "COMCAST #003"), tx(0, 50, "COMCAST #004")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    expect(result[0].normalizedMerchant).toBe("comcast");
  });

  it("projects nextDueDate one median gap after the last charge", () => {
    const txns = [tx(60, 9.99, "Spotify"), tx(30, 9.99, "Spotify"), tx(0, 9.99, "Spotify")];
    const result = detectRecurring(txns);
    expect(result).toHaveLength(1);
    const last = new Date("2026-07-01T12:00:00Z");
    const expected = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(result[0].nextDueDate.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));
  });

  it("skips income (negative amounts) and missing merchants", () => {
    const txns = [
      { ...tx(60, -2000, "Employer Inc") },
      { ...tx(30, -2000, "Employer Inc") },
      { ...tx(0, -2000, "Employer Inc") },
      { amount: 10, date: new Date(), merchantName: null, categoryId: null, accountId: null },
    ];
    expect(detectRecurring(txns)).toHaveLength(0);
  });
});
