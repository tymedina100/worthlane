import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, notFound } from "@/lib/response";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const budget = await prisma.budget.findFirst({ where: { id: params.id, userId } });
  if (!budget) return notFound("Budget not found");

  const periods = await prisma.budgetPeriod.findMany({
    where: { budgetId: params.id },
    orderBy: { startDate: "desc" },
  });

  return ok(
    periods.map((p) => ({
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      spent: Number(p.spent),
      amount: Number(budget.amount),
    }))
  );
}
