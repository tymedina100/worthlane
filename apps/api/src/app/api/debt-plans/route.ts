import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { debtPlanInputSchema } from "@worthlane/contracts";
import { estimateDebtPayoff } from "@worthlane/core";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { debtPlanData, debtPlanResult } from "@/lib/debt-plans";

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const plans = await prisma.debtPlan.findMany({ where: { userId }, include: { debts: true }, orderBy: { createdAt: "desc" } });
  return ok(plans.map(plan => debtPlanResult(plan, false)));
}
export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const parsed = debtPlanInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Check the plan amounts, dates and debt details.");
  try { estimateDebtPayoff(parsed.data); } catch { return err("This estimate exceeds the supported calculation range.", 422); }
  const plan = await prisma.debtPlan.create({ data: { userId, ...debtPlanData(parsed.data) }, include: { debts: true } });
  return ok(debtPlanResult(plan), 201);
}
