import { NextRequest } from "next/server";
import { RecurringFrequency, UpcomingObligationType, prisma } from "@worthlane/db";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { err, ok, unauthorized } from "@/lib/response";
import { positiveMoneyAmount } from "@/lib/validation";
import { obligationStatus, parseDateOnly, toDateOnly } from "@/lib/upcoming";

const dateOnly = z.string().refine((value) => {
  try { parseDateOnly(value); return true; } catch { return false; }
}, "Expected a valid YYYY-MM-DD date");

export const upcomingInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: positiveMoneyAmount,
  dueDate: dateOnly,
  type: z.nativeEnum(UpcomingObligationType).default(UpcomingObligationType.BILL),
  frequency: z.nativeEnum(RecurringFrequency).nullable().optional(),
  accountName: z.string().trim().max(120).nullable().optional(),
  reminderTiming: z.enum(["DUE_DATE", "ONE_DAY_BEFORE", "THREE_DAYS_BEFORE", "NONE"]).nullable().optional(),
  isActive: z.boolean().optional(),
});

function serialize(row: any) {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount.toNumber(),
    dueDate: toDateOnly(row.dueDate),
    type: row.type,
    frequency: row.frequency,
    accountName: row.accountName,
    reminderTiming: row.reminderTiming,
    isPaid: row.isPaid,
    isActive: row.isActive,
    lastPaidAt: row.lastPaidAt?.toISOString() ?? null,
    status: obligationStatus(row.dueDate, row.isPaid),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return unauthorized(); }

  const rows = await prisma.upcomingObligation.findMany({
    where: { userId },
    orderBy: [{ isPaid: "asc" }, { dueDate: "asc" }],
  });
  return ok({ items: rows.map(serialize) });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return unauthorized(); }
  const parsed = upcomingInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Enter a name, amount, and valid due date.");

  const data = parsed.data;
  const row = await prisma.upcomingObligation.create({
    data: {
      userId,
      name: data.name,
      amount: data.amount,
      dueDate: parseDateOnly(data.dueDate),
      type: data.type,
      frequency: data.frequency ?? null,
      accountName: data.accountName?.trim() || null,
      reminderTiming: data.reminderTiming ?? null,
      isActive: data.isActive ?? true,
    },
  });
  return ok(serialize(row), 201);
}
