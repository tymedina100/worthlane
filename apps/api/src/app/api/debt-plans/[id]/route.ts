import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { z } from "zod";
import { debtPlanInputSchema } from "@worthlane/contracts";
import { estimateDebtPayoff } from "@worthlane/core";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";
import { debtPlanData, debtPlanResult } from "@/lib/debt-plans";
type Context = { params: { id: string } };
export async function GET(req: NextRequest, { params }: Context) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const plan = await prisma.debtPlan.findFirst({ where: { id: params.id, userId }, include: { debts: true } });
  return plan ? ok(debtPlanResult(plan)) : notFound();
}
export async function PATCH(req: NextRequest, { params }: Context) {
  let userId: string;
  try { userId = getAuthUser(req).sub; } catch { return unauthorized(); }
  const parsed = z.object({ revision: z.number().int().positive(), input: debtPlanInputSchema }).strict().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Check the plan details and revision.");
  try { estimateDebtPayoff(parsed.data.input); } catch { return err("This estimate exceeds the supported calculation range.", 422); }
  const outcome = await prisma.$transaction(async db => {
    const claimed = await db.debtPlan.updateMany({ where: { id: params.id, userId, revision: parsed.data.revision }, data: { revision: { increment: 1 } } });
    if (!claimed.count) return { plan: null, exists: Boolean(await db.debtPlan.findFirst({ where: { id: params.id, userId } })) };
    await db.debtPlanEntry.deleteMany({ where: { planId: params.id } });
    return { plan: await db.debtPlan.update({ where: { id: params.id }, data: debtPlanData(parsed.data.input), include: { debts: true } }), exists: true };
  });
  if (!outcome.plan) return outcome.exists ? err("This plan changed in another window. Reload before saving.", 409) : notFound();
  return ok(debtPlanResult(outcome.plan));
}
