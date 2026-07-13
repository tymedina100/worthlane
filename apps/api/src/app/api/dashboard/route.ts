import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { computeNetWorth, startOfToday } from "@/lib/net-worth";
import { ok, unauthorized } from "@/lib/response";
import { startOfMonth } from "@/lib/dates";
import { obligationStatus, startOfUtcDay, toDateOnly } from "@/lib/upcoming";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const now = new Date();
  const periodStart = startOfMonth(now);
  // Cap period end at now to exclude future-dated transactions
  const periodEnd = now;

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(prevWeekStart.getDate() - 14);

  const [accounts, budgets, goals, streaks, topCategories, incomeAgg, impulseMonth, impulseThisWeek, impulsePrevWeek] =
    await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId }, include: { category: true } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.streak.findMany({ where: { userId } }),
      // Top 5 spending categories this month
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId,
          date: { gte: periodStart, lte: periodEnd },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      // Monthly income
      prisma.transaction.aggregate({
        where: {
          userId,
          date: { gte: periodStart, lte: periodEnd },
          amount: { lt: 0 }, // negative = income in Plaid convention
        },
        _sum: { amount: true },
      }),
      // Impulse this month
      prisma.transaction.aggregate({
        where: { userId, isImpulse: true, date: { gte: periodStart, lte: periodEnd }, amount: { gt: 0 } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Impulse this week (last 7 days)
      prisma.transaction.aggregate({
        where: { userId, isImpulse: true, date: { gte: thisWeekStart, lte: now }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      // Impulse previous week (7-14 days ago)
      prisma.transaction.aggregate({
        where: { userId, isImpulse: true, date: { gte: prevWeekStart, lt: thisWeekStart }, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
    ]);

  const todayStart = startOfUtcDay(now);
  const sevenDaysFromNow = new Date(todayStart);
  sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);
  const upcomingRows = await prisma.upcomingObligation.findMany({
    where: { userId, isActive: true, isPaid: false },
    orderBy: { dueDate: "asc" },
  });
  const upcomingItems = upcomingRows.map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount.toNumber(),
    dueDate: toDateOnly(row.dueDate),
    type: row.type,
    frequency: row.frequency,
    accountName: row.accountName,
    reminderTiming: row.reminderTiming,
    isPaid: row.isPaid,
    isActive: row.isActive,
    lastPaidAt: row.lastPaidAt?.toISOString() ?? null,
    status: obligationStatus(row.dueDate, row.isPaid, now),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  const dueNextSevenDays = upcomingRows
    .filter((row) => row.dueDate >= todayStart && row.dueDate <= sevenDaysFromNow)
    .reduce((sum, row) => sum + row.amount.toNumber(), 0);

  // Net worth
  const netWorth = computeNetWorth(accounts);

  // Upsert today's snapshot + fetch 90-day history
  const today = startOfToday();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [, netWorthSnapshots] = await Promise.all([
    prisma.netWorthSnapshot.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, netWorth },
      update: { netWorth },
    }),
    prisma.netWorthSnapshot.findMany({
      where: { userId, date: { gte: ninetyDaysAgo } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Monthly spending
  const spendingAgg = await prisma.transaction.aggregate({
    where: {
      userId,
      date: { gte: periodStart, lte: periodEnd },
      amount: { gt: 0 },
    },
    _sum: { amount: true },
  });

  // Budgets with spent
  const budgetsWithSpent = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          date: { gte: periodStart, lte: periodEnd },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      });
      const spentAmount = Number(spent._sum.amount ?? 0);
      const budgetAmount = b.amount.toNumber();
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        categoryIcon: b.category.icon,
        amount: budgetAmount,
        spent: spentAmount,
        remaining: budgetAmount - spentAmount,
        percentUsed: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0,
        period: b.period,
      };
    })
  );

  // Resolve category names for top spending
  const topCategoryIds = topCategories.map((t) => t.categoryId).filter(Boolean) as string[];
  const categoryDetails = await prisma.category.findMany({
    where: { id: { in: topCategoryIds } },
  });
  const categoryMap = Object.fromEntries(categoryDetails.map((c) => [c.id, c]));

  const topCategoriesResult = topCategories
    .filter((t) => t.categoryId)
    .map((t) => ({
      name: categoryMap[t.categoryId!]?.name ?? "Unknown",
      amount: Number(t._sum.amount ?? 0),
      color: categoryMap[t.categoryId!]?.color ?? "#CCC",
    }));

  // Goals with percent
  const goalsResult = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount.toNumber(),
    currentAmount: g.currentAmount.toNumber(),
    targetDate: g.targetDate?.toISOString() ?? null,
    type: g.type,
    icon: g.icon,
    percentComplete:
      g.targetAmount.toNumber() > 0
        ? Math.min(100, (g.currentAmount.toNumber() / g.targetAmount.toNumber()) * 100)
        : 0,
    projectedCompletionDate: null,
    monthlyNeeded: null,
  }));

  const streaksResult = streaks.map((s) => ({
    type: s.type,
    currentCount: s.currentCount,
    longestCount: s.longestCount,
    lastActivityAt: s.lastActivityAt?.toISOString() ?? null,
    isActiveToday: s.lastActivityAt
      ? s.lastActivityAt.toDateString() === new Date().toDateString()
      : false,
  }));

  const accountsResult = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as "CHECKING" | "SAVINGS" | "CREDIT" | "INVESTMENT" | "LOAN" | "OTHER",
    currentBalance: a.currentBalance.toNumber(),
    institutionName: a.institutionName ?? null,
  }));

  const netWorthHistory = netWorthSnapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    value: s.netWorth.toNumber(),
  }));

  return ok({
    netWorth,
    monthlyIncome: Math.abs(Number(incomeAgg._sum.amount ?? 0)),
    monthlySpending: Number(spendingAgg._sum.amount ?? 0),
    accounts: accountsResult,
    netWorthHistory,
    budgets: budgetsWithSpent,
    goals: goalsResult,
    streaks: streaksResult,
    topCategories: topCategoriesResult,
    impulse: {
      count: impulseMonth._count.id,
      total: Number(impulseMonth._sum.amount ?? 0),
      previousWeekTotal: Number(impulsePrevWeek._sum.amount ?? 0),
    },
    today: {
      availableBalance: accounts.length ? accounts.reduce((sum, account) => sum + account.currentBalance.toNumber(), 0) : null,
      spentThisMonth: Number(spendingAgg._sum.amount ?? 0),
      receivedThisMonth: Math.abs(Number(incomeAgg._sum.amount ?? 0)),
      dueNextSevenDays,
      upcomingCount: upcomingItems.length,
      nextItems: upcomingItems.slice(0, 3),
    },
  });
}
