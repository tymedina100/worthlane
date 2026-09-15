import { NextRequest } from "next/server";
import { z } from "zod";
import { AccountType, AccountSource, prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { err, notFound, ok, unauthorized } from "@/lib/response";
import { moneyAmount } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  institutionName: z.string().nullable().optional(),
  type: z.nativeEnum(AccountType).optional(),
  currentBalance: moneyAmount.optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const account = await prisma.account.findFirst({
    where: { id: params.id, userId },
  });
  if (!account) return notFound("Account not found");
  if (account.source !== AccountSource.MANUAL) {
    return err("Only manual accounts can be edited.", 400, "ACCOUNT_NOT_EDITABLE");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const updated = await prisma.account.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name?.trim(),
      institutionName:
        parsed.data.institutionName !== undefined
          ? parsed.data.institutionName?.trim() || null
          : undefined,
      type: parsed.data.type,
      currentBalance: parsed.data.currentBalance,
    },
  });

  return ok({
    id: updated.id,
    name: updated.name,
    institutionName: updated.institutionName,
    type: updated.type,
    source: updated.source,
    currentBalance: updated.currentBalance.toNumber(),
    lastSyncedAt: updated.lastSyncedAt?.toISOString() ?? null,
    plaidItemId: null,
    plaidItemStatus: null,
    plaidNeedsRelink: false,
    plaidErrorMessage: null,
  });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const account = await prisma.account.findFirst({
    where: { id: params.id, userId },
  });
  if (!account) return notFound("Account not found");
  if (account.source !== AccountSource.MANUAL) {
    return err("Plaid-backed accounts must be unlinked through the institution.", 400, "ACCOUNT_NOT_DELETABLE");
  }

  await prisma.account.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
