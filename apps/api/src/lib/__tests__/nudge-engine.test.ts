import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures mockPrisma is available inside the vi.mock factory (which is hoisted to top)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    budget: { findMany: vi.fn() },
    streak: { findMany: vi.fn() },
    goal: { findMany: vi.fn() },
    transaction: { aggregate: vi.fn(), findFirst: vi.fn() },
    nudge: { findFirst: vi.fn(), create: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@finance/db", () => ({
  prisma: mockPrisma,
  NudgeType: {
    BUDGET_WARNING: "BUDGET_WARNING",
    STREAK_AT_RISK: "STREAK_AT_RISK",
    GOAL_MILESTONE: "GOAL_MILESTONE",
    WEEKLY_SUMMARY: "WEEKLY_SUMMARY",
    IMPULSE_FLAG: "IMPULSE_FLAG",
  },
}));

import { generateNudgesForUser } from "../nudge-engine";

const USER_ID = "user-test-123";

function makeCategory(name = "Food") {
  return { id: "cat-1", name, color: "#f00", icon: "🍔" };
}

function makeBudget(amount: number, categoryId = "cat-1") {
  return { id: "bud-1", userId: USER_ID, amount: { toNumber: () => amount }, categoryId, category: makeCategory() };
}

function makeStreak(currentCount: number, lastActivityAt: Date | null) {
  return { id: "str-1", userId: USER_ID, type: "DAILY_CHECKIN", currentCount, longestCount: currentCount, lastActivityAt };
}

function makeGoal(name: string, current: number, target: number) {
  return { id: "goal-1", userId: USER_ID, name, currentAmount: { toNumber: () => current }, targetAmount: { toNumber: () => target } };
}

function aggResult(amount: number, count = 0) {
  return { _sum: { amount }, _count: { id: count } };
}

beforeEach(() => {
  vi.clearAllMocks();
  // No push token by default → sendPushToUser is a no-op in tests
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.nudge.findFirst.mockResolvedValue(null);
  mockPrisma.nudge.create.mockResolvedValue({});
  mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0));
  mockPrisma.transaction.findFirst.mockResolvedValue(null);
});

describe("BUDGET_WARNING nudge", () => {
  beforeEach(() => {
    mockPrisma.streak.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
  });

  it("generates nudge when spending is over budget", async () => {
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce(aggResult(120)) // spent $120 on $100 budget
      .mockResolvedValueOnce(aggResult(0));  // no impulse

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("BUDGET_WARNING");
    expect(call.data.message).toContain("over");
  });

  it("generates nudge when spending is ≥80% of budget", async () => {
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce(aggResult(85))
      .mockResolvedValueOnce(aggResult(0));

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("BUDGET_WARNING");
    expect(call.data.message).toContain("left");
  });

  it("does not generate nudge when spending is under 80%", async () => {
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget(100)]);
    mockPrisma.transaction.aggregate
      .mockResolvedValueOnce(aggResult(50))
      .mockResolvedValueOnce(aggResult(0));

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});

describe("STREAK_AT_RISK nudge", () => {
  beforeEach(() => {
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0));
  });

  it("generates nudge when streak was active yesterday but not today", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockPrisma.streak.findMany.mockResolvedValue([makeStreak(5, yesterday)]);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("STREAK_AT_RISK");
    expect(call.data.message).toContain("5-day");
  });

  it("does not generate nudge when streak is already active today", async () => {
    const today = new Date();
    mockPrisma.streak.findMany.mockResolvedValue([makeStreak(5, today)]);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });

  it("does not generate nudge when streak count is less than 2", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockPrisma.streak.findMany.mockResolvedValue([makeStreak(1, yesterday)]);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});

describe("GOAL_MILESTONE nudge", () => {
  beforeEach(() => {
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.streak.findMany.mockResolvedValue([]);
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0));
  });

  it.each([
    [25, 25, 100],
    [50, 50, 100],
    [75, 75, 100],
  ])("generates nudge at %d%% milestone", async (milestone, current, target) => {
    mockPrisma.goal.findMany.mockResolvedValue([makeGoal("Vacation", current, target)]);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("GOAL_MILESTONE");
    expect(call.data.message).toContain(`${milestone}%`);
  });

  it("does not generate nudge at non-milestone percentages", async () => {
    mockPrisma.goal.findMany.mockResolvedValue([makeGoal("Vacation", 40, 100)]);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});

describe("WEEKLY_SUMMARY nudge", () => {
  beforeEach(() => {
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.streak.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
  });

  it("generates nudge when impulse spending exists", async () => {
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(89, 4));

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("WEEKLY_SUMMARY");
    expect(call.data.message).toContain("4 impulse");
    expect(call.data.message).toContain("$89");
  });

  it("does not generate nudge when impulse total is $0", async () => {
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0, 0));

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});

describe("IMPULSE_FLAG nudge", () => {
  beforeEach(() => {
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.streak.findMany.mockResolvedValue([]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0));
  });

  it("generates nudge with merchant name when impulse transaction exists today", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({
      merchantName: "Starbucks",
      amount: 7,
    });

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("IMPULSE_FLAG");
    expect(call.data.message).toContain("Starbucks");
    expect(call.data.message).toContain("$7");
  });

  it("generates nudge with 'a purchase' fallback when merchantName is null", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({
      merchantName: null,
      amount: 15,
    });

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).toHaveBeenCalledOnce();
    const call = mockPrisma.nudge.create.mock.calls[0][0];
    expect(call.data.type).toBe("IMPULSE_FLAG");
    expect(call.data.message).toContain("a purchase");
  });

  it("does not generate nudge when no impulse transactions today", async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});

describe("nudge deduplication", () => {
  it("skips creating a nudge when one already exists for today", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockPrisma.budget.findMany.mockResolvedValue([]);
    mockPrisma.streak.findMany.mockResolvedValue([makeStreak(5, yesterday)]);
    mockPrisma.goal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.aggregate.mockResolvedValue(aggResult(0));

    mockPrisma.nudge.findFirst.mockResolvedValue({ id: "existing-nudge" });

    await generateNudgesForUser(USER_ID);

    expect(mockPrisma.nudge.create).not.toHaveBeenCalled();
  });
});
