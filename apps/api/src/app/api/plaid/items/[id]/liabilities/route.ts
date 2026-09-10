import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";
import { decryptPlaidAccessToken, plaidClient, toPlaidIntegrationError } from "@/lib/plaid";
import { liabilitySnapshot } from "@/lib/plaid-liabilities";
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try { ({ sub: userId } = getAuthUser(req)); } catch { return unauthorized(); }
  const item = await prisma.plaidItem.findFirst({ where: { id: params.id, userId } });
  if (!item) return notFound("Bank connection not found");
  if ((process.env.PLAID_ENV ?? "sandbox") !== "sandbox" && process.env.PLAID_LIABILITIES_ENABLED !== "true") {
    return err("Bank debt details are not enabled here. You can enter confirmed details manually.", 503, "LIABILITIES_DISABLED");
  }
  const accounts = await prisma.account.findMany({ where: { plaidItemId: item.itemId, userId }, select: { id: true, name: true, plaidAccountId: true } });
  if (!accounts.length) return err("No accounts are available for this connection. Sync accounts first.", 422, "NO_ACCOUNTS");
  try {
    const response = await plaidClient.liabilitiesGet({ access_token: decryptPlaidAccessToken(item.accessTokenEncrypted), options: { account_ids: accounts.flatMap(account => account.plaidAccountId ? [account.plaidAccountId] : []) } });
    return ok(liabilitySnapshot(response.data, accounts, new Date()));
  } catch (error) {
    const mapped = toPlaidIntegrationError(error, "Debt details are unavailable for this connection. You can enter confirmed details manually.");
    return err(mapped.message, mapped.status, mapped.code);
  }
}
