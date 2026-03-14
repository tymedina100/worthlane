import { NextRequest } from "next/server";
import { prisma } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { syncTransactions } from "@/lib/plaid";
import { ok, unauthorized } from "@/lib/response";
import { mapPlaidCategory } from "@/lib/categories";
import { decrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  // Get all Plaid items for this user
  const items = await prisma.plaidItem.findMany({ where: { userId } });

  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  for (const item of items) {
    try {
      // Get accounts for this item to find cursor
      const account = await prisma.account.findFirst({
        where: { userId, plaidItemId: item.itemId },
      });

      const cursor = account?.plaidCursor ?? undefined;
      const plainAccessToken = decrypt(item.accessToken);
      const data = await syncTransactions(plainAccessToken, cursor);

      // Upsert added/modified transactions
      for (const tx of [...data.added, ...data.modified]) {
        const account = await prisma.account.findFirst({
          where: { plaidAccountId: tx.account_id },
        });
        if (!account) continue;

        const categoryId = await mapPlaidCategory(
          tx.personal_finance_category?.primary ?? null,
          userId
        );

        await prisma.transaction.upsert({
          where: { plaidTransactionId: tx.transaction_id },
          create: {
            userId,
            accountId: account.id,
            plaidTransactionId: tx.transaction_id,
            amount: tx.amount, // Plaid: positive = debit (expense)
            date: new Date(tx.date),
            merchantName: tx.merchant_name ?? tx.name,
            categoryId,
          },
          update: {
            amount: tx.amount,
            merchantName: tx.merchant_name ?? tx.name,
            categoryId,
          },
        });
      }

      totalAdded += data.added.length;
      totalModified += data.modified.length;

      // Remove deleted transactions
      for (const removed of data.removed) {
        await prisma.transaction.deleteMany({
          where: { plaidTransactionId: removed.transaction_id },
        });
      }
      totalRemoved += data.removed.length;

      // Update cursor on account
      if (account && data.next_cursor) {
        await prisma.account.update({
          where: { id: account.id },
          data: { plaidCursor: data.next_cursor, lastSyncedAt: new Date() },
        });
      }

      // Refresh account balances
      const { getAccounts } = await import("@/lib/plaid");
      const plaidAccounts = await getAccounts(plainAccessToken);
      for (const pa of plaidAccounts) {
        await prisma.account.updateMany({
          where: { plaidAccountId: pa.account_id },
          data: { currentBalance: pa.balances.current ?? 0 },
        });
      }
    } catch (e) {
      console.error(`Sync failed for item ${item.itemId}:`, e);
      // Continue syncing remaining items
    }
  }

  return ok({ added: totalAdded, modified: totalModified, removed: totalRemoved });
}
