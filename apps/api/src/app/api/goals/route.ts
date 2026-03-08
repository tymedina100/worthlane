import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, GoalType } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { monthsBetween } from "@/lib/dates";

const createSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().datetime().optional(),
  type: z.nativeEnum(GoalType),
  icon: z.string().optional(),
  linkedBudgetCategoryId: z.string().optional(),
});

function computeGoalProjection(
  currentAmount: number,
  targetAmount: number,
  targetDate: Date | null,
  monthlyContribution: number
) {
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return { projectedCompletionDate: null, monthlyNeeded: 0 };

  let projectedCompletionDate: string | null = null;
  let monthlyNeeded: number | null = null;

  if (monthlyContribution > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlyContribution);
    const projected = new Date();
    projected.setMonth(projected.getMonth() + monthsNeeded);
    projectedCompletionDate = projected.toISOString();
  }

  if (targetDate) {
    const months = monthsBetween(new Date(), targetDate);
    if (months > 0) monthlyNeeded = remaining / months;
  }

  return { projectedCompletionDate, monthlyNeeded };
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const result = await Promise.all(
    goals.map(async (g) => {
      const percentComplete =
        g.targetAmount.toNumber() > 0
          ? Math.min(100, (g.currentAmount.toNumber() / g.targetAmount.toNumber()) * 100)
          : 0;

      // Avg monthly contribution over last 3 months
      const recentContributions = await prisma.goalContribution.aggregate({
        where: { goalId: g.id, createdAt: { gte: threeMonthsAgo } },
        _sum: { amount: true },
      });
      const totalRecent = recentContributions._sum.amount?.toNumber() ?? 0;
      const monthlyContribution = totalRecent / 3;

      const { projectedCompletionDate, monthlyNeeded } = computeGoalProjection(
        g.currentAmount.toNumber(),
        g.targetAmount.toNumber(),
        g.targetDate,
        monthlyContribution
      );

      return {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount.toNumber(),
        currentAmount: g.currentAmount.toNumber(),
        targetDate: g.targetDate?.toISOString() ?? null,
        type: g.type,
        icon: g.icon,
        linkedBudgetCategoryId: g.linkedBudgetCategoryId,
        percentComplete,
        projectedCompletionDate,
        monthlyNeeded,
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

  const { targetDate, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: {
      userId,
      ...rest,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });

  return ok(goal, 201);
}
