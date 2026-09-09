import { Prisma, prisma } from "@worthlane/db";
import type { Transaction } from "plaid";
import { mapPlaidCategory } from "./categories";
import { PlaidIntegrationError } from "./plaid";

// Bank-derived spending uses posted transactions. Pending authorizations can
// change amount or ID; a posted replacement removes any legacy pending row.
export async function applyPlaidSyncBatch(
  item: { id: string; userId: string; syncCursor: string | null },
  accountMap: Map<string, string>,
  changes: { added: Transaction[]; modified: Transaction[]; removed: Array<{ transaction_id: string }> },
  nextCursor: string,
  now: Date,
) {
  const prepared: Array<{ transaction: Transaction; accountId: string; categoryId: string | null }> = [];
  for (const transaction of [...changes.added, ...changes.modified]) {
    const accountId = accountMap.get(transaction.account_id);
    if (!accountId) throw new PlaidIntegrationError("Bank activity references an unavailable account. Retry sync.", { code: "SYNC_ACCOUNT_MISSING", status: 409 });
    const categoryId = transaction.pending ? null : await mapPlaidCategory(transaction.personal_finance_category?.primary ?? null, item.userId);
    prepared.push({ transaction, accountId, categoryId });
  }
  try {
    await prisma.$transaction(async (db) => {
      const current = await db.plaidItem.findFirst({ where: { id: item.id, userId: item.userId } });
      if (!current || current.syncCursor !== item.syncCursor) throw new PlaidIntegrationError("Another sync finished. Refresh and try again.", { code: "SYNC_CONFLICT", status: 409 });
      for (const { transaction: tx, accountId, categoryId } of prepared) {
        if (tx.pending) {
          await db.transaction.deleteMany({ where: { userId: item.userId, accountId, plaidTransactionId: tx.transaction_id } });
          continue;
        }
        if (tx.pending_transaction_id) {
          await db.transaction.deleteMany({ where: { userId: item.userId, accountId, plaidTransactionId: tx.pending_transaction_id } });
        }
        const existing = await db.transaction.findUnique({ where: { plaidTransactionId: tx.transaction_id }, select: { userId: true, categoryOverridden: true } });
        if (existing && existing.userId !== item.userId) throw new PlaidIntegrationError("Activity belongs to another connection.", { code: "SYNC_OWNER_CONFLICT", status: 409 });
        const fields = { accountId, amount: tx.amount, date: new Date(tx.date), merchantName: tx.merchant_name ?? tx.name, categoryId };
        await db.transaction.upsert({ where: { plaidTransactionId: tx.transaction_id },
          create: { ...fields, userId: item.userId, plaidTransactionId: tx.transaction_id },
          update: { ...fields, ...(existing?.categoryOverridden ? { categoryId: undefined } : {}) },
        });
      }
      await db.transaction.deleteMany({ where: { userId: item.userId, accountId: { in: [...accountMap.values()] }, plaidTransactionId: { in: changes.removed.map((tx) => tx.transaction_id) } } });
      await db.plaidItem.update({ where: { id: item.id }, data: { status: "HEALTHY", needsRelink: false, errorCode: null, errorMessage: null, syncCursor: nextCursor, lastSyncAt: now } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new PlaidIntegrationError("Another sync finished. Refresh and try again.", { code: "SYNC_CONFLICT", status: 409 });
    throw error;
  }
}
