import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";

const createSchema = z.object({
  accountId: z.string(),
  amount: z.number(),
  date: z.string().datetime(),
  merchantName: z.string().optional(),
  categoryId: z.string().optional(),
  note: z.string().optional(),
  isImpulse: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where = {
    userId,
    ...(categoryId && { categoryId }),
    ...(search && {
      merchantName: { contains: search, mode: "insensitive" as const },
    }),
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return ok({ transactions, total, page, limit });
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

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
  });
  if (!account) return err("Account not found", 404);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      ...parsed.data,
      date: new Date(parsed.data.date),
      isManual: true,
    },
    include: { category: true },
  });

  return ok(tx, 201);
}
