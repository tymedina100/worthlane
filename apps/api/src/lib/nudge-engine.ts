import { personalLedger } from "@/lib/personal-ledger";
import { spendingWhere } from "@/lib/spending-treatment";
import { prisma, NudgeType } from "@worthlane/db";
import {
  calculateBudgetProgress,
  fromMinorUnits,
  toMinorUnits,
} from "@worthlane/core";
import { budgetPeriod, financialTimeZone } from "./budget-period";
import { sendPushToUser } from "./push";

/**
 * Generates calm planning updates for a user based on their current financial state.
 * Called by the daily cron job or manually triggered.
 */
export async function generateNudgesForUser(userId: string): Promise<void> {
  const ledger = await personalLedger(userId);
  const now = new Date();
  const timeZone = await financialTimeZone(userId);

  const [budgets, streaks, goals] = await Promise.all([
    prisma.budget.findMany({ where: { userId }, include: { category: true } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
  ]);

  const nudges: { type: NudgeType; message: string }[] = [];

  // --- Budget updates ---
  for (const budget of budgets) {
    const { start: periodStart, end: periodEnd } = budgetPeriod(now, timeZone, budget.period);
    const spent = await prisma.transaction.aggregate({
      where: {
        categoryId: budget.categoryId,
        date: { gte: periodStart, lt: periodEnd, lte: now },
        ...spendingWhere, ...ledger.transactionWhere,
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
        message: `${budget.category.name} is $${Math.abs(remaining).toFixed(2)} over the current plan. Review recent activity or adjust the budget.`,
      });
    } else if (progress.percentUsed >= 80) {
      nudges.push({
        type: NudgeType.BUDGET_WARNING,
        message: `$${remaining.toFixed(2)} left in ${budget.category.name}. Check whether the plan still fits your upcoming needs.`,
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
        message: `You have a ${streak.currentCount}-day check-in history. Review your plan whenever it works for you.`,
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
          message: `You've reached ${milestone}% of your "${goal.name}" goal. Review your next contribution when you’re ready.`,
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
      message: `${bill.displayName}: an estimated $${bill.averageAmount.toNumber().toFixed(2)} recurring charge may occur ${when}. This is a prediction, not a confirmed due date; check with the provider.`,
    });
  }

  // --- Weekly summary nudge (impulse spending) ---
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const impulseAgg = await prisma.transaction.aggregate({
    where: {
      isImpulse: true,
      date: { gte: sevenDaysAgo, lte: now },
      ...spendingWhere, ...ledger.transactionWhere,
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const impulseCount = impulseAgg._count.id;
  const impulseTotal = Number(impulseAgg._sum.amount ?? 0);

  if (impulseTotal > 0) {
    nudges.push({
      type: NudgeType.WEEKLY_SUMMARY,
      message: `You marked ${impulseCount} impulse ${impulseCount === 1 ? "purchase" : "purchases"} this week totaling $${impulseTotal.toFixed(2)}. Review these when planning next week.`,
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
      message: `You flagged ${impulseFlaggedToday.merchantName ?? "a purchase"} as an impulse buy today ($${Number(impulseFlaggedToday.amount).toFixed(2)}). You can revisit the label or adjust your plan.`,
    });
  }

  // Write nudges to DB. The (userId, type, day) unique constraint makes this
  // race-free: concurrent generators lose with P2002 instead of duplicating.
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (const nudge of nudges) {
    try {
      await prisma.nudge.create({ data: { userId, day, ...nudge } });
      await sendPushToUser(userId);
    } catch (error) {
      const isDuplicate =
        typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
      if (!isDuplicate) throw error;
    }
  }
}
