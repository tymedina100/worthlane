import { Prisma, prisma } from "@worthlane/db";

/**
 * Removes a user without leaving an ACTIVE ghost household member. Shared-goal
 * contribution rows retain the departing member attribution, while editable
 * goal plans are transferred to the remaining partner.
 */
export async function deleteUserAccountData(userId: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      const memberships = await tx.householdMember.findMany({
        where: { userId },
        select: {
          id: true,
          householdId: true,
          role: true,
          status: true,
        },
      });

      for (const membership of memberships) {
        await tx.householdAccountAccess.deleteMany({
          where: { memberId: membership.id },
        });

        if (membership.status !== "ACTIVE") {
          await tx.householdMember.update({
            where: { id: membership.id },
            data: { status: "REMOVED", role: "MEMBER", endedAt: now },
          });
          continue;
        }

        const remainingMembers = await tx.householdMember.findMany({
          where: {
            householdId: membership.householdId,
            id: { not: membership.id },
            status: "ACTIVE",
            userId: { not: null },
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: { id: true, role: true },
        });
        const successor =
          remainingMembers.find((member) => member.role === "OWNER") ??
          remainingMembers[0];

        if (!successor) {
          await tx.household.delete({ where: { id: membership.householdId } });
          continue;
        }

        const affectedResponsibilities =
          await tx.householdResponsibility.findMany({
            where: {
              householdId: membership.householdId,
              isActive: true,
              allocations: { some: { memberId: membership.id } },
            },
            select: { id: true },
          });

        for (const responsibility of affectedResponsibilities) {
          await tx.householdResponsibility.update({
            where: { id: responsibility.id },
            data: {
              mode: "MEMBER",
              allocations: {
                deleteMany: {},
                create: {
                  memberId: successor.id,
                  shareBasisPoints: 10_000,
                },
              },
            },
          });
        }

        const affectedGoals = await tx.householdGoal.findMany({
          where: {
            householdId: membership.householdId,
            isArchived: false,
            participants: { some: { memberId: membership.id } },
          },
          select: { id: true, targetAmount: true },
        });

        for (const goal of affectedGoals) {
          await tx.householdGoalParticipant.deleteMany({
            where: { goalId: goal.id, memberId: membership.id },
          });
          await tx.householdGoalParticipant.upsert({
            where: {
              goalId_memberId: { goalId: goal.id, memberId: successor.id },
            },
            create: {
              goalId: goal.id,
              memberId: successor.id,
              customTargetAmount: goal.targetAmount,
            },
            update: { customTargetAmount: goal.targetAmount },
          });
          await tx.householdGoal.update({
            where: { id: goal.id },
            data: { contributionMode: "CUSTOM" },
          });
        }

        if (membership.role === "OWNER" && successor.role !== "OWNER") {
          await tx.householdMember.update({
            where: { id: successor.id },
            data: { role: "OWNER" },
          });
        }

        await tx.householdMember.update({
          where: { id: membership.id },
          data: { status: "REMOVED", role: "MEMBER", endedAt: now },
        });
        await tx.household.update({
          where: { id: membership.householdId },
          data: { updatedAt: now },
        });
      }

      await tx.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      // Budgets reference custom categories with RESTRICT.
      await tx.budget.deleteMany({ where: { userId } });
      await tx.plaidItem.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
