import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    streak: { upsert: vi.fn(), update: vi.fn() },
    budget: { findMany: vi.fn() },
    transaction: { aggregate: vi.fn(), count: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@finance/db", () => ({
  prisma: mockPrisma,
  StreakType: {
    DAILY_CHECKIN: "DAILY_CHECKIN",
    WEEKLY_ON_BUDGET: "WEEKLY_ON_BUDGET",
    NO_IMPULSE_PURCHASES: "NO_IMPULSE_PURCHASES",
  },
}));

import {
  evaluateDailyCheckin,
  evaluateWeeklyOnBudget,
  evaluateNoImpulsePurchases,
} from "../streaks";

const USER_ID = "user-streak-test";

function makeStreak(overrides: {
  type?: string;
  currentCount?: number;
  longestCount?: number;
  lastActivityAt?: Date | null;
} = {}) {
  return {
    id: "str-1",
    userId: USER_ID,
    type: "DAILY_CHECKIN",
    currentCount: 5,
    longestCount: 10,
    lastActivityAt: null,
    ...overrides,
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.streak.update.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
describe("evaluateDailyCheckin", () => {
  it("first ever check-in: upsert creates record, update skipped (already today)", async () => {
    const now = new Date();
    // upsert `create` block fires, returns record with lastActivityAt = now
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ currentCount: 1, longestCount: 1, lastActivityAt: now })
    );

    const result = await evaluateDailyCheckin(USER_ID, now);

    expect(mockPrisma.streak.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.streak.update).not.toHaveBeenCalled();
    expect(result.streak.currentCount).toBe(1);
    expect(result.alreadyCheckedIn).toBe(true);
  });

  it("already checked in today: returns early without update", async () => {
    const now = new Date();
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ currentCount: 7, lastActivityAt: now })
    );

    const result = await evaluateDailyCheckin(USER_ID, now);

    expect(mockPrisma.streak.update).not.toHaveBeenCalled();
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.streak.currentCount).toBe(7);
  });

  it("checked in yesterday: extends streak by 1", async () => {
    const now = new Date();
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ currentCount: 5, longestCount: 10, lastActivityAt: daysAgo(1) })
    );
    mockPrisma.streak.update.mockResolvedValue(
      makeStreak({ currentCount: 6, longestCount: 10, lastActivityAt: now })
    );

    const result = await evaluateDailyCheckin(USER_ID, now);

    expect(mockPrisma.streak.update).toHaveBeenCalledOnce();
    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(6);
    expect(result.alreadyCheckedIn).toBe(false);
  });

  it("last check-in >1 day ago: resets streak to 1", async () => {
    const now = new Date();
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ currentCount: 12, longestCount: 15, lastActivityAt: daysAgo(3) })
    );

    await evaluateDailyCheckin(USER_ID, now);

    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe("evaluateWeeklyOnBudget", () => {
  function makeBudget(amount: number, categoryId = "cat-1") {
    return {
      id: "bud-1",
      userId: USER_ID,
      categoryId,
      amount: { toNumber: () => amount },
    };
  }

  it("all budgets under limit: extends weekly streak", async () => {
    const now = new Date();
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 50 } });
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "WEEKLY_ON_BUDGET", currentCount: 2, longestCount: 3, lastActivityAt: daysAgo(7) })
    );

    await evaluateWeeklyOnBudget(USER_ID, now);

    expect(mockPrisma.streak.update).toHaveBeenCalledOnce();
    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(3);
  });

  it("budget over limit: resets count to 0", async () => {
    const now = new Date();
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 150 } });
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "WEEKLY_ON_BUDGET", currentCount: 4, lastActivityAt: daysAgo(7) })
    );

    await evaluateWeeklyOnBudget(USER_ID, now);

    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(0);
  });

  it("already evaluated this week: skips update", async () => {
    const now = new Date();
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 50 } });
    // lastActivityAt is today → isThisWeek returns true
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "WEEKLY_ON_BUDGET", currentCount: 2, lastActivityAt: now })
    );

    await evaluateWeeklyOnBudget(USER_ID, now);

    expect(mockPrisma.streak.update).not.toHaveBeenCalled();
  });

  it("no budgets: counts as on budget and extends streak", async () => {
    const now = new Date();
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "WEEKLY_ON_BUDGET", currentCount: 1, longestCount: 2, lastActivityAt: daysAgo(7) })
    );

    await evaluateWeeklyOnBudget(USER_ID, now);

    expect(mockPrisma.streak.update).toHaveBeenCalledOnce();
    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe("evaluateNoImpulsePurchases", () => {
  it("zero impulse transactions, first time: creates with count=1, skips update", async () => {
    const now = new Date();
    mockPrisma.transaction.count.mockResolvedValue(0);
    // upsert create block fires; returns new record with lastActivityAt = now
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "NO_IMPULSE_PURCHASES", currentCount: 1, longestCount: 1, lastActivityAt: now })
    );

    await evaluateNoImpulsePurchases(USER_ID, now);

    expect(mockPrisma.streak.update).not.toHaveBeenCalled();
  });

  it("one or more impulse transactions today: resets streak to 0", async () => {
    const now = new Date();
    mockPrisma.transaction.count.mockResolvedValue(2);
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "NO_IMPULSE_PURCHASES", currentCount: 5, lastActivityAt: daysAgo(1) })
    );

    await evaluateNoImpulsePurchases(USER_ID, now);

    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(0);
    expect(data.lastActivityAt).toBe(now);
  });

  it("already evaluated today: skips update", async () => {
    const now = new Date();
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "NO_IMPULSE_PURCHASES", currentCount: 5, lastActivityAt: now })
    );

    await evaluateNoImpulsePurchases(USER_ID, now);

    expect(mockPrisma.streak.update).not.toHaveBeenCalled();
  });

  it("continuing from yesterday with no impulse: increments streak", async () => {
    const now = new Date();
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.streak.upsert.mockResolvedValue(
      makeStreak({ type: "NO_IMPULSE_PURCHASES", currentCount: 7, longestCount: 10, lastActivityAt: daysAgo(1) })
    );

    await evaluateNoImpulsePurchases(USER_ID, now);

    const data = mockPrisma.streak.update.mock.calls[0][0].data;
    expect(data.currentCount).toBe(8);
  });
});
