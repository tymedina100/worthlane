import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHouseholdGoalSchema,
  createHouseholdSchema,
  createHouseholdResponsibilitySchema,
  setHouseholdIncomeBasesSchema,
} from "@worthlane/contracts";

const { mockPrisma, MockPrismaClientKnownRequestError } = vi.hoisted(() => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  const mockPrisma = {
    household: { create: vi.fn(), update: vi.fn() },
    householdMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    account: { findFirst: vi.fn() },
    householdAccountAccess: { upsert: vi.fn(), deleteMany: vi.fn() },
    householdResponsibility: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    householdGoal: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    category: { findFirst: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
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
  createHouseholdGoal,
  createHouseholdForUser,
  createHouseholdResponsibility,
  acceptHouseholdPartnerInvite,
  getHouseholdAccountDetail,
  HouseholdConflictError,
  HouseholdForbiddenError,
  HouseholdNotFoundError,
  HouseholdValidationError,
  linkHouseholdPartner,
  setHouseholdAccountVisibility,
  setHouseholdIncomeBases,
  updateHouseholdGoal,
  updateHouseholdResponsibility,
} from "../household";

const TYLER_USER_ID = "user-tyler";
const RACHEL_USER_ID = "user-rachel";
const TYLER_MEMBER_ID = "member-tyler";
const RACHEL_MEMBER_ID = "member-rachel";
const HOUSEHOLD_ID = "household-1";
const now = new Date("2026-07-17T12:00:00.000Z");
const decimal = (value: number) => ({ toNumber: () => value });

const ownerContext = {
  id: TYLER_MEMBER_ID,
  householdId: HOUSEHOLD_ID,
  role: "OWNER",
};

const activeMembers = [
  { id: TYLER_MEMBER_ID, userId: TYLER_USER_ID, incomeBasis: decimal(6_000) },
  { id: RACHEL_MEMBER_ID, userId: RACHEL_USER_ID, incomeBasis: decimal(4_000) },
];

describe("household management authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
    mockPrisma.householdMember.findFirst.mockResolvedValue(ownerContext);
    mockPrisma.household.update.mockResolvedValue({ updatedAt: now });
  });

  it("requires an active membership before changing account visibility", async () => {
    mockPrisma.householdMember.findFirst.mockResolvedValue(null);

    await expect(
      setHouseholdAccountVisibility(TYLER_USER_ID, "account-1", {
        visibility: "SHARED",
      })
    ).rejects.toBeInstanceOf(HouseholdNotFoundError);
    expect(mockPrisma.householdAccountAccess.upsert).not.toHaveBeenCalled();
  });

  it("creates an owner household for a login without an active membership", async () => {
    mockPrisma.householdMember.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: TYLER_USER_ID });
    mockPrisma.household.create.mockResolvedValue({
      id: HOUSEHOLD_ID,
      name: "Tyler household",
      timezone: "America/Phoenix",
      currency: "USD",
    });
    mockPrisma.householdMember.create.mockResolvedValue({ id: TYLER_MEMBER_ID });
    const input = createHouseholdSchema.parse({
      name: "Tyler household",
      displayName: "Tyler",
      timezone: "America/Phoenix",
      currency: "USD",
      incomeBasisMinor: 600_000,
    });

    const result = await createHouseholdForUser(TYLER_USER_ID, input);

    expect(mockPrisma.householdMember.create).toHaveBeenCalledWith({
      data: {
        householdId: HOUSEHOLD_ID,
        userId: TYLER_USER_ID,
        displayName: "Tyler",
        role: "OWNER",
        status: "ACTIVE",
        incomeBasis: "6000.00",
      },
    });
    expect(result).toEqual({
      householdId: HOUSEHOLD_ID,
      memberId: TYLER_MEMBER_ID,
      name: "Tyler household",
      timezone: "America/Phoenix",
      currency: "USD",
    });
  });

  it("lets an account owner share with active partners and rejects other accounts", async () => {
    mockPrisma.account.findFirst.mockResolvedValueOnce({ id: "account-1" });
    mockPrisma.householdMember.findMany.mockResolvedValue([
      { id: RACHEL_MEMBER_ID },
    ]);
    mockPrisma.householdAccountAccess.upsert.mockResolvedValue({});

    const result = await setHouseholdAccountVisibility(
      TYLER_USER_ID,
      "account-1",
      { visibility: "SHARED" }
    );

    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: "account-1", userId: TYLER_USER_ID },
      select: { id: true },
    });
    expect(mockPrisma.householdAccountAccess.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          householdId: HOUSEHOLD_ID,
          accountId: "account-1",
          memberId: RACHEL_MEMBER_ID,
          visibility: "SHARED",
        }),
      })
    );
    expect(result.sharedWithMemberIds).toEqual([RACHEL_MEMBER_ID]);

    mockPrisma.account.findFirst.mockResolvedValueOnce(null);
    await expect(
      setHouseholdAccountVisibility(TYLER_USER_ID, "partner-account", {
        visibility: "SHARED",
      })
    ).rejects.toBeInstanceOf(HouseholdNotFoundError);
  });

  it("allows account details only for the owner or explicit SHARED access", async () => {
    mockPrisma.householdMember.findMany.mockResolvedValue([
      { id: TYLER_MEMBER_ID, userId: TYLER_USER_ID, displayName: "Tyler" },
      { id: RACHEL_MEMBER_ID, userId: RACHEL_USER_ID, displayName: "Rachel" },
    ]);
    const partnerAccount = {
      id: "rachel-account",
      userId: RACHEL_USER_ID,
      name: "Rachel checking",
      institutionName: "Demo Bank",
      type: "CHECKING",
      currentBalance: decimal(1_250),
      updatedAt: now,
      householdAccesses: [
        { memberId: TYLER_MEMBER_ID, visibility: "SUMMARY" },
      ],
      transactions: [],
    };
    mockPrisma.account.findFirst.mockResolvedValue(partnerAccount);

    await expect(
      getHouseholdAccountDetail(TYLER_USER_ID, partnerAccount.id)
    ).rejects.toBeInstanceOf(HouseholdNotFoundError);

    mockPrisma.account.findFirst.mockResolvedValue({
      ...partnerAccount,
      householdAccesses: [
        { memberId: TYLER_MEMBER_ID, visibility: "SHARED" },
      ],
      transactions: [
        {
          id: "transaction-1",
          amount: decimal(42.5),
          date: now,
          merchantName: "Grocer",
          category: { id: "food", name: "Food", icon: "cart", color: "#123456" },
          isManual: false,
          isImpulse: false,
          note: null,
        },
      ],
    });
    const detail = await getHouseholdAccountDetail(
      TYLER_USER_ID,
      partnerAccount.id
    );
    expect(detail.visibility).toBe("SHARED");
    expect(detail.transactions[0]?.amountMinor).toBe(4_250);
    expect(detail).not.toHaveProperty("plaidAccountId");

    mockPrisma.account.findFirst.mockResolvedValue({
      ...partnerAccount,
      id: "tyler-account",
      userId: TYLER_USER_ID,
      householdAccesses: [
        { memberId: RACHEL_MEMBER_ID, visibility: "SUMMARY" },
      ],
      transactions: [],
    });
    const ownerDetail = await getHouseholdAccountDetail(
      TYLER_USER_ID,
      "tyler-account"
    );
    expect(ownerDetail.isOwner).toBe(true);
    expect(ownerDetail.visibility).toBe("SUMMARY");
  });

  it("keeps planning mutations owner-only", async () => {
    mockPrisma.householdMember.findFirst.mockResolvedValue({
      id: RACHEL_MEMBER_ID,
      householdId: HOUSEHOLD_ID,
      role: "MEMBER",
    });
    const input = createHouseholdResponsibilitySchema.parse({
      name: "Housing",
      monthlyAmountMinor: 200_000,
      assignment: { mode: "ASSIGNED", memberId: RACHEL_MEMBER_ID },
    });
    await expect(
      createHouseholdResponsibility(RACHEL_USER_ID, input)
    ).rejects.toBeInstanceOf(HouseholdForbiddenError);
    expect(mockPrisma.householdResponsibility.create).not.toHaveBeenCalled();
  });

  it("rejects cross-household responsibility ids and inactive allocations", async () => {
    const updateInput = createHouseholdResponsibilitySchema.parse({
      name: "Housing",
      monthlyAmountMinor: 200_000,
      assignment: { mode: "ASSIGNED", memberId: RACHEL_MEMBER_ID },
    });
    mockPrisma.householdResponsibility.findFirst.mockResolvedValue(null);
    await expect(
      updateHouseholdResponsibility(
        TYLER_USER_ID,
        "responsibility-other-household",
        updateInput
      )
    ).rejects.toBeInstanceOf(HouseholdNotFoundError);
    expect(mockPrisma.householdResponsibility.findFirst).toHaveBeenCalledWith({
      where: {
        id: "responsibility-other-household",
        householdId: HOUSEHOLD_ID,
        isActive: true,
      },
      select: { id: true },
    });

    const equalInput = createHouseholdResponsibilitySchema.parse({
      name: "Travel",
      monthlyAmountMinor: 80_000,
      assignment: {
        mode: "EQUAL",
        memberIds: [TYLER_MEMBER_ID, RACHEL_MEMBER_ID],
      },
    });
    mockPrisma.householdMember.findMany.mockResolvedValue([activeMembers[0]]);
    await expect(
      createHouseholdResponsibility(TYLER_USER_ID, equalInput)
    ).rejects.toBeInstanceOf(HouseholdValidationError);
    expect(mockPrisma.householdResponsibility.create).not.toHaveBeenCalled();
  });

  it("rejects income-proportional goals without income and preserves contributions on update", async () => {
    const incomeInput = createHouseholdGoalSchema.parse({
      name: "Universal Orlando",
      targetAmountMinor: 800_000,
      contributionMode: "INCOME_PROPORTIONAL",
      participants: [
        { memberId: TYLER_MEMBER_ID },
        { memberId: RACHEL_MEMBER_ID },
      ],
    });
    mockPrisma.householdMember.findMany.mockResolvedValue([
      activeMembers[0],
      { ...activeMembers[1], incomeBasis: null },
    ]);
    await expect(
      createHouseholdGoal(TYLER_USER_ID, incomeInput)
    ).rejects.toBeInstanceOf(HouseholdValidationError);

    const customInput = createHouseholdGoalSchema.parse({
      name: "Universal Orlando",
      targetAmountMinor: 800_000,
      contributionMode: "CUSTOM",
      participants: [
        { memberId: TYLER_MEMBER_ID, customTargetAmountMinor: 500_000 },
        { memberId: RACHEL_MEMBER_ID, customTargetAmountMinor: 300_000 },
      ],
    });
    const contribution = {
      id: "contribution-1",
      memberId: TYLER_MEMBER_ID,
      contributorName: "Tyler",
      amount: decimal(100),
      note: null,
      createdAt: now,
    };
    mockPrisma.householdGoal.findFirst.mockResolvedValue({
      id: "goal-1",
      type: "SAVINGS",
      targetAmount: decimal(8_000),
      contributionMode: "CUSTOM",
      participants: [
        {
          memberId: TYLER_MEMBER_ID,
          customTargetAmount: decimal(5_000),
          member: { ...activeMembers[0], displayName: "Tyler" },
        },
        {
          memberId: RACHEL_MEMBER_ID,
          customTargetAmount: decimal(3_000),
          member: { ...activeMembers[1], displayName: "Rachel" },
        },
      ],
      contributions: [contribution],
    });
    mockPrisma.householdMember.findMany.mockResolvedValue(activeMembers);
    mockPrisma.householdGoal.update.mockResolvedValue({
      id: "goal-1",
      householdId: HOUSEHOLD_ID,
      slug: "universal-orlando",
      name: customInput.name,
      targetAmount: decimal(8_000),
      targetDate: null,
      type: "SAVINGS",
      icon: null,
      contributionMode: "CUSTOM",
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      participants: [
        {
          memberId: TYLER_MEMBER_ID,
          customTargetAmount: decimal(5_000),
          member: { ...activeMembers[0], displayName: "Tyler" },
        },
        {
          memberId: RACHEL_MEMBER_ID,
          customTargetAmount: decimal(3_000),
          member: { ...activeMembers[1], displayName: "Rachel" },
        },
      ],
      contributions: [contribution],
    });

    const goal = await updateHouseholdGoal(TYLER_USER_ID, "goal-1", customInput);
    expect(goal.currentAmountMinor).toBe(10_000);
    const updateData = mockPrisma.householdGoal.update.mock.calls[0]?.[0].data;
    expect(updateData.participants).toEqual(
      expect.objectContaining({ deleteMany: {}, create: expect.any(Array) })
    );
    expect(updateData).not.toHaveProperty("contributions");
  });

  it("returns the same pending response for an ineligible user", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: RACHEL_USER_ID,
      email: "rachel@example.com",
    });
    mockPrisma.householdMember.findFirst.mockImplementation(({ where }) =>
      Promise.resolve(
        where.userId === TYLER_USER_ID
          ? ownerContext
          : { id: "member-other-household" }
      )
    );

    const result = await linkHouseholdPartner(TYLER_USER_ID, {
      email: "rachel@example.com",
    });
    expect(result.status).toBe("PENDING");
    expect(mockPrisma.householdMember.create).not.toHaveBeenCalled();
  });

  it("enforces the two-person household slot across active partners and pending invites", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-new-partner",
      email: "new@example.com",
    });
    mockPrisma.householdMember.findFirst
      .mockResolvedValueOnce(ownerContext)
      .mockResolvedValueOnce({ userId: RACHEL_USER_ID });

    const result = await linkHouseholdPartner(TYLER_USER_ID, {
      email: "new@example.com",
    });

    expect(result.status).toBe("PENDING");
    expect(mockPrisma.householdMember.create).not.toHaveBeenCalled();
    expect(mockPrisma.householdMember.findUnique).not.toHaveBeenCalled();
  });

  it("reactivates an expired or removed invite as INVITED and clears stale access", async () => {
    const old = new Date("2026-06-01T12:00:00.000Z");
    mockPrisma.user.findFirst.mockResolvedValue({
      id: RACHEL_USER_ID,
      email: "rachel@example.com",
    });
    mockPrisma.householdMember.findFirst
      .mockResolvedValueOnce(ownerContext)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.householdMember.findUnique.mockResolvedValue({
      id: RACHEL_MEMBER_ID,
      householdId: HOUSEHOLD_ID,
      userId: RACHEL_USER_ID,
      displayName: "Rachel",
      incomeBasis: decimal(4_000),
      role: "MEMBER",
      status: "REMOVED",
      joinedAt: null,
      endedAt: old,
      createdAt: old,
      updatedAt: old,
    });
    mockPrisma.householdAccountAccess.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.householdMember.update.mockResolvedValue({});

    await linkHouseholdPartner(TYLER_USER_ID, {
      email: "rachel@example.com",
    });

    expect(mockPrisma.householdAccountAccess.deleteMany).toHaveBeenCalledWith({
      where: {
        householdId: HOUSEHOLD_ID,
        OR: [
          { memberId: RACHEL_MEMBER_ID },
          { account: { userId: RACHEL_USER_ID } },
        ],
      },
    });
    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RACHEL_MEMBER_ID },
        data: expect.objectContaining({ status: "INVITED", joinedAt: null }),
      })
    );
  });

  it("activates only the authenticated target's unexpired invitation", async () => {
    const invite = {
      id: "invite-1",
      householdId: HOUSEHOLD_ID,
      userId: RACHEL_USER_ID,
      displayName: "Rachel",
      incomeBasis: decimal(4_000),
      role: "MEMBER",
      status: "INVITED",
      joinedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    mockPrisma.householdMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(invite)
      .mockResolvedValueOnce({ id: TYLER_MEMBER_ID });
    mockPrisma.householdMember.update.mockResolvedValue({
      ...invite,
      status: "ACTIVE",
      joinedAt: now,
    });
    mockPrisma.householdMember.updateMany.mockResolvedValue({ count: 0 });

    const accepted = await acceptHouseholdPartnerInvite(
      RACHEL_USER_ID,
      invite.id
    );

    expect(accepted.member.isCurrentUser).toBe(true);
    expect(mockPrisma.householdMember.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: invite.id,
          userId: RACHEL_USER_ID,
          status: "INVITED",
          updatedAt: { gte: expect.any(Date) },
        }),
      })
    );
    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: invite.id },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("rejects expired invitations during acceptance", async () => {
    mockPrisma.householdMember.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await expect(
      acceptHouseholdPartnerInvite(RACHEL_USER_ID, "expired-invite")
    ).rejects.toBeInstanceOf(HouseholdNotFoundError);
    expect(mockPrisma.householdMember.update).not.toHaveBeenCalled();
  });

  it("lets the owner save positive income bases for active household members", async () => {
    mockPrisma.householdMember.findMany.mockResolvedValue(activeMembers);
    mockPrisma.householdMember.update.mockResolvedValue({});
    const input = setHouseholdIncomeBasesSchema.parse({
      members: [
        { memberId: TYLER_MEMBER_ID, incomeBasisMinor: 600_000 },
        { memberId: RACHEL_MEMBER_ID, incomeBasisMinor: 400_000 },
      ],
    });

    const result = await setHouseholdIncomeBases(TYLER_USER_ID, input);

    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith({
      where: { id: TYLER_MEMBER_ID },
      data: { incomeBasis: "6000.00" },
    });
    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith({
      where: { id: RACHEL_MEMBER_ID },
      data: { incomeBasis: "4000.00" },
    });
    expect(result.members).toEqual(input.members);
  });

  it("allows only one active responsibility for a category", async () => {
    const input = createHouseholdResponsibilitySchema.parse({
      name: "Groceries",
      categoryId: "category-food",
      monthlyAmountMinor: 90_000,
      assignment: { mode: "ASSIGNED", memberId: TYLER_MEMBER_ID },
    });
    mockPrisma.householdMember.findMany
      .mockResolvedValueOnce([activeMembers[0]])
      .mockResolvedValueOnce(activeMembers);
    mockPrisma.category.findFirst.mockResolvedValue({ id: "category-food" });
    mockPrisma.householdResponsibility.findFirst.mockResolvedValue({
      id: "existing-food",
    });

    await expect(
      createHouseholdResponsibility(TYLER_USER_ID, input)
    ).rejects.toBeInstanceOf(HouseholdConflictError);
    expect(mockPrisma.householdResponsibility.create).not.toHaveBeenCalled();
  });

  it("rejects reallocating a goal participant who has recorded contributions", async () => {
    const contribution = {
      id: "contribution-1",
      memberId: TYLER_MEMBER_ID,
      contributorName: "Tyler",
      amount: decimal(100),
      note: null,
      createdAt: now,
    };
    mockPrisma.householdGoal.findFirst.mockResolvedValue({
      id: "goal-1",
      type: "SAVINGS",
      targetAmount: decimal(8_000),
      contributionMode: "EQUAL",
      participants: [
        {
          memberId: TYLER_MEMBER_ID,
          customTargetAmount: null,
          member: { ...activeMembers[0], displayName: "Tyler" },
        },
        {
          memberId: RACHEL_MEMBER_ID,
          customTargetAmount: null,
          member: { ...activeMembers[1], displayName: "Rachel" },
        },
      ],
      contributions: [contribution],
    });
    mockPrisma.householdMember.findMany.mockResolvedValue(activeMembers);
    const reallocated = createHouseholdGoalSchema.parse({
      name: "Universal Orlando",
      targetAmountMinor: 900_000,
      contributionMode: "EQUAL",
      participants: [
        { memberId: TYLER_MEMBER_ID },
        { memberId: RACHEL_MEMBER_ID },
      ],
    });

    await expect(
      updateHouseholdGoal(TYLER_USER_ID, "goal-1", reallocated)
    ).rejects.toBeInstanceOf(HouseholdConflictError);
    expect(mockPrisma.householdGoal.update).not.toHaveBeenCalled();
  });
});
