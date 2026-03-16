import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return notFound("Category not found");
  if (category.isSystem) return err("System categories cannot be modified", 403);
  if (category.userId !== userId) return notFound("Category not found");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  if (parsed.data.name) {
    const duplicate = await prisma.category.findUnique({
      where: { userId_name: { userId, name: parsed.data.name } },
    });
    if (duplicate && duplicate.id !== params.id) {
      return err("A category with that name already exists", 409);
    }
  }

  const updated = await prisma.category.update({
    where: { id: params.id },
    data: parsed.data,
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

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return notFound("Category not found");
  if (category.isSystem) return err("System categories cannot be deleted", 403);
  if (category.userId !== userId) return notFound("Category not found");

  const [budgetUsage, txUsage] = await Promise.all([
    prisma.budget.findFirst({ where: { categoryId: params.id, userId } }),
    prisma.transaction.findFirst({ where: { categoryId: params.id, userId } }),
  ]);

  if (budgetUsage || txUsage) {
    return err("Cannot delete a category that is in use by a budget or transaction", 400);
  }

  await prisma.category.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
