import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  currentAmount: z.number().min(0).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId } });
  if (!goal) return notFound("Goal not found");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      targetDate:
        parsed.data.targetDate !== undefined
          ? parsed.data.targetDate
            ? new Date(parsed.data.targetDate)
            : null
          : undefined,
    },
  });

  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId } });
  if (!goal) return notFound("Goal not found");

  await prisma.goal.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
