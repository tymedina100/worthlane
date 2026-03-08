import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, AccountType } from "@finance/db";
import { getAuthUser } from "@/lib/auth";
import { exchangePublicToken, getAccounts } from "@/lib/plaid";
import { ok, err, unauthorized } from "@/lib/response";

const schema = z.object({
  publicToken: z.string(),
  institutionName: z.string().optional(),
});

const plaidTypeMap: Record<string, AccountType> = {
  depository: AccountType.CHECKING,
  credit: AccountType.CREDIT,
  investment: AccountType.INVESTMENT,
  loan: AccountType.LOAN,
};

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { publicToken, institutionName } = parsed.data;

  const { accessToken, itemId } = await exchangePublicToken(publicToken);

  // Persist the item
  await prisma.plaidItem.create({
    data: { userId, itemId, accessToken, institution: institutionName },
  });

  // Fetch and persist accounts
  const plaidAccounts = await getAccounts(accessToken);
  const accounts = await Promise.all(
    plaidAccounts.map((a) =>
      prisma.account.create({
        data: {
          userId,
          plaidAccountId: a.account_id,
          plaidItemId: itemId,
          name: a.name,
          institutionName,
          type: plaidTypeMap[a.type] ?? AccountType.OTHER,
          currentBalance: a.balances.current ?? 0,
          lastSyncedAt: new Date(),
        },
      })
    )
  );

  return ok({ accounts }, 201);
}
