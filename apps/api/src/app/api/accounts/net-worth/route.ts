import { personalLedger } from "@/lib/personal-ledger";
import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { computeBreakdown, computeNetWorth, snapshotUserNetWorth, startOfToday } from "@/lib/net-worth";
import { ok, unauthorized } from "@/lib/response";

const RANGES = new Set([30, 90, 365]);

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const rangeParam = Number(req.nextUrl.searchParams.get("range") ?? 90);
  const range = RANGES.has(rangeParam) ? rangeParam : 90;

  // Make sure today's point exists so the chart always ends at "now".
  await snapshotUserNetWorth(userId);

  const since = startOfToday();
  since.setDate(since.getDate() - range);

  const [accounts, snapshots] = await Promise.all([
    personalLedger(userId).then(ledger => ledger.accounts),
    prisma.netWorthSnapshot.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: "asc" },
    }),
  ]);

  const current = computeNetWorth(accounts);
  const breakdown = computeBreakdown(accounts);

  const history = snapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    value: s.netWorth.toNumber(),
  }));

  const first = history[0]?.value ?? current;
  const change = current - first;
  const changePercent = first !== 0 ? (change / Math.abs(first)) * 100 : 0;

  return ok({
    current,
    change,
    changePercent,
    range,
    history,
    breakdown,
  });
}
