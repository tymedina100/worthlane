import { prisma } from "@worthlane/db";
import {
  computeNetWorthBreakdownMinor,
  computeNetWorthMinor,
  fromMinorUnits,
  toMinorUnits,
} from "@worthlane/core";

interface BalanceLike {
  type: string;
  currentBalance: { toNumber(): number };
}

/** Assets add, debts (credit/loans) subtract. */
export function computeNetWorth(accounts: BalanceLike[]): number {
  return fromMinorUnits(
    computeNetWorthMinor(
      accounts.map((account) => ({
        type: account.type,
        currentBalanceMinor: toMinorUnits(account.currentBalance.toNumber()),
      }))
    )
  );
}

export function computeBreakdown(accounts: BalanceLike[]): { assets: number; liabilities: number } {
  const result = computeNetWorthBreakdownMinor(
    accounts.map((account) => ({
      type: account.type,
      currentBalanceMinor: toMinorUnits(account.currentBalance.toNumber()),
    }))
  );

  return {
    assets: fromMinorUnits(result.assetsMinor),
    liabilities: fromMinorUnits(result.liabilitiesMinor),
  };
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Computes the user's current net worth and upserts today's snapshot. */
export async function snapshotUserNetWorth(userId: string): Promise<number> {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const netWorth = computeNetWorth(accounts);
  const today = startOfToday();

  await prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, netWorth },
    update: { netWorth },
  });

  return netWorth;
}
