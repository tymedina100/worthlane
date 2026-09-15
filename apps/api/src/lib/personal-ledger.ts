import { prisma } from "@worthlane/db";
import { countedBankAccountIds } from "@worthlane/core";

/** Use only this login's accounts; a partner's feed must never replace its ledger. */
export async function personalLedger(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const ids = accounts.map(account => account.id);
  const pairs = await prisma.householdAccountMatch.findMany({ where: {
    firstAccountId: { in: ids }, secondAccountId: { in: ids },
    firstConfirmedAt: { not: null }, secondConfirmedAt: { not: null },
    household: { members: { some: { userId, status: "ACTIVE" } } },
  } });
  const counted = countedBankAccountIds(accounts, userId, pairs);
  const excludedIds = ids.filter(id => !counted.has(id));
  return {
    accounts: accounts.filter(account => counted.has(account.id)),
    // Keep the original accounts and transactions available for review/unmatching.
    transactionWhere: { userId, accountId: { notIn: excludedIds } },
  };
}
