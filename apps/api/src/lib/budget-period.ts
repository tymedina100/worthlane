import { prisma } from "@worthlane/db";
import { monthRangeInTimeZone, weekRangeInTimeZone } from "@worthlane/core";

export async function financialTimeZone(userId: string): Promise<string> {
  const membership = await prisma.householdMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { household: { select: { timezone: true } } },
  });
  return membership?.household.timezone ?? "UTC";
}

export function budgetPeriod(now: Date, timeZone: string, period: "MONTHLY" | "WEEKLY") {
  return period === "WEEKLY" ? weekRangeInTimeZone(now, timeZone) : monthRangeInTimeZone(now, timeZone);
}
