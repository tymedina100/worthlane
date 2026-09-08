import { NextRequest } from "next/server";
import { z } from "zod";
import { AccountSource, prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { moneyAmount } from "@/lib/validation";
import { spendingTreatmentSchema, validSpendingTreatment } from "@/lib/spending-treatment";

const createSchema = z.object({
  accountId: z.string(),
  amount: moneyAmount,
  spendingTreatment: spendingTreatmentSchema.default("AUTO"),
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

  return ok({
    transactions: transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount.toNumber(),
      date: tx.date.toISOString(),
      merchantName: tx.merchantName,
      note: tx.note,
      isImpulse: tx.isImpulse,
      isManual: tx.isManual,
      spendingTreatment: tx.spendingTreatment,
      account: {
        id: tx.account.id,
        name: tx.account.name,
        source: tx.account.source,
      },
      category: tx.category
        ? {
            id: tx.category.id,
            name: tx.category.name,
            icon: tx.category.icon,
            color: tx.category.color,
          }
        : null,
    })),
    total,
    page,
    limit,
  });
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
  if (!validSpendingTreatment(parsed.data.amount, parsed.data.spendingTreatment)) {
    return err("A refund must be a negative credit amount");
  }

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
  });
  if (!account) return err("Account not found", 404);
  if (account.source !== AccountSource.MANUAL) {
    return err("Manual transactions can only be created on manual accounts.", 400, "ACCOUNT_NOT_MANUAL");
  }

  const tx = await prisma.transaction.create({
    data: {
      userId,
      ...parsed.data,
      date: new Date(parsed.data.date),
      isManual: true,
    },
    include: { category: true, account: true },
  });

  return ok({
    id: tx.id,
    amount: tx.amount.toNumber(),
    date: tx.date.toISOString(),
    merchantName: tx.merchantName,
    note: tx.note,
    isImpulse: tx.isImpulse,
    isManual: tx.isManual,
    spendingTreatment: tx.spendingTreatment,
    account: {
      id: tx.account.id,
      name: tx.account.name,
      source: tx.account.source,
    },
    category: tx.category
      ? {
          id: tx.category.id,
          name: tx.category.name,
          icon: tx.category.icon,
          color: tx.category.color,
        }
      : null,
  }, 201);
}
