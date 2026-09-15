import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { decryptPlaidAccessToken, PlaidIntegrationError, removeItem } from "@/lib/plaid";
import { err, ok, unauthorized } from "@/lib/response";
import { captureServerException } from "@/lib/sentry";
import { deleteUserAccountData } from "@/lib/account-deletion";

// Permanent account deletion (required by App Store guideline 5.1.1(v)).
// Removes the user and, via cascade, all accounts, transactions, budgets,
// goals, streaks, nudges, snapshots, and recurring items.
export async function DELETE(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  // Keep encrypted tokens and local data until every provider revocation succeeds.
  // A retry can safely encounter an Item already removed by an earlier attempt.
  const plaidItems = await prisma.plaidItem.findMany({ where: { userId } });
  for (const item of plaidItems) {
    try {
      await removeItem(decryptPlaidAccessToken(item.accessTokenEncrypted));
    } catch (error) {
      if (error instanceof PlaidIntegrationError && error.code === "ITEM_NOT_FOUND") {
        continue;
      }
      // Do not log provider request objects, which can contain access tokens.
      captureServerException(new Error("Account deletion bank revocation failed"), {
        tags: { route: "/api/auth/account" },
        extra: { userId, plaidItemId: item.id },
      });
      return err(
        "Your account has not been deleted because a bank connection could not be disconnected. Some connections may already be disconnected. Please try deleting your account again.",
        503,
        "ACCOUNT_DELETION_RETRY_REQUIRED"
      );
    }
  }

  await deleteUserAccountData(userId);

  return ok({ deleted: true });
}
