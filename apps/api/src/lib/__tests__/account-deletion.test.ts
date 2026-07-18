import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    householdMember: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    householdAccountAccess: { deleteMany: vi.fn() },
    householdResponsibility: { findMany: vi.fn(), update: vi.fn() },
    householdGoal: { findMany: vi.fn(), update: vi.fn() },
    householdGoalParticipant: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    household: { delete: vi.fn(), update: vi.fn() },
    refreshSession: { updateMany: vi.fn() },
    budget: { deleteMany: vi.fn() },
    plaidItem: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
    $transaction: vi.fn(),
  };
  return { mockPrisma };
});

vi.mock("@worthlane/db", () => ({
  prisma: mockPrisma,
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
}));

import { deleteUserAccountData } from "../account-deletion";

describe("deleteUserAccountData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) =>
      callback(mockPrisma)
    );
    mockPrisma.householdAccountAccess.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.householdResponsibility.findMany.mockResolvedValue([]);
    mockPrisma.householdGoal.findMany.mockResolvedValue([]);
    mockPrisma.householdMember.update.mockResolvedValue({});
    mockPrisma.household.update.mockResolvedValue({});
    mockPrisma.refreshSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.budget.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.plaidItem.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.user.delete.mockResolvedValue({});
  });

  it("transfers ownership and reassigns responsibilities to the remaining partner", async () => {
    mockPrisma.householdMember.findMany
      .mockResolvedValueOnce([
        {
          id: "member-tyler",
          householdId: "household-1",
          role: "OWNER",
          status: "ACTIVE",
        },
      ])
      .mockResolvedValueOnce([
        { id: "member-rachel", role: "MEMBER" },
      ]);
    mockPrisma.householdResponsibility.findMany.mockResolvedValue([
      { id: "responsibility-1" },
    ]);
    mockPrisma.householdResponsibility.update.mockResolvedValue({});
    mockPrisma.householdGoal.findMany.mockResolvedValue([
      { id: "goal-1", targetAmount: "8000.00" },
    ]);
    mockPrisma.householdGoalParticipant.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.householdGoalParticipant.upsert.mockResolvedValue({});
    mockPrisma.householdGoal.update.mockResolvedValue({});

    await deleteUserAccountData("user-tyler");

    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith({
      where: { id: "member-rachel" },
      data: { role: "OWNER" },
    });
    expect(mockPrisma.householdResponsibility.update).toHaveBeenCalledWith({
      where: { id: "responsibility-1" },
      data: {
        mode: "MEMBER",
        allocations: {
          deleteMany: {},
          create: {
            memberId: "member-rachel",
            shareBasisPoints: 10_000,
          },
        },
      },
    });
    expect(mockPrisma.householdGoalParticipant.deleteMany).toHaveBeenCalledWith({
      where: { goalId: "goal-1", memberId: "member-tyler" },
    });
    expect(mockPrisma.householdGoalParticipant.upsert).toHaveBeenCalledWith({
      where: {
        goalId_memberId: { goalId: "goal-1", memberId: "member-rachel" },
      },
      create: {
        goalId: "goal-1",
        memberId: "member-rachel",
        customTargetAmount: "8000.00",
      },
      update: { customTargetAmount: "8000.00" },
    });
    expect(mockPrisma.householdGoal.update).toHaveBeenCalledWith({
      where: { id: "goal-1" },
      data: { contributionMode: "CUSTOM" },
    });
    expect(mockPrisma.householdMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-tyler" },
        data: expect.objectContaining({ status: "REMOVED", role: "MEMBER" }),
      })
    );
    expect(mockPrisma.household.delete).not.toHaveBeenCalled();
    expect(mockPrisma.refreshSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-tyler", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-tyler" },
    });
  });

  it("dissolves a household when its only active member is deleted", async () => {
    mockPrisma.householdMember.findMany
      .mockResolvedValueOnce([
        {
          id: "member-only",
          householdId: "household-only",
          role: "OWNER",
          status: "ACTIVE",
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.household.delete.mockResolvedValue({});

    await deleteUserAccountData("user-only");

    expect(mockPrisma.household.delete).toHaveBeenCalledWith({
      where: { id: "household-only" },
    });
    expect(mockPrisma.householdMember.update).not.toHaveBeenCalled();
  });
});
