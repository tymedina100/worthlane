import { NextRequest } from "next/server";
import { z } from "zod";
import { AccountSource, prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { ok, err, unauthorized, notFound } from "@/lib/response";
import { moneyAmount } from "@/lib/validation";
import { spendingTreatmentSchema, validSpendingTreatment } from "@/lib/spending-treatment";

const manualUpdateSchema = z.object({
  spendingTreatment: spendingTreatmentSchema.optional(),
  accountId: z.string().optional(),
  amount: moneyAmount.optional(),
  date: z.string().datetime().optional(),
  categoryId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  isImpulse: z.boolean().optional(),
  merchantName: z.string().nullable().optional(),
});

const importedUpdateSchema = z.object({
  spendingTreatment: spendingTreatmentSchema.optional(),
  categoryId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  isImpulse: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const tx = await prisma.transaction.findFirst({ where: { id: params.id, userId } });
  if (!tx) return notFound();

  const body = await req.json().catch(() => null);
  const parsedManual = tx.isManual ? manualUpdateSchema.safeParse(body) : null;
  const parsedImported = tx.isManual ? null : importedUpdateSchema.safeParse(body);

  if (parsedManual && !parsedManual.success) return err("Invalid request body");
  if (parsedImported && !parsedImported.success) return err("Invalid request body");

  if (parsedManual?.data.accountId) {
    const account = await prisma.account.findFirst({
      where: {
        id: parsedManual.data.accountId,
        userId,
      },
    });

    if (!account) return err("Account not found", 404, "ACCOUNT_NOT_FOUND");
    if (account.source !== AccountSource.MANUAL) {
      return err("Manual transactions can only be moved to manual accounts.", 400, "ACCOUNT_NOT_MANUAL");
    }
  }

  const updateData = tx.isManual
    ? {
        ...parsedManual!.data,
        ...(parsedManual!.data.date ? { date: new Date(parsedManual!.data.date) } : {}),
      }
    : parsedImported!.data;

  const treatment = updateData?.spendingTreatment ?? tx.spendingTreatment;
  const amount = parsedManual?.data.amount ?? tx.amount.toNumber();
  if (!validSpendingTreatment(amount, treatment)) {
    return err("A refund must be a negative credit amount");
  }
  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: { ...updateData, ...(updateData?.categoryId !== undefined ? { categoryOverridden: true } : {}), ...(updateData?.spendingTreatment !== undefined ? { treatmentOverridden: true } : {}) },
    include: { category: true, account: true },
  });

  return ok({
    id: updated.id,
    amount: updated.amount.toNumber(),
    date: updated.date.toISOString(),
    merchantName: updated.merchantName,
    note: updated.note,
    isImpulse: updated.isImpulse,
    isManual: updated.isManual,
    spendingTreatment: updated.spendingTreatment,
    account: {
      id: updated.account.id,
      name: updated.account.name,
      source: updated.account.source,
    },
    category: updated.category
      ? {
          id: updated.category.id,
          name: updated.category.name,
          icon: updated.category.icon,
          color: updated.category.color,
        }
      : null,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let userId: string;
  try {
    ({ sub: userId } = getAuthUser(req));
  } catch {
    return unauthorized();
  }

  const tx = await prisma.transaction.findFirst({ where: { id: params.id, userId } });
  if (!tx) return notFound();
  if (!tx.isManual) {
    return err("Imported transactions cannot be deleted.", 400, "TRANSACTION_NOT_DELETABLE");
  }

  await prisma.transaction.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
