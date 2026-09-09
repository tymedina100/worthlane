import {
  PlaidItemStatus,
  prisma,
} from "@worthlane/db";
import { applyPlaidSyncBatch } from "./plaid-reconciliation";
import { savePlaidAccounts } from "./plaid-accounts";
import { bankHistoryStatus } from "@worthlane/core";
import {
  decryptPlaidAccessToken,
  getAccounts,
  PlaidIntegrationError,
  refreshTransactions,
  syncTransactions,
} from "./plaid";
import { detectRecurringForUser } from "./recurring";
import { captureServerException } from "./sentry";

function statusForPlaidError(error: PlaidIntegrationError): PlaidItemStatus {
  if (error.code === "PENDING_EXPIRATION") return PlaidItemStatus.PENDING_EXPIRATION;
  if (error.needsRelink) return PlaidItemStatus.NEEDS_RELINK;
  return PlaidItemStatus.ERROR;
}

async function upsertAccountsForItem(item: {
  id: string;
  userId: string;
  itemId: string;
  institution: string | null;
  accessTokenEncrypted: string;
}) {
  const accessToken = decryptPlaidAccessToken(item.accessTokenEncrypted);
  const plaidAccounts = await getAccounts(accessToken);
  const accountMap = await savePlaidAccounts(item, plaidAccounts);
  return { accessToken, accountMap };
}

export async function syncPlaidItemById(
  userId: string,
  plaidItemId: string,
  options: { refresh?: boolean } = {}
) {
  const item = await prisma.plaidItem.findFirst({
    where: { id: plaidItemId, userId },
  });

  if (!item) {
    throw new PlaidIntegrationError("Bank connection not found.", {
      status: 404,
      code: "PLAID_ITEM_NOT_FOUND",
    });
  }

  return syncPlaidItemRecord(item, options);
}

export async function syncPlaidItemsForUser(
  userId: string,
  options: { plaidItemId?: string; refresh?: boolean } = {}
) {
  const items = await prisma.plaidItem.findMany({
    where: {
      userId,
      ...(options.plaidItemId ? { id: options.plaidItemId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  let added = 0;
  if (options.plaidItemId && items.length === 0) {
    throw new PlaidIntegrationError("Bank connection not found.", { status: 404, code: "PLAID_ITEM_NOT_FOUND" });
  }
  let modified = 0;
  let removed = 0;

  for (const item of items) {
    const result = await syncPlaidItemRecord(item, options);
    added += result.added;
    modified += result.modified;
    removed += result.removed;
  }

  return { added, modified, removed };
}

export async function syncPlaidItemRecord(
  item: {
    id: string;
    userId: string;
    itemId: string;
    institution: string | null;
    accessTokenEncrypted: string;
    syncCursor: string | null;
  },
  options: { refresh?: boolean } = {}
) {
  const now = new Date();

  try {
    const { accessToken, accountMap } = await upsertAccountsForItem(item);

    if (options.refresh) {
      try {
        await refreshTransactions(accessToken);
      } catch (error) {
        // Manual refresh should still fall back to sync if Plaid won't do a forced refresh.
        if (!(error instanceof PlaidIntegrationError)) throw error;
      }
    }

    const originalCursor = item.syncCursor ?? undefined;
    let cursor = originalCursor;
    let nextCursor = item.syncCursor ?? "";
    let restarted = false;
    let historyStatus = "UNKNOWN";
    const addedTransactions: any[] = [];
    const modifiedTransactions: any[] = [];
    const removedTransactions: Array<{ transaction_id: string }> = [];

    while (true) {
      try {
        const page = await syncTransactions(accessToken, cursor);
        addedTransactions.push(...page.added);
        modifiedTransactions.push(...page.modified);
        removedTransactions.push(...page.removed);
        nextCursor = page.next_cursor;
        historyStatus = bankHistoryStatus(page.transactions_update_status);

        if (!page.has_more) break;
        cursor = page.next_cursor;
      } catch (error) {
        if (
          error instanceof PlaidIntegrationError &&
          error.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" &&
          !restarted
        ) {
          restarted = true;
          cursor = originalCursor;
          nextCursor = item.syncCursor ?? "";
          addedTransactions.length = 0;
          modifiedTransactions.length = 0;
          removedTransactions.length = 0;
          continue;
        }
        throw error;
      }
    }

    await applyPlaidSyncBatch(item, accountMap, { added: addedTransactions, modified: modifiedTransactions, removed: removedTransactions }, nextCursor, now, historyStatus);

    // Fresh transactions may reveal new subscriptions/bills — refresh the
    // detector, but never let it fail the sync itself.
    if (addedTransactions.length > 0 || modifiedTransactions.length > 0) {
      detectRecurringForUser(item.userId).catch((error) =>
        captureServerException(error, {
          tags: { lib: "plaid-sync", step: "recurring" },
          extra: { userId: item.userId, plaidItemId: item.id },
        })
      );
    }

    return {
      plaidItemId: item.id,
      added: addedTransactions.length,
      modified: modifiedTransactions.length,
      removed: removedTransactions.length,
    };
  } catch (error) {
    if (error instanceof PlaidIntegrationError && error.code !== "SYNC_CONFLICT") {
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: {
          status: statusForPlaidError(error),
          needsRelink: error.needsRelink,
          errorCode: error.code,
          errorMessage: error.message,
        },
      });
    }

    throw error;
  }
}
