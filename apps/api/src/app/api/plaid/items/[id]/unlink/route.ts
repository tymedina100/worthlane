import { NextRequest } from "next/server";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import {
  decryptPlaidAccessToken,
  PlaidIntegrationError,
  removeItem,
} from "@/lib/plaid";
import { err, notFound, ok, unauthorized } from "@/lib/response";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const plaidItem = await prisma.plaidItem.findFirst({
    where: { id: params.id, userId },
  });
  if (!plaidItem) return notFound("Bank connection not found");

  try {
    await removeItem(decryptPlaidAccessToken(plaidItem.accessTokenEncrypted));
  } catch (error) {
    if (!(error instanceof PlaidIntegrationError) || error.code !== "ITEM_NOT_FOUND") {
      if (error instanceof PlaidIntegrationError) {
        return err(error.message, error.status, error.code);
      }
      return err(error instanceof Error ? error.message : "Could not unlink bank connection.", 500);
    }
  }

  const accounts = await prisma.account.findMany({
    where: { userId, plaidItemId: plaidItem.itemId },
    select: { id: true },
  });

  const accountIds = accounts.map((account) => account.id);

  await prisma.$transaction([
    prisma.transaction.deleteMany({
      where: { accountId: { in: accountIds } },
    }),
    prisma.account.deleteMany({
      where: { userId, plaidItemId: plaidItem.itemId },
    }),
    prisma.plaidItem.delete({
      where: { id: plaidItem.id },
    }),
  ]);

  return ok({ unlinked: true });
}
