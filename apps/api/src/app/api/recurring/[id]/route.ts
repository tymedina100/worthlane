import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  isMuted: z.boolean().optional(),
  displayName: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const row = await prisma.recurringTransaction.findFirst({
    where: { id: params.id, userId },
  });
  if (!row) return notFound();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const updated = await prisma.recurringTransaction.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return ok({
    id: updated.id,
    displayName: updated.displayName,
    isMuted: updated.isMuted,
    categoryId: updated.categoryId,
  });
}
