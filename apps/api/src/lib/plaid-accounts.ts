import { createHash } from "node:crypto";
import { AccountSource, AccountType, Prisma, prisma } from "@worthlane/db";
import type { AccountBase } from "plaid";
import { PlaidIntegrationError } from "./plaid";

function accountType(type: string, subtype?: string | null): AccountType {
  if (type === "depository") return subtype === "savings" ? AccountType.SAVINGS : AccountType.CHECKING;
  if (type === "credit") return AccountType.CREDIT;
  if (type === "investment") return AccountType.INVESTMENT;
  if (type === "loan") return AccountType.LOAN;
  return AccountType.OTHER;
}

function duplicateAccount(): PlaidIntegrationError {
  return new PlaidIntegrationError("This bank account is already connected to your login. Use its existing connection to sync or reconnect; remove the extra connection in Settings.", { status: 409, code: "PLAID_DUPLICATE_ACCOUNT" });
}

/** All accounts in a provider snapshot are checked and saved atomically. */
export async function savePlaidAccounts(
  item: { userId: string; itemId: string; institution: string | null },
  accounts: AccountBase[],
  now = new Date(),
): Promise<Map<string, string>> {
  try {
    return await prisma.$transaction(async db => {
      const accountMap = new Map<string, string>();
      for (const account of accounts) {
        // Names, balances and masks are not proof of identity. Only use the
        // provider's persistent identifier where the institution supplies it.
        const bankIdentity = account.persistent_account_id
          ? createHash("sha256").update(`plaid:${account.persistent_account_id}`).digest("hex")
          : undefined;
        const existing = await db.account.findUnique({ where: { plaidAccountId: account.account_id } });
        if (existing && existing.userId !== item.userId) {
          throw new PlaidIntegrationError("Bank account could not be linked to this login.", { status: 409, code: "PLAID_ACCOUNT_ALREADY_LINKED" });
        }
        if (existing?.plaidItemId && existing.plaidItemId !== item.itemId) throw duplicateAccount();
        if (bankIdentity) {
          const duplicate = await db.account.findUnique({ where: { userId_bankIdentity: { userId: item.userId, bankIdentity } } });
          if (duplicate && duplicate.plaidAccountId !== account.account_id) throw duplicateAccount();
        }
        const fields = {
          name: account.name, institutionName: item.institution,
          type: accountType(account.type, account.subtype), source: AccountSource.PLAID,
          currentBalance: account.balances.current ?? 0, lastSyncedAt: now,
          ...(bankIdentity ? { bankIdentity } : {}),
        };
        const saved = await db.account.upsert({
          where: { plaidAccountId: account.account_id },
          create: { ...fields, userId: item.userId, plaidAccountId: account.account_id, plaidItemId: item.itemId },
          update: fields,
        });
        accountMap.set(account.account_id, saved.id);
      }
      return accountMap;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      throw new PlaidIntegrationError("Another connection changed these accounts. Retry sync or use the existing connection.", { status: 409, code: "SYNC_CONFLICT" });
    }
    throw error;
  }
}
