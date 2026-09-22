import { Prisma, prisma } from "@worthlane/db";
import { normalizeMerchant } from "./recurring";

/** A verified provider notice removes only the named owner's revoked data. */
export async function revokePlaidData(item: { id: string; userId: string; itemId: string }, accountId?: string) {
  return prisma.$transaction(async db => {
    const current = await db.plaidItem.findFirst({ where: { id: item.id, userId: item.userId } });
    if (!current) return;
    const accounts = await db.account.findMany({ where: {
      userId: item.userId, plaidItemId: current.itemId, source: "PLAID",
      ...(accountId ? { plaidAccountId: accountId } : {}),
    }, select: { id: true } });
    const ids = accounts.map(account => account.id);
    const manualWhere = { userId: item.userId, accountId: { in: ids }, plaidTransactionId: null, isManual: true };
    if (await db.transaction.count({ where: manualWhere })) {
      const manual = await db.account.create({ data: {
        userId: item.userId, name: "Saved manual entries", source: "MANUAL", type: "OTHER", currentBalance: 0,
      } });
      await db.transaction.updateMany({ where: manualWhere, data: { accountId: manual.id } });
    }
    const revokedTransactions = await db.transaction.findMany({ where: {
      userId: item.userId, accountId: { in: ids }, plaidTransactionId: { not: null },
    }, select: { merchantName: true } });
    const merchants = [...new Set(revokedTransactions.flatMap(row => row.merchantName ? [normalizeMerchant(row.merchantName)] : []))];
    await db.recurringTransaction.deleteMany({ where: { userId: item.userId, OR: [
      { accountId: { in: ids } }, { normalizedMerchant: { in: merchants } },
    ] } });
    await db.account.deleteMany({ where: { userId: item.userId, id: { in: ids } } });
    // These cached aggregates cannot be separated by account. They must not
    // retain revoked balances; current totals are computed from remaining data.
    if (ids.length) {
      await db.netWorthSnapshot.deleteMany({ where: { userId: item.userId } });
      await db.nudge.deleteMany({ where: { userId: item.userId } });
    }
    await db.plaidItem.update({ where: { id: item.id }, data: {
      lastWebhookAt: new Date(), consentRevision: { increment: 1 }, status: "NEEDS_RELINK", needsRelink: true,
      errorCode: accountId ? "USER_ACCOUNT_REVOKED" : "USER_PERMISSION_REVOKED",
      errorMessage: "Bank access was revoked. Its imported data was removed; manual entries were kept. Reconnect to grant access again.",
    } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}
