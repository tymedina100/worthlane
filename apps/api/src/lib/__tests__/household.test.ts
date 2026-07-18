import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, MockPrismaClientKnownRequestError } = vi.hoisted(() => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }

  const mockPrisma = {
    household: { findUnique: vi.fn(), update: vi.fn() },
    householdMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    account: { findMany: vi.fn() },
    householdResponsibility: { findMany: vi.fn() },
    householdGoal: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    householdGoalContribution: { create: vi.fn() },
    transaction: { groupBy: vi.fn() },
    $transaction: vi.fn(),
  };

  return { mockPrisma, MockPrismaClientKnownRequestError };
});

vi.mock("@worthlane/db", () => ({
  prisma: mockPrisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
  },
}));

import {
  addHouseholdGoalContribution,
  getHouseholdSummary,
  HouseholdConflictError,
  HouseholdNotFoundError,
} from "../household";

const TYLER_USER_ID = "user-tyler";
const RACHEL_USER_ID = "user-rachel";
const TYLER_MEMBER_ID = "member-tyler";
const RACHEL_MEMBER_ID = "member-rachel";
const HOUSEHOLD_ID = "household-1";

const decimal = (value: number) => ({ toNumber: () => value });
const now = new Date("2026-07-16T12:00:00.000Z");

const members = [
  {
    id: TYLER_MEMBER_ID,
    householdId: HOUSEHOLD_ID,
    userId: TYLER_USER_ID,
    displayName: "Tyler",
    role: "OWNER",
    status: "ACTIVE",
    incomeBasis: decimal(6_000),
    joinedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: RACHEL_MEMBER_ID,
    householdId: HOUSEHOLD_ID,
    userId: RACHEL_USER_ID,
    displayName: "Rachel",
    role: "MEMBER",
    status: "ACTIVE",
    incomeBasis: decimal(4_000),
    joinedAt: now,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  },
];

function contextFor(userId: string) {
  const member = members.find((item) => item.userId === userId);
  return member
    ? { id: member.id, householdId: HOUSEHOLD_ID, role: member.role }
    : null;
}

describe("household summary privacy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    mockPrisma.householdMember.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(contextFor(where.userId))
    );
    mockPrisma.household.findUnique.mockResolvedValue({
      id: HOUSEHOLD_ID,
      name: "Tyler & Rachel",
      timezone: "America/Phoenix",
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    });
    mockPrisma.householdMember.findMany.mockResolvedValue(members);
    mockPrisma.householdResponsibility.findMany.mockResolvedValue([]);
    mockPrisma.householdGoal.findMany.mockResolvedValue([]);
    mockPrisma.transaction.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("omits personal partner accounts, aggregates summary access, and details shared access", async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: "tyler-own",
        userId: TYLER_USER_ID,
        name: "Tyler Checking",
        institutionName: "Demo Bank",
        type: "CHECKING",
        currentBalance: decimal(1_000),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [],
      },
      {
        id: "rachel-personal",
        userId: RACHEL_USER_ID,
        name: "Rachel Personal",
        institutionName: "Private Bank",
        type: "CHECKING",
        currentBalance: decimal(700),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [],
      },
      {
        id: "rachel-summary",
        userId: RACHEL_USER_ID,
        name: "Rachel Summary Account",
        institutionName: "Summary Bank",
        type: "CHECKING",
        currentBalance: decimal(500),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [
          { memberId: TYLER_MEMBER_ID, visibility: "SUMMARY" },
        ],
      },
      {
        id: "rachel-shared",
        userId: RACHEL_USER_ID,
        name: "Rachel Shared Savings",
        institutionName: "Shared Bank",
        type: "SAVINGS",
        currentBalance: decimal(800),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [
          { memberId: TYLER_MEMBER_ID, visibility: "SHARED" },
        ],
      },
    ]);

    const summary = await getHouseholdSummary(TYLER_USER_ID);

    expect(summary.finances.detailedAccounts.map((account) => account.id)).toEqual([
      "tyler-own",
      "rachel-shared",
    ]);
    expect(summary.finances.detailedAccounts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "rachel-personal" }),
        expect.objectContaining({ id: "rachel-summary" }),
      ])
    );
    expect(summary.finances.summaryOnlyByOwner).toEqual([
      {
        ownerMemberId: RACHEL_MEMBER_ID,
        ownerName: "Rachel",
        assetsMinor: 50_000,
        liabilitiesMinor: 0,
        netWorthMinor: 50_000,
      },
    ]);
    expect(summary.finances.visibleNetWorthMinor).toBe(230_000);
  });

  it("does not derive responsibility activity from summary-only partner accounts", async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: "tyler-own",
        userId: TYLER_USER_ID,
        name: "Tyler Checking",
        institutionName: "Demo Bank",
        type: "CHECKING",
        currentBalance: decimal(1_000),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [],
      },
      {
        id: "rachel-summary",
        userId: RACHEL_USER_ID,
        name: "Rachel Summary Account",
        institutionName: "Summary Bank",
        type: "CHECKING",
        currentBalance: decimal(500),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [
          { memberId: TYLER_MEMBER_ID, visibility: "SUMMARY" },
        ],
      },
      {
        id: "rachel-shared",
        userId: RACHEL_USER_ID,
        name: "Rachel Shared Savings",
        institutionName: "Shared Bank",
        type: "SAVINGS",
        currentBalance: decimal(800),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [
          { memberId: TYLER_MEMBER_ID, visibility: "SHARED" },
        ],
      },
    ]);
    mockPrisma.householdResponsibility.findMany.mockResolvedValue([
      {
        id: "responsibility-food",
        householdId: HOUSEHOLD_ID,
        categoryId: "category-food",
        slug: "food",
        name: "Groceries & dining",
        monthlyAmount: decimal(1_000),
        mode: "MEMBER",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        category: { id: "category-food", name: "Food & Drink" },
        allocations: [
          {
            memberId: TYLER_MEMBER_ID,
            shareBasisPoints: 10_000,
            member: members[0],
          },
        ],
      },
    ]);

    await getHouseholdSummary(TYLER_USER_ID);

    expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: { in: ["tyler-own", "rachel-shared"] },
          date: {
            gte: new Date("2026-07-01T07:00:00.000Z"),
            lt: new Date("2026-08-01T07:00:00.000Z"),
          },
        }),
      })
    );
  });

  it("reports the account owner's effective outgoing visibility", async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: "tyler-shared-summary",
        userId: TYLER_USER_ID,
        name: "Tyler Checking",
        institutionName: "Demo Bank",
        type: "CHECKING",
        currentBalance: decimal(1_000),
        createdAt: now,
        updatedAt: now,
        householdAccesses: [
          { memberId: RACHEL_MEMBER_ID, visibility: "SUMMARY" },
        ],
      },
    ]);

    const summary = await getHouseholdSummary(TYLER_USER_ID);

    expect(summary.finances.detailedAccounts[0]?.visibility).toBe("SUMMARY");
  });

  it("rejects users without an active household membership", async () => {
    mockPrisma.householdMember.findFirst.mockResolvedValue(null);
    await expect(getHouseholdSummary("not-a-member")).rejects.toBeInstanceOf(
      HouseholdNotFoundError
    );
  });
});

describe("two-user household synchronization", () => {
  it("shows Rachel the same canonical goal amount and version after Tyler contributes", async () => {
    const synchronizedAt = new Date("2026-07-16T13:00:00.000Z");
    const contributions = [
      {
        id: "opening-tyler",
        memberId: TYLER_MEMBER_ID,
        contributorName: "Tyler",
        amount: decimal(1_900),
        note: null,
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
      },
      {
        id: "opening-rachel",
        memberId: RACHEL_MEMBER_ID,
        contributorName: "Rachel",
        amount: decimal(1_300),
        note: null,
        createdAt: new Date("2026-06-15T12:00:00.000Z"),
      },
    ];
    const goalBase = {
      id: "goal-universal",
      householdId: HOUSEHOLD_ID,
      name: "Universal Orlando",
      targetAmount: decimal(8_000),
      targetDate: new Date("2027-06-01T12:00:00.000Z"),
      icon: "🎢",
      contributionMode: "INCOME_PROPORTIONAL",
      isArchived: false,
      createdAt: now,
      updatedAt: synchronizedAt,
      participants: [
        { memberId: TYLER_MEMBER_ID, customTargetAmount: null, member: members[0] },
        { memberId: RACHEL_MEMBER_ID, customTargetAmount: null, member: members[1] },
      ],
    };

    mockPrisma.householdMember.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(contextFor(where.userId))
    );
    mockPrisma.householdMember.findUniqueOrThrow.mockResolvedValue(members[0]);
    mockPrisma.householdGoal.findFirst.mockImplementation(() =>
      Promise.resolve({ ...goalBase, contributions: [...contributions] })
    );
    mockPrisma.householdGoalContribution.create.mockImplementation(({ data }) => {
      const contribution = {
        id: "new-contribution",
        memberId: data.memberId,
        contributorName: data.contributorName,
        amount: decimal(100),
        note: data.note,
        createdAt: data.createdAt,
      };
      contributions.unshift(contribution);
      return Promise.resolve(contribution);
    });
    mockPrisma.householdGoal.update.mockResolvedValue({
      ...goalBase,
      updatedAt: synchronizedAt,
    });
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));

    const mutation = await addHouseholdGoalContribution(
      TYLER_USER_ID,
      goalBase.id,
      { amountMinor: 10_000, note: "Desktop contribution" }
    );

    mockPrisma.household.findUnique.mockResolvedValue({
      id: HOUSEHOLD_ID,
      name: "Tyler & Rachel",
      timezone: "America/Phoenix",
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    });
    mockPrisma.householdMember.findMany.mockResolvedValue(members);
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.householdResponsibility.findMany.mockResolvedValue([]);
    mockPrisma.householdGoal.findMany.mockResolvedValue([
      { ...goalBase, contributions: [...contributions] },
    ]);
    mockPrisma.transaction.groupBy.mockResolvedValue([]);

    const rachelSummary = await getHouseholdSummary(RACHEL_USER_ID);
    const rachelGoal = rachelSummary.sharedGoals[0];

    expect(rachelGoal.currentAmountMinor).toBe(mutation.goal.currentAmountMinor);
    expect(rachelGoal.updatedAt).toBe(mutation.goal.updatedAt);
    expect(rachelGoal.currentAmountMinor).toBe(330_000);
    expect(mockPrisma.household.update).toHaveBeenCalledWith({
      where: { id: HOUSEHOLD_ID },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it("rejects a contribution that exceeds the remaining goal amount", async () => {
    mockPrisma.householdMember.findFirst.mockResolvedValue({
      id: TYLER_MEMBER_ID,
      householdId: HOUSEHOLD_ID,
      role: "OWNER",
    });
    mockPrisma.householdGoal.findFirst.mockResolvedValue({
      id: "goal-universal",
      householdId: HOUSEHOLD_ID,
      targetAmount: decimal(8_000),
      contributions: [{ amount: decimal(7_900) }],
    });
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));

    await expect(
      addHouseholdGoalContribution(TYLER_USER_ID, "goal-universal", {
        amountMinor: 20_000,
      })
    ).rejects.toBeInstanceOf(HouseholdConflictError);
  });
});
