import { personalLedger } from "@/lib/personal-ledger";
import { spendingWhere } from "@/lib/spending-treatment";
import { NextRequest } from "next/server";
import { z } from "zod";
import { calculateBudgetProgress, fromMinorUnits, toMinorUnits } from "@worthlane/core";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { budgetPeriod, financialTimeZone } from "@/lib/budget-period";
import { positiveMoneyAmount } from "@/lib/validation";

const createSchema = z.object({
  categoryId: z.string(),
  amount: positiveMoneyAmount,
  period: z.enum(["MONTHLY", "WEEKLY"]).default("MONTHLY"),
  rollover: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const ledger = await personalLedger(userId);
  const now = new Date();
  const timeZone = await financialTimeZone(userId);

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
  });

  // Calculate spent per budget for current period
  const result = await Promise.all(
    budgets.map(async (b) => {
      const { start: periodStart, end: periodEnd } = budgetPeriod(now, timeZone, b.period);
      const { start: prevStart, end: prevEnd } = budgetPeriod(new Date(periodStart.getTime() - 1), timeZone, b.period);
      const [spent, prevSpentAgg, history] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            categoryId: b.categoryId,
            date: { gte: periodStart, lt: periodEnd, lte: now },
            ...spendingWhere, ...ledger.transactionWhere,
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            categoryId: b.categoryId,
            date: { gte: prevStart, lt: prevEnd },
            ...spendingWhere, ...ledger.transactionWhere,
          },
          _sum: { amount: true },
        }),
        prisma.budgetPeriod.findMany({
          where: { budgetId: b.id },
          orderBy: { startDate: "desc" },
          take: 3,
        }),
      ]);

      const prevSpent = Number(prevSpentAgg._sum.amount ?? 0);

      // Lazy snapshot: upsert previous month's spending
      await prisma.budgetPeriod.upsert({
        where: { budgetId_startDate: { budgetId: b.id, startDate: prevStart } },
        create: { budgetId: b.id, startDate: prevStart, endDate: prevEnd, spent: prevSpent },
        update: { spent: prevSpent },
      });

      const spentAmount = Number(spent._sum.amount ?? 0);
      const budgetAmount = Number(b.amount);
      const progress = calculateBudgetProgress(
        toMinorUnits(budgetAmount),
        toMinorUnits(spentAmount)
      );

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        categoryIcon: b.category.icon,
        amount: budgetAmount,
        spent: spentAmount,
        remaining: fromMinorUnits(progress.remainingMinor),
        percentUsed: progress.percentUsed,
        period: b.period,
        rollover: b.rollover,
        history: history.map((h) => ({
          startDate: h.startDate.toISOString(),
          spent: Number(h.spent),
          amount: budgetAmount,
        })),
      };
    })
  );

  return ok(result);
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId: { userId, categoryId: parsed.data.categoryId } },
    create: { userId, ...parsed.data },
    update: { amount: parsed.data.amount, period: parsed.data.period, rollover: parsed.data.rollover },
    include: { category: true },
  });

  return ok(budget, 201);
}
