import { assertMinorUnits } from "./money";

export interface MoneyAllocation {
  memberId: string;
  amountMinor: number;
}

export interface WeightedMember {
  memberId: string;
  weight: number;
}

export interface PercentageShare {
  memberId: string;
  basisPoints: number;
}

function assertUniqueMembers(memberIds: string[]): void {
  if (memberIds.length === 0) {
    throw new Error("at least one member is required");
  }

  if (memberIds.some((memberId) => memberId.length === 0)) {
    throw new Error("member IDs cannot be empty");
  }

  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error("member IDs must be unique");
  }
}

export function allocateByWeights(totalMinor: number, members: WeightedMember[]): MoneyAllocation[] {
  assertMinorUnits(totalMinor, "total");
  assertUniqueMembers(members.map((member) => member.memberId));

  for (const member of members) {
    if (!Number.isSafeInteger(member.weight) || member.weight < 0) {
      throw new Error("weights must be non-negative safe integers");
    }
  }

  const totalWeight = members.reduce((sum, member) => sum + BigInt(member.weight), BigInt(0));
  if (totalWeight === BigInt(0)) {
    throw new Error("at least one weight must be greater than zero");
  }

  const total = BigInt(totalMinor);
  const working = members.map((member) => {
    const weightedTotal = total * BigInt(member.weight);
    const rawRemainder = weightedTotal % totalWeight;

    return {
      memberId: member.memberId,
      amountMinor: Number(weightedTotal / totalWeight),
      remainder: rawRemainder < BigInt(0) ? -rawRemainder : rawRemainder,
    };
  });

  const allocated = working.reduce((sum, item) => sum + item.amountMinor, 0);
  const unallocated = totalMinor - allocated;
  const direction = Math.sign(unallocated);
  const unitsToDistribute = Math.abs(unallocated);

  const ranked = [...working].sort((left, right) => {
    if (left.remainder !== right.remainder) {
      return left.remainder > right.remainder ? -1 : 1;
    }
    if (left.memberId === right.memberId) return 0;
    return left.memberId < right.memberId ? -1 : 1;
  });

  for (let index = 0; index < unitsToDistribute; index += 1) {
    ranked[index].amountMinor += direction;
  }

  return working.map(({ memberId, amountMinor }) => ({ memberId, amountMinor }));
}

export function allocateEqual(totalMinor: number, memberIds: string[]): MoneyAllocation[] {
  return allocateByWeights(
    totalMinor,
    memberIds.map((memberId) => ({ memberId, weight: 1 }))
  );
}

export function allocateByPercentages(
  totalMinor: number,
  shares: PercentageShare[]
): MoneyAllocation[] {
  for (const share of shares) {
    if (!Number.isSafeInteger(share.basisPoints) || share.basisPoints < 0) {
      throw new Error("percentage shares must use non-negative integer basis points");
    }
  }

  const totalBasisPoints = shares.reduce((sum, share) => sum + share.basisPoints, 0);
  if (totalBasisPoints !== 10_000) {
    throw new Error("percentage shares must total 10000 basis points");
  }

  return allocateByWeights(
    totalMinor,
    shares.map((share) => ({ memberId: share.memberId, weight: share.basisPoints }))
  );
}

export type ResponsibilityPlan =
  | { mode: "MEMBER"; memberId: string }
  | { mode: "EQUAL"; memberIds: string[] }
  | { mode: "PERCENTAGE"; shares: PercentageShare[] };

export function allocateResponsibility(
  totalMinor: number,
  plan: ResponsibilityPlan
): MoneyAllocation[] {
  if (plan.mode === "MEMBER") {
    assertMinorUnits(totalMinor, "total");
    if (!plan.memberId) throw new Error("memberId is required");
    return [{ memberId: plan.memberId, amountMinor: totalMinor }];
  }

  if (plan.mode === "EQUAL") {
    return allocateEqual(totalMinor, plan.memberIds);
  }

  return allocateByPercentages(totalMinor, plan.shares);
}

export type GoalContributionMode = "EQUAL" | "CUSTOM" | "INCOME_PROPORTIONAL";

export interface GoalParticipantInput {
  memberId: string;
  customAmountMinor?: number;
  incomeMinor?: number;
}

export function allocateGoalContributions(
  totalMinor: number,
  mode: GoalContributionMode,
  participants: GoalParticipantInput[]
): MoneyAllocation[] {
  assertMinorUnits(totalMinor, "total");
  if (totalMinor < 0) throw new Error("goal contribution total cannot be negative");
  assertUniqueMembers(participants.map((participant) => participant.memberId));

  if (mode === "EQUAL") {
    return allocateEqual(
      totalMinor,
      participants.map((participant) => participant.memberId)
    );
  }

  if (mode === "INCOME_PROPORTIONAL") {
    return allocateByWeights(
      totalMinor,
      participants.map((participant) => ({
        memberId: participant.memberId,
        weight: participant.incomeMinor ?? 0,
      }))
    );
  }

  const allocations = participants.map((participant) => {
    if (participant.customAmountMinor === undefined) {
      throw new Error("every custom contribution requires an amount");
    }
    assertMinorUnits(participant.customAmountMinor, "custom contribution");
    if (participant.customAmountMinor < 0) {
      throw new Error("custom contributions cannot be negative");
    }
    return { memberId: participant.memberId, amountMinor: participant.customAmountMinor };
  });

  const customTotal = allocations.reduce(
    (sum, allocation) => sum + BigInt(allocation.amountMinor),
    BigInt(0)
  );
  if (customTotal !== BigInt(totalMinor)) {
    throw new Error("custom contributions must total the requested amount");
  }

  return allocations;
}
