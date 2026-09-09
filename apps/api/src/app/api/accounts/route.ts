import { NextRequest } from "next/server";
import { z } from "zod";
import { AccountType, AccountSource, prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { err, ok, unauthorized } from "@/lib/response";
import { moneyAmount } from "@/lib/validation";
import { bankDataNotice } from "@worthlane/core";

const createSchema = z.object({
  name: z.string().min(1),
  institutionName: z.string().optional(),
  type: z.nativeEnum(AccountType),
  currentBalance: moneyAmount,
});

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const plaidItems = await prisma.plaidItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const itemByExternalId = new Map(plaidItems.map((item) => [item.itemId, item]));
  const accountCountsByItem = accounts.reduce<Record<string, number>>((acc, account) => {
    if (account.plaidItemId) {
      acc[account.plaidItemId] = (acc[account.plaidItemId] ?? 0) + 1;
    }
    return acc;
  }, {});

  return ok({
    accounts: accounts.map((a) => {
      const plaidItem = a.plaidItemId ? itemByExternalId.get(a.plaidItemId) : null;
      return {
        id: a.id,
        name: a.name,
        institutionName: a.institutionName,
        type: a.type,
        source: a.source,
        currentBalance: a.currentBalance.toNumber(),
        lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
        plaidItemId: plaidItem?.id ?? null,
        plaidItemStatus: plaidItem?.status ?? null,
        plaidNeedsRelink: plaidItem?.needsRelink ?? false,
        plaidErrorMessage: plaidItem?.errorMessage ?? null,
      };
    }),
    plaidItems: plaidItems.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      institution: item.institution ?? null,
      status: item.status,
      needsRelink: item.needsRelink,
      errorCode: item.errorCode ?? null,
      errorMessage: item.errorMessage ?? null,
      lastSyncAt: item.lastSyncAt?.toISOString() ?? null,
      transactionHistoryStatus: item.transactionHistoryStatus,
      dataNotice: bankDataNotice({ ...item, lastSyncAt: item.lastSyncAt?.toISOString() ?? null }, new Date()),
      lastWebhookAt: item.lastWebhookAt?.toISOString() ?? null,
      accountCount: accountCountsByItem[item.itemId] ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const account = await prisma.account.create({
    data: {
      userId,
      name: parsed.data.name.trim(),
      institutionName: parsed.data.institutionName?.trim() || null,
      type: parsed.data.type,
      source: AccountSource.MANUAL,
      currentBalance: parsed.data.currentBalance,
    },
  });

  return ok({
    id: account.id,
    name: account.name,
    institutionName: account.institutionName,
    type: account.type,
    source: account.source,
    currentBalance: account.currentBalance.toNumber(),
    lastSyncedAt: null,
    plaidItemId: null,
    plaidItemStatus: null,
    plaidNeedsRelink: false,
    plaidErrorMessage: null,
  }, 201);
}
