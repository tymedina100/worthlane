import { personalLedger } from "@/lib/personal-ledger";
import { NextRequest } from "next/server";
import { toMinorUnits, fromMinorUnits, monthRangeInTimeZone } from "@worthlane/core";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { financialTimeZone } from "@/lib/budget-period";
import { ok, unauthorized } from "@/lib/response";

// Per-calendar-month income vs. spending. Sign convention: positive
// amounts are expenses, negative are income (Plaid convention).
export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const monthsParam = Number(req.nextUrl.searchParams.get("months") ?? 6);
  const months = Number.isInteger(monthsParam) && monthsParam >= 1 && monthsParam <= 24 ? monthsParam : 6;

  const ledger = await personalLedger(userId);
  const now = new Date();
  const timeZone = await financialTimeZone(userId);
  const ranges = [monthRangeInTimeZone(now, timeZone)];
  for (let i = 1; i < months; i++) {
    ranges.unshift(monthRangeInTimeZone(new Date(ranges[0].start.getTime() - 1), timeZone));
  }
  const start = ranges[0].start;

  const transactions = await prisma.transaction.findMany({
    where: { ...ledger.transactionWhere, date: { gte: start, lte: now } },
    select: { amount: true, date: true, spendingTreatment: true },
  });

  // Seed every month in the window so quiet months still chart as zero.
  const buckets = new Map<string, { income: number; spending: number }>();
  for (const range of ranges) {
    const key = `${range.year}-${String(range.month).padStart(2, "0")}`;
    buckets.set(key, { income: 0, spending: 0 });
  }

  for (const tx of transactions) {
    const local = monthRangeInTimeZone(tx.date, timeZone);
    const key = `${local.year}-${String(local.month).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.spendingTreatment === "EXCLUDED") continue;
    const amount = toMinorUnits(tx.amount.toNumber());
    if (amount < 0 && tx.spendingTreatment !== "REFUND") bucket.income += Math.abs(amount);
    else bucket.spending += amount;
  }

  const monthsResult = [...buckets.entries()].map(([month, b]) => ({
    month,
    income: fromMinorUnits(b.income),
    spending: fromMinorUnits(b.spending),
    net: fromMinorUnits(b.income - b.spending),
  }));

  return ok({ months: monthsResult });
}
