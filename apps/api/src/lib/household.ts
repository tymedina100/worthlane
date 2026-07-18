import {
  acceptHouseholdPartnerInviteResultSchema,
  createHouseholdResultSchema,
  householdAccountDetailSchema,
  householdAccountVisibilityResultSchema,
  householdGoalContributionResultSchema,
  householdGoalSummarySchema,
  householdResponsibilitySummarySchema,
  householdSummarySchema,
  householdPartnerInviteResultSchema,
  householdPartnerInvitationsSchema,
  setHouseholdIncomeBasesResultSchema,
  type AcceptHouseholdPartnerInviteResult,
  type CreateHousehold,
  type AccountVisibility,
  type CreateHouseholdGoal,
  type CreateHouseholdGoalContribution,
  type CreateHouseholdResponsibility,
  type HouseholdAccountDetail,
  type HouseholdAccountVisibilityResult,
  type HouseholdGoalContributionResult,
  type HouseholdSummary,
  type LinkHouseholdPartner,
  type HouseholdPartnerInviteResult,
  type HouseholdPartnerInvitationSummary,
  type SetHouseholdAccountVisibility,
  type SetHouseholdIncomeBases,
  type UpdateHouseholdGoal,
  type UpdateHouseholdResponsibility,
} from "@worthlane/contracts";
import {
  allocateEqual,
  allocateGoalContributions,
  allocateResponsibility,
  computeNetWorthBreakdownMinor,
  computeNetWorthMinor,
  monthRangeInTimeZone,
  toMinorUnits,
} from "@worthlane/core";
import { Prisma, prisma } from "@worthlane/db";
import { randomUUID } from "node:crypto";

export class HouseholdNotFoundError extends Error {}
export class HouseholdConflictError extends Error {}
export class HouseholdForbiddenError extends Error {}
export class HouseholdValidationError extends Error {}

export interface HouseholdContext {
  userId: string;
  householdId: string;
  memberId: string;
  role: "OWNER" | "MEMBER";
}

async function requireHouseholdContextFrom(
  client: Pick<Prisma.TransactionClient, "householdMember">,
  userId: string
): Promise<HouseholdContext> {
  const membership = await client.householdMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { id: true, householdId: true, role: true },
  });

  if (!membership) {
    throw new HouseholdNotFoundError("Active household not found");
  }

  return {
    userId,
    householdId: membership.householdId,
    memberId: membership.id,
    role: membership.role,
  };
}

export async function requireHouseholdContext(userId: string): Promise<HouseholdContext> {
  return requireHouseholdContextFrom(prisma, userId);
}

export async function requireHouseholdOwnerContext(
  userId: string
): Promise<HouseholdContext> {
  const context = await requireHouseholdContext(userId);
  if (context.role !== "OWNER") {
    throw new HouseholdForbiddenError("Household owner permission required");
  }
  return context;
}

export async function createHouseholdForUser(
  userId: string,
  input: CreateHousehold
) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format(new Date());
  } catch {
    throw new HouseholdValidationError("Timezone is invalid");
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.householdMember.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true },
        });
        if (existing) {
          throw new HouseholdConflictError("This login already belongs to an active household");
        }
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) throw new HouseholdNotFoundError("User not found");

        const household = await tx.household.create({
          data: {
            slug: resourceSlug(input.name),
            name: input.name,
            timezone: input.timezone,
            currency: input.currency,
          },
        });
        const member = await tx.householdMember.create({
          data: {
            householdId: household.id,
            userId,
            displayName: input.displayName,
            role: "OWNER",
            status: "ACTIVE",
            incomeBasis:
              input.incomeBasisMinor === undefined
                ? null
                : minorUnitsToDecimalString(input.incomeBasisMinor),
          },
        });
        return { household, member };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return createHouseholdResultSchema.parse({
      householdId: result.household.id,
      memberId: result.member.id,
      name: result.household.name,
      timezone: result.household.timezone,
      currency: result.household.currency,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new HouseholdConflictError("Household data changed; please try again");
    }
    throw error;
  }
}

function minorUnitsToDecimalString(amountMinor: number): string {
  const absolute = Math.abs(amountMinor);
  const sign = amountMinor < 0 ? "-" : "";
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function effectiveOutgoingVisibility(
  accesses: { memberId: string; visibility: AccountVisibility }[],
  activeMemberIds: Set<string>,
  ownerMemberId: string
): AccountVisibility {
  let effective: AccountVisibility = "PERSONAL";
  for (const access of accesses) {
    if (access.memberId === ownerMemberId || !activeMemberIds.has(access.memberId)) {
      continue;
    }
    if (access.visibility === "SHARED") return "SHARED";
    if (access.visibility === "SUMMARY") effective = "SUMMARY";
  }
  return effective;
}

export async function getHouseholdSummary(userId: string): Promise<HouseholdSummary> {
  const context = await requireHouseholdContext(userId);

  const [household, members, responsibilities, goals] = await Promise.all([
    prisma.household.findUnique({ where: { id: context.householdId } }),
    prisma.householdMember.findMany({
      where: { householdId: context.householdId, status: "ACTIVE" },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.householdResponsibility.findMany({
      where: { householdId: context.householdId, isActive: true },
      include: {
        category: true,
        allocations: { include: { member: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.householdGoal.findMany({
      where: { householdId: context.householdId, isArchived: false },
      include: {
        participants: { include: { member: true } },
        contributions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { targetDate: "asc" },
    }),
  ]);

  if (!household) {
    throw new HouseholdNotFoundError("Household not found");
  }

  const memberByUserId = new Map(
    members
      .filter((member): member is typeof member & { userId: string } => member.userId !== null)
      .map((member) => [member.userId, member])
  );
  const activeMemberIds = new Set(members.map((member) => member.id));
  const memberUserIds = [...memberByUserId.keys()];

  const accounts = await prisma.account.findMany({
    where: { userId: { in: memberUserIds } },
    include: {
      householdAccesses: { where: { householdId: context.householdId } },
    },
    orderBy: { createdAt: "asc" },
  });

  const detailedAccounts: HouseholdSummary["finances"]["detailedAccounts"] = [];
  const summaryAccountsByOwner = new Map<
    string,
    { ownerName: string; accounts: { type: string; currentBalanceMinor: number }[] }
  >();
  const allVisibleBalances: { type: string; currentBalanceMinor: number }[] = [];

  for (const account of accounts) {
    const owner = memberByUserId.get(account.userId);
    if (!owner) continue;

    const balance = {
      type: account.type,
      currentBalanceMinor: toMinorUnits(account.currentBalance.toNumber()),
    };
    const isOwner = account.userId === userId;
    const viewerAccess = account.householdAccesses.find(
      (access) => access.memberId === context.memberId
    );
    const visibility = isOwner
      ? effectiveOutgoingVisibility(
          account.householdAccesses,
          activeMemberIds,
          context.memberId
        )
      : viewerAccess?.visibility ?? "PERSONAL";

    if (isOwner || visibility === "SHARED") {
      detailedAccounts.push({
        id: account.id,
        name: account.name,
        institutionName: account.institutionName,
        type: account.type,
        currentBalanceMinor: balance.currentBalanceMinor,
        ownerMemberId: owner.id,
        ownerName: owner.displayName,
        visibility,
        isOwner,
        updatedAt: account.updatedAt.toISOString(),
      });
      allVisibleBalances.push(balance);
      continue;
    }

    if (visibility === "SUMMARY") {
      const ownerSummary = summaryAccountsByOwner.get(owner.id) ?? {
        ownerName: owner.displayName,
        accounts: [],
      };
      ownerSummary.accounts.push(balance);
      summaryAccountsByOwner.set(owner.id, ownerSummary);
      allVisibleBalances.push(balance);
    }
  }

  const summaryOnlyByOwner = [...summaryAccountsByOwner.entries()].map(
    ([ownerMemberId, summary]) => {
      const breakdown = computeNetWorthBreakdownMinor(summary.accounts);
      return {
        ownerMemberId,
        ownerName: summary.ownerName,
        assetsMinor: breakdown.assetsMinor,
        liabilitiesMinor: breakdown.liabilitiesMinor,
        netWorthMinor: computeNetWorthMinor(summary.accounts),
      };
    }
  );

  const participatingAccountIds = accounts
    .filter(
      (account) =>
        account.userId === userId ||
        account.householdAccesses.some(
          (access) =>
            access.memberId === context.memberId && access.visibility === "SHARED"
        )
    )
    .map((account) => account.id);
  const categoryIds = responsibilities
    .map((responsibility) => responsibility.categoryId)
    .filter((categoryId): categoryId is string => categoryId !== null);
  const now = new Date();
  const month = monthRangeInTimeZone(now, household.timezone);
  const spendingRows =
    participatingAccountIds.length > 0 && categoryIds.length > 0
      ? await prisma.transaction.groupBy({
          by: ["userId", "categoryId"],
          where: {
            accountId: { in: participatingAccountIds },
            categoryId: { in: categoryIds },
            amount: { gt: 0 },
            date: { gte: month.start, lt: month.end },
          },
          _sum: { amount: true },
        })
      : [];

  const appliedSpendByMemberAndCategory = new Map<string, number>();
  for (const row of spendingRows) {
    if (!row.categoryId) continue;
    const member = memberByUserId.get(row.userId);
    if (!member) continue;
    const key = `${member.id}:${row.categoryId}`;
    appliedSpendByMemberAndCategory.set(key, toMinorUnits(Number(row._sum.amount ?? 0)));
  }

  const responsibilitySummaries = responsibilities.map((responsibility) => {
    const allocationMemberIds = responsibility.allocations.map(
      (allocation) => allocation.memberId
    );
    const totalMinor = toMinorUnits(responsibility.monthlyAmount.toNumber());
    const targetAllocations = allocateResponsibility(
      totalMinor,
      responsibility.mode === "MEMBER"
        ? { mode: "MEMBER", memberId: allocationMemberIds[0] ?? "" }
        : responsibility.mode === "EQUAL"
          ? { mode: "EQUAL", memberIds: allocationMemberIds }
          : {
              mode: "PERCENTAGE",
              shares: responsibility.allocations.map((allocation) => ({
                memberId: allocation.memberId,
                basisPoints: allocation.shareBasisPoints ?? 0,
              })),
            }
    );
    const equalBasisPoints =
      responsibility.mode === "EQUAL"
        ? new Map(
            allocateEqual(10_000, allocationMemberIds).map((allocation) => [
              allocation.memberId,
              allocation.amountMinor,
            ])
          )
        : null;

    return {
      id: responsibility.id,
      name: responsibility.name,
      categoryId: responsibility.categoryId,
      categoryName: responsibility.category?.name ?? responsibility.name,
      mode: responsibility.mode,
      monthlyAmountMinor: totalMinor,
      allocations: targetAllocations.map((target) => {
        const source = responsibility.allocations.find(
          (allocation) => allocation.memberId === target.memberId
        );
        const appliedSpendMinor = responsibility.categoryId
          ? appliedSpendByMemberAndCategory.get(
              `${target.memberId}:${responsibility.categoryId}`
            ) ?? 0
          : 0;
        const shareBasisPoints =
          responsibility.mode === "MEMBER"
            ? 10_000
            : responsibility.mode === "EQUAL"
              ? equalBasisPoints?.get(target.memberId) ?? 0
              : source?.shareBasisPoints ?? 0;

        return {
          memberId: target.memberId,
          displayName: source?.member.displayName ?? "Household member",
          shareBasisPoints,
          assignedMinor: target.amountMinor,
          appliedSpendMinor,
          remainingMinor: target.amountMinor - appliedSpendMinor,
          percentUsed: percent(appliedSpendMinor, target.amountMinor),
        };
      }),
      updatedAt: responsibility.updatedAt.toISOString(),
    };
  });

  const sharedGoals = goals.map((goal) => {
    const targetAmountMinor = toMinorUnits(goal.targetAmount.toNumber());
    const contributionPlan = allocateGoalContributions(
      targetAmountMinor,
      goal.contributionMode,
      goal.participants.map((participant) => ({
        memberId: participant.memberId,
        customAmountMinor:
          participant.customTargetAmount === null
            ? undefined
            : toMinorUnits(participant.customTargetAmount.toNumber()),
        incomeMinor:
          participant.member.incomeBasis === null
            ? undefined
            : toMinorUnits(participant.member.incomeBasis.toNumber()),
      }))
    );
    const contributedByMember = new Map<string, number>();
    let currentAmountMinor = 0;
    for (const contribution of goal.contributions) {
      const amountMinor = toMinorUnits(contribution.amount.toNumber());
      currentAmountMinor += amountMinor;
      if (contribution.memberId) {
        contributedByMember.set(
          contribution.memberId,
          (contributedByMember.get(contribution.memberId) ?? 0) + amountMinor
        );
      }
    }

    return {
      id: goal.id,
      name: goal.name,
      targetAmountMinor,
      currentAmountMinor,
      remainingMinor: targetAmountMinor - currentAmountMinor,
      percentComplete: Math.min(100, percent(currentAmountMinor, targetAmountMinor)),
      targetDate: goal.targetDate?.toISOString() ?? null,
      icon: goal.icon,
      contributionMode: goal.contributionMode,
      participants: contributionPlan.map((plan) => {
        const participant = goal.participants.find(
          (item) => item.memberId === plan.memberId
        );
        const contributedAmountMinor = contributedByMember.get(plan.memberId) ?? 0;
        return {
          memberId: plan.memberId,
          displayName: participant?.member.displayName ?? "Household member",
          plannedContributionMinor: plan.amountMinor,
          contributedAmountMinor,
          remainingMinor: plan.amountMinor - contributedAmountMinor,
          percentComplete: Math.min(100, percent(contributedAmountMinor, plan.amountMinor)),
        };
      }),
      recentContributions: goal.contributions.slice(0, 5).map((contribution) => ({
        id: contribution.id,
        memberId: contribution.memberId,
        contributorName: contribution.contributorName,
        amountMinor: toMinorUnits(contribution.amount.toNumber()),
        note: contribution.note,
        createdAt: contribution.createdAt.toISOString(),
      })),
      updatedAt: goal.updatedAt.toISOString(),
    };
  });

  return householdSummarySchema.parse({
    household: {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      currency: household.currency,
      updatedAt: household.updatedAt.toISOString(),
    },
    viewerMemberId: context.memberId,
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId ?? "former-member",
      displayName: member.displayName,
      role: member.role,
      isCurrentUser: member.id === context.memberId,
      incomeBasisMinor:
        member.incomeBasis === null
          ? null
          : toMinorUnits(member.incomeBasis.toNumber()),
    })),
    finances: {
      scope: "VISIBLE_TO_CALLER",
      visibleNetWorthMinor: computeNetWorthMinor(allVisibleBalances),
      detailedAccounts,
      summaryOnlyByOwner,
    },
    responsibilities: responsibilitySummaries,
    sharedGoals,
  });
}

export async function addHouseholdGoalContribution(
  userId: string,
  goalId: string,
  input: CreateHouseholdGoalContribution
): Promise<HouseholdGoalContributionResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const context = await requireHouseholdContextFrom(tx, userId);
        const goal = await tx.householdGoal.findFirst({
          where: {
            id: goalId,
            householdId: context.householdId,
            isArchived: false,
            participants: { some: { memberId: context.memberId } },
          },
          include: { contributions: true },
        });

        if (!goal) {
          throw new HouseholdNotFoundError("Shared goal not found");
        }

        const targetAmountMinor = toMinorUnits(goal.targetAmount.toNumber());
        const currentBeforeMinor = goal.contributions.reduce(
          (sum, contribution) => sum + toMinorUnits(contribution.amount.toNumber()),
          0
        );
        if (currentBeforeMinor + input.amountMinor > targetAmountMinor) {
          throw new HouseholdConflictError("Contribution exceeds the remaining goal amount");
        }

        const now = new Date();
        const [contribution, updatedGoal] = await Promise.all([
          tx.householdGoalContribution.create({
            data: {
              goalId: goal.id,
              memberId: context.memberId,
              contributorName: await tx.householdMember
                .findUniqueOrThrow({ where: { id: context.memberId } })
                .then((member) => member.displayName),
              amount: minorUnitsToDecimalString(input.amountMinor),
              note: input.note?.trim() || null,
              createdAt: now,
            },
          }),
          tx.householdGoal.update({
            where: { id: goal.id },
            data: { updatedAt: now },
          }),
          tx.household.update({
            where: { id: context.householdId },
            data: { updatedAt: now },
          }),
        ]);
        const currentAmountMinor = currentBeforeMinor + input.amountMinor;

        return {
          contribution: {
            id: contribution.id,
            memberId: contribution.memberId,
            contributorName: contribution.contributorName,
            amountMinor: input.amountMinor,
            note: contribution.note,
            createdAt: contribution.createdAt.toISOString(),
          },
          goal: {
            id: goal.id,
            currentAmountMinor,
            remainingMinor: targetAmountMinor - currentAmountMinor,
            percentComplete: Math.min(100, percent(currentAmountMinor, targetAmountMinor)),
            updatedAt: updatedGoal.updatedAt.toISOString(),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return householdGoalContributionResultSchema.parse(result);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new HouseholdConflictError("Household data changed; please try again");
    }
    throw error;
  }
}

type ResponsibilityRecord = Prisma.HouseholdResponsibilityGetPayload<{
  include: {
    category: true;
    allocations: { include: { member: true } };
  };
}>;

type GoalRecord = Prisma.HouseholdGoalGetPayload<{
  include: {
    participants: { include: { member: true } };
    contributions: true;
  };
}>;

async function runHouseholdMutation<T>(
  userId: string,
  ownerOnly: boolean,
  mutate: (
    tx: Prisma.TransactionClient,
    context: HouseholdContext,
    now: Date
  ) => Promise<T>
): Promise<{ value: T; householdUpdatedAt: Date }> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const context = await requireHouseholdContextFrom(tx, userId);
        if (ownerOnly && context.role !== "OWNER") {
          throw new HouseholdForbiddenError("Household owner permission required");
        }

        const now = new Date();
        const value = await mutate(tx, context, now);
        const household = await tx.household.update({
          where: { id: context.householdId },
          data: { updatedAt: now },
          select: { updatedAt: true },
        });
        return { value, householdUpdatedAt: household.updatedAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new HouseholdConflictError("Household data changed; please try again");
    }
    throw error;
  }
}

function resourceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "household-item";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function responsibilityWriteData(
  input: CreateHouseholdResponsibility | UpdateHouseholdResponsibility
): {
  mode: "MEMBER" | "EQUAL" | "PERCENTAGE";
  allocations: { memberId: string; shareBasisPoints: number | null }[];
} {
  if (input.assignment.mode === "ASSIGNED") {
    return {
      mode: "MEMBER",
      allocations: [
        { memberId: input.assignment.memberId, shareBasisPoints: 10_000 },
      ],
    };
  }
  if (input.assignment.mode === "EQUAL") {
    return {
      mode: "EQUAL",
      allocations: input.assignment.memberIds.map((memberId) => ({
        memberId,
        shareBasisPoints: null,
      })),
    };
  }
  return {
    mode: "PERCENTAGE",
    allocations: input.assignment.shares.map((share) => ({
      memberId: share.memberId,
      shareBasisPoints: share.basisPoints,
    })),
  };
}

async function requireActiveAllocationMembers(
  tx: Prisma.TransactionClient,
  householdId: string,
  memberIds: string[]
) {
  const members = await tx.householdMember.findMany({
    where: { householdId, status: "ACTIVE", id: { in: memberIds } },
    select: { id: true, userId: true, incomeBasis: true },
  });
  if (members.length !== new Set(memberIds).size) {
    throw new HouseholdValidationError(
      "Every allocation must reference an active household member"
    );
  }
  return members;
}

async function requireHouseholdCategory(
  tx: Prisma.TransactionClient,
  householdId: string,
  categoryId: string | null | undefined
) {
  if (!categoryId) return;
  const members = await tx.householdMember.findMany({
    where: { householdId, status: "ACTIVE", userId: { not: null } },
    select: { userId: true },
  });
  const category = await tx.category.findFirst({
    where: {
      id: categoryId,
      OR: [
        { isSystem: true },
        {
          userId: {
            in: members
              .map((member) => member.userId)
              .filter((memberId): memberId is string => memberId !== null),
          },
        },
      ],
    },
    select: { id: true },
  });
  if (!category) {
    throw new HouseholdValidationError(
      "Category is not available to this household"
    );
  }
}

function serializeResponsibilityDefinition(responsibility: ResponsibilityRecord) {
  const memberIds = responsibility.allocations.map(
    (allocation) => allocation.memberId
  );
  const monthlyAmountMinor = toMinorUnits(responsibility.monthlyAmount.toNumber());
  const targets = allocateResponsibility(
    monthlyAmountMinor,
    responsibility.mode === "MEMBER"
      ? { mode: "MEMBER", memberId: memberIds[0] ?? "" }
      : responsibility.mode === "EQUAL"
        ? { mode: "EQUAL", memberIds }
        : {
            mode: "PERCENTAGE",
            shares: responsibility.allocations.map((allocation) => ({
              memberId: allocation.memberId,
              basisPoints: allocation.shareBasisPoints ?? 0,
            })),
          }
  );
  const equalShares =
    responsibility.mode === "EQUAL"
      ? new Map(
          allocateEqual(10_000, memberIds).map((allocation) => [
            allocation.memberId,
            allocation.amountMinor,
          ])
        )
      : null;

  return householdResponsibilitySummarySchema.parse({
    id: responsibility.id,
    name: responsibility.name,
    categoryId: responsibility.categoryId,
    categoryName: responsibility.category?.name ?? responsibility.name,
    mode: responsibility.mode,
    monthlyAmountMinor,
    allocations: targets.map((target) => {
      const allocation = responsibility.allocations.find(
        (item) => item.memberId === target.memberId
      );
      return {
        memberId: target.memberId,
        displayName: allocation?.member.displayName ?? "Household member",
        shareBasisPoints:
          responsibility.mode === "MEMBER"
            ? 10_000
            : responsibility.mode === "EQUAL"
              ? equalShares?.get(target.memberId) ?? 0
              : allocation?.shareBasisPoints ?? 0,
        assignedMinor: target.amountMinor,
        appliedSpendMinor: 0,
        remainingMinor: target.amountMinor,
        percentUsed: 0,
      };
    }),
    updatedAt: responsibility.updatedAt.toISOString(),
  });
}

function serializeGoal(goal: GoalRecord) {
  const targetAmountMinor = toMinorUnits(goal.targetAmount.toNumber());
  const plan = allocateGoalContributions(
    targetAmountMinor,
    goal.contributionMode,
    goal.participants.map((participant) => ({
      memberId: participant.memberId,
      customAmountMinor:
        participant.customTargetAmount === null
          ? undefined
          : toMinorUnits(participant.customTargetAmount.toNumber()),
      incomeMinor:
        participant.member.incomeBasis === null
          ? undefined
          : toMinorUnits(participant.member.incomeBasis.toNumber()),
    }))
  );
  const contributedByMember = new Map<string, number>();
  let currentAmountMinor = 0;
  for (const contribution of goal.contributions) {
    const amountMinor = toMinorUnits(contribution.amount.toNumber());
    currentAmountMinor += amountMinor;
    if (contribution.memberId) {
      contributedByMember.set(
        contribution.memberId,
        (contributedByMember.get(contribution.memberId) ?? 0) + amountMinor
      );
    }
  }
  const recent = [...goal.contributions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return householdGoalSummarySchema.parse({
    id: goal.id,
    name: goal.name,
    targetAmountMinor,
    currentAmountMinor,
    remainingMinor: targetAmountMinor - currentAmountMinor,
    percentComplete: Math.min(100, percent(currentAmountMinor, targetAmountMinor)),
    targetDate: goal.targetDate?.toISOString() ?? null,
    icon: goal.icon,
    contributionMode: goal.contributionMode,
    participants: plan.map((planned) => {
      const participant = goal.participants.find(
        (item) => item.memberId === planned.memberId
      );
      const contributedAmountMinor = contributedByMember.get(planned.memberId) ?? 0;
      return {
        memberId: planned.memberId,
        displayName: participant?.member.displayName ?? "Household member",
        plannedContributionMinor: planned.amountMinor,
        contributedAmountMinor,
        remainingMinor: planned.amountMinor - contributedAmountMinor,
        percentComplete: Math.min(
          100,
          percent(contributedAmountMinor, planned.amountMinor)
        ),
      };
    }),
    recentContributions: recent.map((contribution) => ({
      id: contribution.id,
      memberId: contribution.memberId,
      contributorName: contribution.contributorName,
      amountMinor: toMinorUnits(contribution.amount.toNumber()),
      note: contribution.note,
      createdAt: contribution.createdAt.toISOString(),
    })),
    updatedAt: goal.updatedAt.toISOString(),
  });
}

export async function listHouseholdResponsibilities(userId: string) {
  return (await getHouseholdSummary(userId)).responsibilities;
}

export async function setHouseholdIncomeBases(
  userId: string,
  input: SetHouseholdIncomeBases
) {
  const result = await runHouseholdMutation(userId, true, async (tx, context) => {
    const memberIds = input.members.map((member) => member.memberId);
    await requireActiveAllocationMembers(tx, context.householdId, memberIds);
    await Promise.all(
      input.members.map((member) =>
        tx.householdMember.update({
          where: { id: member.memberId },
          data: {
            incomeBasis: minorUnitsToDecimalString(member.incomeBasisMinor),
          },
        })
      )
    );
    return input.members;
  });
  return setHouseholdIncomeBasesResultSchema.parse({
    members: result.value,
    householdUpdatedAt: result.householdUpdatedAt.toISOString(),
  });
}

export async function createHouseholdResponsibility(
  userId: string,
  input: CreateHouseholdResponsibility
) {
  const result = await runHouseholdMutation(userId, true, async (tx, context) => {
    const write = responsibilityWriteData(input);
    await requireActiveAllocationMembers(
      tx,
      context.householdId,
      write.allocations.map((allocation) => allocation.memberId)
    );
    await requireHouseholdCategory(tx, context.householdId, input.categoryId);
    if (input.categoryId) {
      const duplicate = await tx.householdResponsibility.findFirst({
        where: {
          householdId: context.householdId,
          categoryId: input.categoryId,
          isActive: true,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new HouseholdConflictError(
          "This category already has an active household responsibility"
        );
      }
    }
    return tx.householdResponsibility.create({
      data: {
        householdId: context.householdId,
        slug: resourceSlug(input.name),
        name: input.name,
        categoryId: input.categoryId ?? null,
        monthlyAmount: minorUnitsToDecimalString(input.monthlyAmountMinor),
        mode: write.mode,
        allocations: { create: write.allocations },
      },
      include: {
        category: true,
        allocations: { include: { member: true } },
      },
    });
  });
  const current = (await getHouseholdSummary(userId)).responsibilities.find(
    (responsibility) => responsibility.id === result.value.id
  );
  if (!current) {
    throw new HouseholdNotFoundError("Household responsibility not found");
  }
  return current;
}

export async function updateHouseholdResponsibility(
  userId: string,
  responsibilityId: string,
  input: UpdateHouseholdResponsibility
) {
  const result = await runHouseholdMutation(userId, true, async (tx, context) => {
    const existing = await tx.householdResponsibility.findFirst({
      where: {
        id: responsibilityId,
        householdId: context.householdId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new HouseholdNotFoundError("Household responsibility not found");
    }
    const write = responsibilityWriteData(input);
    await requireActiveAllocationMembers(
      tx,
      context.householdId,
      write.allocations.map((allocation) => allocation.memberId)
    );
    await requireHouseholdCategory(tx, context.householdId, input.categoryId);
    if (input.categoryId) {
      const duplicate = await tx.householdResponsibility.findFirst({
        where: {
          householdId: context.householdId,
          categoryId: input.categoryId,
          isActive: true,
          id: { not: existing.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new HouseholdConflictError(
          "This category already has an active household responsibility"
        );
      }
    }
    return tx.householdResponsibility.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        categoryId: input.categoryId ?? null,
        monthlyAmount: minorUnitsToDecimalString(input.monthlyAmountMinor),
        mode: write.mode,
        allocations: {
          deleteMany: {},
          create: write.allocations,
        },
      },
      include: {
        category: true,
        allocations: { include: { member: true } },
      },
    });
  });
  const current = (await getHouseholdSummary(userId)).responsibilities.find(
    (responsibility) => responsibility.id === result.value.id
  );
  if (!current) {
    throw new HouseholdNotFoundError("Household responsibility not found");
  }
  return current;
}

export async function deleteHouseholdResponsibility(
  userId: string,
  responsibilityId: string
) {
  const result = await runHouseholdMutation(userId, true, async (tx, context) => {
    const existing = await tx.householdResponsibility.findFirst({
      where: {
        id: responsibilityId,
        householdId: context.householdId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!existing) {
      throw new HouseholdNotFoundError("Household responsibility not found");
    }
    await tx.householdResponsibility.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
    return existing.id;
  });
  return {
    id: result.value,
    deleted: true as const,
    householdUpdatedAt: result.householdUpdatedAt.toISOString(),
  };
}

async function validateGoalParticipants(
  tx: Prisma.TransactionClient,
  householdId: string,
  input: CreateHouseholdGoal | UpdateHouseholdGoal
) {
  const memberIds = input.participants.map((participant) => participant.memberId);
  const members = await requireActiveAllocationMembers(tx, householdId, memberIds);
  if (
    input.contributionMode === "INCOME_PROPORTIONAL" &&
    members.some(
      (member) =>
        member.incomeBasis === null || member.incomeBasis.toNumber() <= 0
    )
  ) {
    throw new HouseholdValidationError(
      "Income-proportional participants need a positive income basis"
    );
  }
  if (
    input.contributionMode === "CUSTOM" &&
    input.participants.reduce(
      (total, participant) => total + participant.customTargetAmountMinor,
      0
    ) !== input.targetAmountMinor
  ) {
    throw new HouseholdValidationError(
      "Custom participant targets must equal the goal target"
    );
  }
  return new Map(members.map((member) => [member.id, member]));
}

function allocateGoalInputPlan(
  input: CreateHouseholdGoal | UpdateHouseholdGoal,
  members: Map<
    string,
    { id: string; incomeBasis: { toNumber(): number } | null }
  >
) {
  if (input.contributionMode === "CUSTOM") {
    return allocateGoalContributions(
      input.targetAmountMinor,
      input.contributionMode,
      input.participants.map((participant) => ({
        memberId: participant.memberId,
        customAmountMinor: participant.customTargetAmountMinor,
      }))
    );
  }
  return allocateGoalContributions(
    input.targetAmountMinor,
    input.contributionMode,
    input.participants.map((participant) => ({
      memberId: participant.memberId,
      incomeMinor:
        members.get(participant.memberId)?.incomeBasis === null
          ? undefined
          : toMinorUnits(
              members.get(participant.memberId)!.incomeBasis!.toNumber()
            ),
    }))
  );
}

function goalParticipantWrites(input: CreateHouseholdGoal | UpdateHouseholdGoal) {
  if (input.contributionMode === "CUSTOM") {
    return input.participants.map((participant) => ({
      memberId: participant.memberId,
      customTargetAmount: minorUnitsToDecimalString(
        participant.customTargetAmountMinor
      ),
    }));
  }
  return input.participants.map((participant) => ({
    memberId: participant.memberId,
    customTargetAmount: null,
  }));
}

export async function listHouseholdGoals(userId: string) {
  return (await getHouseholdSummary(userId)).sharedGoals;
}

export async function createHouseholdGoal(
  userId: string,
  input: CreateHouseholdGoal
) {
  const result = await runHouseholdMutation(
    userId,
    true,
    async (tx, context) => {
      await validateGoalParticipants(tx, context.householdId, input);
      return tx.householdGoal.create({
        data: {
          householdId: context.householdId,
          slug: resourceSlug(input.name),
          name: input.name,
          targetAmount: minorUnitsToDecimalString(input.targetAmountMinor),
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          type: input.type ?? "SAVINGS",
          icon: input.icon ?? null,
          contributionMode: input.contributionMode,
          participants: { create: goalParticipantWrites(input) },
        },
        include: {
          participants: { include: { member: true } },
          contributions: true,
        },
      });
    }
  );
  return serializeGoal(result.value);
}

export async function updateHouseholdGoal(
  userId: string,
  goalId: string,
  input: UpdateHouseholdGoal
) {
  const result = await runHouseholdMutation(
    userId,
    true,
    async (tx, context) => {
      const existing = await tx.householdGoal.findFirst({
        where: {
          id: goalId,
          householdId: context.householdId,
          isArchived: false,
        },
        include: {
          contributions: true,
          participants: { include: { member: true } },
        },
      });
      if (!existing) {
        throw new HouseholdNotFoundError("Shared goal not found");
      }
      const contributedMinor = existing.contributions.reduce(
        (total, contribution) =>
          total + toMinorUnits(contribution.amount.toNumber()),
        0
      );
      if (contributedMinor > input.targetAmountMinor) {
        throw new HouseholdConflictError(
          "Goal target cannot be lower than recorded contributions"
        );
      }
      const participantMembers = await validateGoalParticipants(
        tx,
        context.householdId,
        input
      );
      const existingPlan = new Map(
        allocateGoalContributions(
          toMinorUnits(existing.targetAmount.toNumber()),
          existing.contributionMode,
          existing.participants.map((participant) => ({
            memberId: participant.memberId,
            customAmountMinor:
              participant.customTargetAmount === null
                ? undefined
                : toMinorUnits(participant.customTargetAmount.toNumber()),
            incomeMinor:
              participant.member.incomeBasis === null
                ? undefined
                : toMinorUnits(participant.member.incomeBasis.toNumber()),
          }))
        ).map((allocation) => [allocation.memberId, allocation.amountMinor])
      );
      const proposedPlan = new Map(
        allocateGoalInputPlan(input, participantMembers).map((allocation) => [
          allocation.memberId,
          allocation.amountMinor,
        ])
      );
      const contributingMemberIds = new Set(
        existing.contributions
          .filter(
            (contribution) =>
              contribution.memberId !== null && contribution.amount.toNumber() > 0
          )
          .map((contribution) => contribution.memberId!)
          .filter((memberId) => existingPlan.has(memberId))
      );
      for (const memberId of contributingMemberIds) {
        if (
          proposedPlan.get(memberId) === undefined ||
          proposedPlan.get(memberId) !== existingPlan.get(memberId)
        ) {
          throw new HouseholdConflictError(
            "A participant with recorded contributions cannot be removed or reallocated"
          );
        }
      }
      return tx.householdGoal.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          targetAmount: minorUnitsToDecimalString(input.targetAmountMinor),
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          type: input.type ?? existing.type,
          icon: input.icon ?? null,
          contributionMode: input.contributionMode,
          participants: {
            deleteMany: {},
            create: goalParticipantWrites(input),
          },
        },
        include: {
          participants: { include: { member: true } },
          contributions: true,
        },
      });
    }
  );
  return serializeGoal(result.value);
}

export async function setHouseholdAccountVisibility(
  userId: string,
  accountId: string,
  input: SetHouseholdAccountVisibility
): Promise<HouseholdAccountVisibilityResult> {
  const result = await runHouseholdMutation(
    userId,
    false,
    async (tx, context) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!account) {
        throw new HouseholdNotFoundError("Account not found");
      }
      const recipients = await tx.householdMember.findMany({
        where: {
          householdId: context.householdId,
          status: "ACTIVE",
          id: { not: context.memberId },
        },
        select: { id: true },
      });
      if (recipients.length === 0) {
        throw new HouseholdConflictError("No active household partner found");
      }
      for (const recipient of recipients) {
        await tx.householdAccountAccess.upsert({
          where: {
            accountId_memberId: {
              accountId: account.id,
              memberId: recipient.id,
            },
          },
          create: {
            householdId: context.householdId,
            accountId: account.id,
            memberId: recipient.id,
            visibility: input.visibility,
          },
          update: { visibility: input.visibility },
        });
      }
      return { accountId: account.id, recipientIds: recipients.map((item) => item.id) };
    }
  );
  return householdAccountVisibilityResultSchema.parse({
    accountId: result.value.accountId,
    visibility: input.visibility,
    sharedWithMemberIds: result.value.recipientIds,
    householdUpdatedAt: result.householdUpdatedAt.toISOString(),
  });
}

export async function getHouseholdAccountDetail(
  userId: string,
  accountId: string
): Promise<HouseholdAccountDetail> {
  const context = await requireHouseholdContext(userId);
  const members = await prisma.householdMember.findMany({
    where: {
      householdId: context.householdId,
      status: "ACTIVE",
      userId: { not: null },
    },
    select: { id: true, userId: true, displayName: true },
  });
  const memberUserIds = members
    .map((member) => member.userId)
    .filter((memberId): memberId is string => memberId !== null);
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: { in: memberUserIds } },
    include: {
      householdAccesses: {
        where: { householdId: context.householdId },
      },
      transactions: {
        where: { userId: { in: memberUserIds } },
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 100,
      },
    },
  });
  if (!account) {
    throw new HouseholdNotFoundError("Account not found");
  }
  const owner = members.find((member) => member.userId === account.userId);
  if (!owner) {
    throw new HouseholdNotFoundError("Account not found");
  }
  const isOwner = account.userId === userId;
  const access = account.householdAccesses.find(
    (item) => item.memberId === context.memberId
  );
  if (!isOwner && access?.visibility !== "SHARED") {
    throw new HouseholdNotFoundError("Account not found");
  }

  return householdAccountDetailSchema.parse({
    id: account.id,
    name: account.name,
    institutionName: account.institutionName,
    type: account.type,
    currentBalanceMinor: toMinorUnits(account.currentBalance.toNumber()),
    ownerMemberId: owner.id,
    ownerName: owner.displayName,
    visibility: isOwner
      ? effectiveOutgoingVisibility(
          account.householdAccesses,
          new Set(members.map((member) => member.id)),
          context.memberId
        )
      : "SHARED",
    isOwner,
    updatedAt: account.updatedAt.toISOString(),
    transactions: account.transactions.map((transaction) => ({
      id: transaction.id,
      amountMinor: toMinorUnits(transaction.amount.toNumber()),
      date: transaction.date.toISOString(),
      merchantName: transaction.merchantName,
      category: transaction.category
        ? {
            id: transaction.category.id,
            name: transaction.category.name,
            icon: transaction.category.icon,
            color: transaction.category.color,
          }
        : null,
      isManual: transaction.isManual,
      isImpulse: transaction.isImpulse,
      note: transaction.note,
    })),
  });
}

function defaultPartnerName(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Partner";
  return local.replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 80);
}

const PARTNER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function linkHouseholdPartner(
  userId: string,
  input: LinkHouseholdPartner
): Promise<HouseholdPartnerInviteResult> {
  await runHouseholdMutation(
    userId,
    true,
    async (tx, context, now) => {
      const inviteCutoff = new Date(now.getTime() - PARTNER_INVITE_TTL_MS);
      const target = await tx.user.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
        select: { id: true, email: true },
      });
      if (!target || target.id === userId) return;
      const occupiedPartnerSlot = await tx.householdMember.findFirst({
        where: {
          householdId: context.householdId,
          id: { not: context.memberId },
          OR: [
            { status: "ACTIVE" },
            { status: "INVITED", updatedAt: { gte: inviteCutoff } },
          ],
        },
        select: { userId: true },
      });
      if (
        occupiedPartnerSlot &&
        occupiedPartnerSlot.userId !== target.id
      ) {
        return;
      }
      const occupiedElsewhere = await tx.householdMember.findFirst({
        where: {
          userId: target.id,
          OR: [
            { status: "ACTIVE" },
            { status: "INVITED", updatedAt: { gte: inviteCutoff } },
          ],
          NOT: { householdId: context.householdId },
        },
        select: { id: true },
      });
      if (occupiedElsewhere) return;
      const existing = await tx.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: context.householdId,
            userId: target.id,
          },
        },
      });
      if (
        existing?.status === "ACTIVE" ||
        (existing?.status === "INVITED" && existing.updatedAt >= inviteCutoff)
      ) {
        return;
      }
      const displayName =
        input.displayName ?? existing?.displayName ?? defaultPartnerName(target.email);
      if (existing) {
        await tx.householdAccountAccess.deleteMany({
          where: {
            householdId: context.householdId,
            OR: [
              { memberId: existing.id },
              { account: { userId: target.id } },
            ],
          },
        });
        await tx.householdMember.update({
          where: { id: existing.id },
          data: {
            displayName,
            role: "MEMBER",
            status: "INVITED",
            joinedAt: null,
            endedAt: null,
            updatedAt: now,
          },
        });
      } else {
        await tx.householdMember.create({
          data: {
            householdId: context.householdId,
            userId: target.id,
            displayName,
            role: "MEMBER",
            status: "INVITED",
          },
        });
      }
    }
  );
  return householdPartnerInviteResultSchema.parse({
    status: "PENDING",
    message: "If this email is eligible, a partner invitation is pending.",
  });
}

export async function acceptHouseholdPartnerInvite(
  userId: string,
  invitationId: string
): Promise<AcceptHouseholdPartnerInviteResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const inviteCutoff = new Date(now.getTime() - PARTNER_INVITE_TTL_MS);
        const activeMembership = await tx.householdMember.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true },
        });
        if (activeMembership) {
          throw new HouseholdConflictError("User already has an active household");
        }
        const invite = await tx.householdMember.findFirst({
          where: {
            id: invitationId,
            userId,
            status: "INVITED",
            updatedAt: { gte: inviteCutoff },
          },
          orderBy: { createdAt: "asc" },
        });
        if (!invite) {
          throw new HouseholdNotFoundError("Partner invitation not found");
        }
        const owner = await tx.householdMember.findFirst({
          where: {
            householdId: invite.householdId,
            role: "OWNER",
            status: "ACTIVE",
          },
          select: { id: true },
        });
        if (!owner) {
          throw new HouseholdNotFoundError("Partner invitation not found");
        }
        const member = await tx.householdMember.update({
          where: { id: invite.id },
          data: { status: "ACTIVE", joinedAt: now, endedAt: null },
        });
        await tx.householdMember.updateMany({
          where: {
            userId,
            status: "INVITED",
            id: { not: invite.id },
          },
          data: { status: "REMOVED", endedAt: now },
        });
        const household = await tx.household.update({
          where: { id: invite.householdId },
          data: { updatedAt: now },
          select: { updatedAt: true },
        });
        return { member, householdUpdatedAt: household.updatedAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    return acceptHouseholdPartnerInviteResultSchema.parse({
      member: {
        id: result.member.id,
        userId: result.member.userId,
        displayName: result.member.displayName,
        role: result.member.role,
        isCurrentUser: true,
        incomeBasisMinor:
          result.member.incomeBasis === null
            ? null
            : toMinorUnits(result.member.incomeBasis.toNumber()),
      },
      householdUpdatedAt: result.householdUpdatedAt.toISOString(),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new HouseholdConflictError("Household data changed; please try again");
    }
    throw error;
  }
}

export async function listHouseholdPartnerInvitations(
  userId: string
): Promise<HouseholdPartnerInvitationSummary[]> {
  const now = new Date();
  const inviteCutoff = new Date(now.getTime() - PARTNER_INVITE_TTL_MS);
  const invitations = await prisma.householdMember.findMany({
    where: {
      userId,
      status: "INVITED",
      updatedAt: { gte: inviteCutoff },
    },
    include: {
      household: {
        include: {
          members: {
            where: { role: "OWNER", status: "ACTIVE" },
            select: { displayName: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  });
  return householdPartnerInvitationsSchema.parse(
    invitations
      .filter((invitation) => invitation.household.members.length > 0)
      .map((invitation) => ({
        id: invitation.id,
        householdId: invitation.householdId,
        householdName: invitation.household.name,
        invitedByName: invitation.household.members[0]!.displayName,
        invitedAt: invitation.updatedAt.toISOString(),
        expiresAt: new Date(
          invitation.updatedAt.getTime() + PARTNER_INVITE_TTL_MS
        ).toISOString(),
      }))
  );
}
