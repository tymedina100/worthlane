import { NextRequest } from "next/server";
import { prisma, StreakType } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

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

  const streak = await prisma.streak.upsert({
    where: { userId_type: { userId, type: StreakType.DAILY_CHECKIN } },
    create: {
      userId,
      type: StreakType.DAILY_CHECKIN,
      currentCount: 1,
      longestCount: 1,
      lastActivityAt: new Date(),
    },
    update: {},
  });

  // Check if already checked in today
  if (streak.lastActivityAt && isToday(streak.lastActivityAt)) {
    return ok({ streak, alreadyCheckedIn: true });
  }

  const isContinuing = streak.lastActivityAt && isYesterday(streak.lastActivityAt);
  const newCount = isContinuing ? streak.currentCount + 1 : 1;
  const newLongest = Math.max(newCount, streak.longestCount);

  const updated = await prisma.streak.update({
    where: { userId_type: { userId, type: StreakType.DAILY_CHECKIN } },
    data: {
      currentCount: newCount,
      longestCount: newLongest,
      lastActivityAt: new Date(),
    },
  });

  return ok({ streak: updated, alreadyCheckedIn: false, streakExtended: isContinuing });
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
