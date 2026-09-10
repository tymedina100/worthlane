import { personalLedger } from "@/lib/personal-ledger";
import { spendingWhere, incomeWhere } from "@/lib/spending-treatment";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized } from "@/lib/response";
import { monthRangeInTimeZone } from "@worthlane/core";
import { financialTimeZone } from "@/lib/budget-period";

// Category spending breakdown for a month with prior-month deltas.
export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const ledger = await personalLedger(userId);
  const now = new Date();
  const timeZone = await financialTimeZone(userId);
  const localMonth = monthRangeInTimeZone(now, timeZone);
  const monthParam =
    req.nextUrl.searchParams.get("month") ??
    `${localMonth.year}-${String(localMonth.month).padStart(2, "0")}`;
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!match) return err("month must be YYYY-MM", 400);

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1000 || month < 1 || month > 12) return err("month must be YYYY-MM", 400);

  // The 15th at UTC lies in the requested calendar month in every IANA zone.
  const current = monthRangeInTimeZone(new Date(Date.UTC(year, month - 1, 15)), timeZone);
  const previous = monthRangeInTimeZone(new Date(current.start.getTime() - 1), timeZone);

  const [currentGroups, previousGroups, incomeAgg] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { date: { gte: current.start, lt: current.end, lte: now }, ...spendingWhere, ...ledger.transactionWhere },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { date: { gte: previous.start, lt: previous.end, lte: now }, ...spendingWhere, ...ledger.transactionWhere },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { date: { gte: current.start, lt: current.end, lte: now }, ...incomeWhere, ...ledger.transactionWhere },
      _sum: { amount: true },
    }),
  ]);

  const categoryIds = [
    ...new Set(
      [...currentGroups, ...previousGroups].map((g) => g.categoryId).filter(Boolean) as string[]
    ),
  ];
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const previousMap = new Map(
    previousGroups.map((g) => [g.categoryId ?? "uncategorized", Number(g._sum.amount ?? 0)])
  );

  const totalSpending = currentGroups.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0);
  const income = Math.abs(Number(incomeAgg._sum.amount ?? 0));

  const breakdown = currentGroups
    .map((g) => {
      const key = g.categoryId ?? "uncategorized";
      const category = g.categoryId ? categoryMap[g.categoryId] : null;
      const amount = Number(g._sum.amount ?? 0);
      return {
        categoryId: g.categoryId,
        name: category?.name ?? "Uncategorized",
        icon: category?.icon ?? "❓",
        color: category?.color ?? "#94A3B8",
        amount: Math.round(amount * 100) / 100,
        percent: totalSpending > 0 ? Math.round((amount / totalSpending) * 1000) / 10 : 0,
        previousMonthAmount: Math.round((previousMap.get(key) ?? 0) * 100) / 100,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return ok({
    month: monthParam,
    totalSpending: Math.round(totalSpending * 100) / 100,
    income: Math.round(income * 100) / 100,
    savingsRate: income > 0 ? Math.round(((income - totalSpending) / income) * 1000) / 10 : null,
    breakdown,
  });
}
