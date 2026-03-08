import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { startOfMonth, endOfMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

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

  // Net worth
  const netWorth = accounts.reduce((sum, a) => {
    const bal = a.currentBalance.toNumber();
    return sum + (a.type === "CREDIT" || a.type === "LOAN" ? -bal : bal);
  }, 0);

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

  return ok({
    netWorth,
    monthlyIncome: Math.abs(Number(incomeAgg._sum.amount ?? 0)),
    monthlySpending: Number(spendingAgg._sum.amount ?? 0),
    budgets: budgetsWithSpent,
    goals: goalsResult,
    streaks: streaksResult,
    topCategories: topCategoriesResult,
    impulse: {
      count: impulseMonth._count.id,
      total: Number(impulseMonth._sum.amount ?? 0),
      previousWeekTotal: Number(impulsePrevWeek._sum.amount ?? 0),
    },
  });
}
