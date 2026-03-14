import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  categoryId: z.string().optional(),
  note: z.string().optional(),
  isImpulse: z.boolean().optional(),
  merchantName: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(_req));
  } catch {
    return unauthorized();
  }

  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, userId },
    include: { category: true },
  });
  if (!tx) return notFound();

  return ok(tx);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const tx = await prisma.transaction.findFirst({ where: { id: params.id, userId } });
  if (!tx) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  // Validate categoryId belongs to user or is a system category
  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: parsed.data.categoryId,
        OR: [{ userId }, { isSystem: true }],
      },
    });
    if (!category) return err("Invalid category", 400);
  }

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: parsed.data,
    include: { category: true },
  });

  return ok(updated);
}
