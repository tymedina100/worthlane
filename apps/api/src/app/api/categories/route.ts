import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";

const createSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: { name: "asc" },
  });

  return ok(categories);
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

  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: parsed.data.name } },
  });
  if (existing) return err("A category with that name already exists", 409);

  const category = await prisma.category.create({
    data: { ...parsed.data, isSystem: false, userId },
  });

  return ok(category, 201);
}
