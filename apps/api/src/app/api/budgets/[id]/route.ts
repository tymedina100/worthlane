import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";
import { positiveMoneyAmount } from "@/lib/validation";

const updateSchema = z.object({
  amount: positiveMoneyAmount.optional(),
  period: z.enum(["MONTHLY", "WEEKLY"]).optional(),
  rollover: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const budget = await prisma.budget.findFirst({ where: { id: params.id, userId } });
  if (!budget) return notFound("Budget not found");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const updated = await prisma.budget.update({
    where: { id: params.id },
    data: parsed.data,
    include: { category: true },
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const budget = await prisma.budget.findFirst({ where: { id: params.id, userId } });
  if (!budget) return notFound("Budget not found");

  await prisma.budget.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
