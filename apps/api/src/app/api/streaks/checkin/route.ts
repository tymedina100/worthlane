import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { evaluateDailyCheckin, evaluateWeeklyOnBudget, evaluateNoImpulsePurchases } from "@/lib/streaks";

function isToday(date: Date): boolean {
  return date.toDateString() === new Date().toDateString();
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const now = new Date();
  const [daily] = await Promise.all([
    evaluateDailyCheckin(userId, now),
    evaluateWeeklyOnBudget(userId, now),
    evaluateNoImpulsePurchases(userId, now),
  ]);

  return ok({ streak: daily.streak, alreadyCheckedIn: daily.alreadyCheckedIn });
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const streaks = await prisma.streak.findMany({ where: { userId } });

  const result = streaks.map((s) => ({
    type: s.type,
    currentCount: s.currentCount,
    longestCount: s.longestCount,
    lastActivityAt: s.lastActivityAt?.toISOString() ?? null,
    isActiveToday: s.lastActivityAt ? isToday(s.lastActivityAt) : false,
  }));

  return ok(result);
}
