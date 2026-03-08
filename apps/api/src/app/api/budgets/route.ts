import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { startOfMonth, endOfMonth } from "@/lib/dates";

const createSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
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

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true },
  });

  // Calculate spent per budget for current period
  const result = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          date: { gte: periodStart, lte: periodEnd },
          amount: { gt: 0 }, // positive = expense
        },
        _sum: { amount: true },
      });

      const spentAmount = Number(spent._sum.amount ?? 0);
      const budgetAmount = Number(b.amount);
      const remaining = budgetAmount - spentAmount;

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryColor: b.category.color,
        categoryIcon: b.category.icon,
        amount: budgetAmount,
        spent: spentAmount,
        remaining,
        percentUsed: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0,
        period: b.period,
        rollover: b.rollover,
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
