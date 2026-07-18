import { prisma, NudgeType } from "@worthlane/db";
import {
  calculateBudgetProgress,
  fromMinorUnits,
  toMinorUnits,
} from "@worthlane/core";
import { startOfMonth, endOfMonth } from "./dates";
import { sendPushToUser } from "./push";

/**
 * Generates loss-aversion nudges for a user based on their current financial state.
 * Called by the daily cron job or manually triggered.
 */
export async function generateNudgesForUser(userId: string): Promise<void> {
  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const [budgets, streaks, goals] = await Promise.all([
    prisma.budget.findMany({ where: { userId }, include: { category: true } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
  ]);

  const nudges: { type: NudgeType; message: string }[] = [];

  // --- Budget nudges (loss aversion framing) ---
  for (const budget of budgets) {
    const spent = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        date: { gte: periodStart, lte: periodEnd },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    const spentAmount = Number(spent._sum.amount ?? 0);
    const budgetAmount = budget.amount.toNumber();
    const progress = calculateBudgetProgress(
      toMinorUnits(budgetAmount),
      toMinorUnits(spentAmount)
    );
    const remaining = fromMinorUnits(progress.remainingMinor);

    if (remaining < 0) {
      nudges.push({
        type: NudgeType.BUDGET_WARNING,
        message: `You've gone $${Math.abs(remaining).toFixed(0)} over your ${budget.category.name} budget. That's money taken from your savings.`,
      });
    } else if (progress.percentUsed >= 80) {
      nudges.push({
        type: NudgeType.BUDGET_WARNING,
        message: `Only $${remaining.toFixed(0)} left before you lose your ${budget.category.name} budget. You've been on track — don't slip now.`,
      });
    }
  }

  // --- Streak nudges ---
  for (const streak of streaks) {
    const lastActivity = streak.lastActivityAt;
    const isActiveToday = lastActivity?.toDateString() === now.toDateString();
    const isActiveYesterday = (() => {
      if (!lastActivity) return false;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return lastActivity.toDateString() === yesterday.toDateString();
    })();

    if (!isActiveToday && isActiveYesterday && streak.currentCount >= 2) {
      nudges.push({
        type: NudgeType.STREAK_AT_RISK,
        message: `Your ${streak.currentCount}-day streak is at risk. Check in now to keep it alive.`,
      });
    }
  }

  // --- Goal milestone nudges ---
  for (const goal of goals) {
    const percent =
      goal.targetAmount.toNumber() > 0
        ? (goal.currentAmount.toNumber() / goal.targetAmount.toNumber()) * 100
        : 0;

    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (Math.floor(percent) === milestone) {
        nudges.push({
          type: NudgeType.GOAL_MILESTONE,
          message: `You've reached ${milestone}% of your "${goal.name}" goal. Keep going — you're ${100 - milestone}% away from finishing.`,
        });
      }
    }
  }

  // --- Upcoming bill nudges ---
  const threeDaysOut = new Date(now);
  threeDaysOut.setDate(threeDaysOut.getDate() + 3);
  const upcomingBills = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      isMuted: false,
      nextDueDate: { gte: now, lte: threeDaysOut },
    },
    orderBy: { nextDueDate: "asc" },
    take: 2,
  });

  for (const bill of upcomingBills) {
    const daysAway = Math.max(
      0,
      Math.round((bill.nextDueDate.getTime() - now.getTime()) / 86_400_000)
    );
    const when = daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;
    nudges.push({
      type: NudgeType.BILL_DUE,
      message: `${bill.displayName} ($${bill.averageAmount.toNumber().toFixed(0)}) hits ${when}. Make sure the money is there — overdraft fees are pure loss.`,
    });
  }

  // --- Weekly summary nudge (impulse spending) ---
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const impulseAgg = await prisma.transaction.aggregate({
    where: {
      userId,
      isImpulse: true,
      date: { gte: sevenDaysAgo, lte: now },
      amount: { gt: 0 },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const impulseCount = impulseAgg._count.id;
  const impulseTotal = Number(impulseAgg._sum.amount ?? 0);

  if (impulseTotal > 0) {
    nudges.push({
      type: NudgeType.WEEKLY_SUMMARY,
      message: `You made ${impulseCount} impulse ${impulseCount === 1 ? "buy" : "buys"} this week totaling $${impulseTotal.toFixed(0)}. That's $${impulseTotal.toFixed(0)} that didn't go toward your goals.`,
    });
  }

  // --- Impulse flag nudge (same-day feedback) ---
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const impulseFlaggedToday = await prisma.transaction.findFirst({
    where: { userId, isImpulse: true, date: { gte: todayStart } },
    orderBy: { date: "desc" },
    select: { merchantName: true, amount: true },
  });

  if (impulseFlaggedToday) {
    nudges.push({
      type: NudgeType.IMPULSE_FLAG,
      message: `You flagged ${impulseFlaggedToday.merchantName ?? "a purchase"} as an impulse buy today ($${Number(impulseFlaggedToday.amount).toFixed(0)}). That's awareness — now use it.`,
    });
  }

  // Write nudges to DB. The (userId, type, day) unique constraint makes this
  // race-free: concurrent generators lose with P2002 instead of duplicating.
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (const nudge of nudges) {
    try {
      await prisma.nudge.create({ data: { userId, day, ...nudge } });
      await sendPushToUser(userId, nudge.message);
    } catch (error) {
      const isDuplicate =
        typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
      if (!isDuplicate) throw error;
    }
  }
}
