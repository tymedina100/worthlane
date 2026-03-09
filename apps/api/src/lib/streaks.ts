import { prisma, StreakType } from "@finance/db";
import { startOfMonth, endOfMonth, startOfWeek } from "./dates";

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

function isYesterday(date: Date): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return date.toDateString() === y.toDateString();
}

function isThisWeek(date: Date): boolean {
  return date >= startOfWeek(new Date());
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function evaluateDailyCheckin(userId: string, now: Date) {
  const streak = await prisma.streak.upsert({
    where: { userId_type: { userId, type: StreakType.DAILY_CHECKIN } },
    create: {
      userId,
      type: StreakType.DAILY_CHECKIN,
      currentCount: 1,
      longestCount: 1,
      lastActivityAt: now,
    },
    update: {},
  });

  const alreadyCheckedIn = streak.lastActivityAt ? isToday(streak.lastActivityAt) : false;

  let updatedStreak = streak;
  if (!streak.lastActivityAt || !isToday(streak.lastActivityAt)) {
    const isContinuing = streak.lastActivityAt && isYesterday(streak.lastActivityAt);
    const newCount = isContinuing ? streak.currentCount + 1 : 1;
    const newLongest = Math.max(newCount, streak.longestCount);
    updatedStreak = await prisma.streak.update({
      where: { userId_type: { userId, type: StreakType.DAILY_CHECKIN } },
      data: { currentCount: newCount, longestCount: newLongest, lastActivityAt: now },
    });
  }

  return { streak: updatedStreak, alreadyCheckedIn };
}

export async function evaluateWeeklyOnBudget(userId: string, now: Date) {
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const budgets = await prisma.budget.findMany({ where: { userId } });

  let allOnBudget = true;
  for (const budget of budgets) {
    const agg = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: budget.categoryId,
        date: { gte: periodStart, lte: periodEnd },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });
    const spent = Number(agg._sum.amount ?? 0);
    if (spent > budget.amount.toNumber()) {
      allOnBudget = false;
      break;
    }
  }

  const weeklyStreak = await prisma.streak.upsert({
    where: { userId_type: { userId, type: StreakType.WEEKLY_ON_BUDGET } },
    create: {
      userId,
      type: StreakType.WEEKLY_ON_BUDGET,
      currentCount: allOnBudget ? 1 : 0,
      longestCount: allOnBudget ? 1 : 0,
      lastActivityAt: allOnBudget ? now : undefined,
    },
    update: {},
  });

  if (!weeklyStreak.lastActivityAt || !isThisWeek(weeklyStreak.lastActivityAt)) {
    if (allOnBudget) {
      const isContinuing = weeklyStreak.currentCount > 0;
      const newCount = isContinuing ? weeklyStreak.currentCount + 1 : 1;
      const newLongest = Math.max(newCount, weeklyStreak.longestCount);
      await prisma.streak.update({
        where: { userId_type: { userId, type: StreakType.WEEKLY_ON_BUDGET } },
        data: { currentCount: newCount, longestCount: newLongest, lastActivityAt: now },
      });
    } else {
      await prisma.streak.update({
        where: { userId_type: { userId, type: StreakType.WEEKLY_ON_BUDGET } },
        data: { currentCount: 0 },
      });
    }
  }

  return weeklyStreak;
}

export async function evaluateNoImpulsePurchases(userId: string, now: Date) {
  const impulseToday = await prisma.transaction.count({
    where: { userId, isImpulse: true, date: { gte: startOfDay(now) } },
  });

  const impulseStreak = await prisma.streak.upsert({
    where: { userId_type: { userId, type: StreakType.NO_IMPULSE_PURCHASES } },
    create: {
      userId,
      type: StreakType.NO_IMPULSE_PURCHASES,
      currentCount: impulseToday === 0 ? 1 : 0,
      longestCount: impulseToday === 0 ? 1 : 0,
      lastActivityAt: now,
    },
    update: {},
  });

  if (!impulseStreak.lastActivityAt || !isToday(impulseStreak.lastActivityAt)) {
    if (impulseToday === 0) {
      const isContinuing = impulseStreak.lastActivityAt && isYesterday(impulseStreak.lastActivityAt);
      const newCount = isContinuing ? impulseStreak.currentCount + 1 : 1;
      const newLongest = Math.max(newCount, impulseStreak.longestCount);
      await prisma.streak.update({
        where: { userId_type: { userId, type: StreakType.NO_IMPULSE_PURCHASES } },
        data: { currentCount: newCount, longestCount: newLongest, lastActivityAt: now },
      });
    } else {
      await prisma.streak.update({
        where: { userId_type: { userId, type: StreakType.NO_IMPULSE_PURCHASES } },
        data: { currentCount: 0, lastActivityAt: now },
      });
    }
  }

  return impulseStreak;
}
