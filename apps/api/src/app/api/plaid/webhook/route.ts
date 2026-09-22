import { NextRequest } from "next/server";
import { PlaidItemStatus, prisma } from "@worthlane/db";
import { isPlaidSandbox, toPlaidIntegrationError, verifyPlaidWebhook } from "@/lib/plaid";
import { syncPlaidItemRecord } from "@/lib/plaid-sync";
import { err, ok } from "@/lib/response";
import { captureServerException } from "@/lib/sentry";

export async function POST(req: NextRequest) {
  const rawBody = await req.text().catch(() => "");

  // Verify the request actually came from Plaid. The only exception is
  // sandbox mode without a verification header (local development).
  const verificationHeader = req.headers.get("plaid-verification");
  if (verificationHeader || !isPlaidSandbox()) {
    const verified = await verifyPlaidWebhook(rawBody, verificationHeader);
    if (!verified) return err("Invalid webhook signature", 401);
  }

  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // fall through to the ignored response below
  }
  if (!body || typeof body !== "object") {
    return ok({ received: true, ignored: true });
  }

  const webhookType = String((body as any).webhook_type ?? "");
  const webhookCode = String((body as any).webhook_code ?? "");
  const itemId = typeof (body as any).item_id === "string" ? (body as any).item_id : null;

  if (!itemId) return ok({ received: true, ignored: true });

  const plaidItem = await prisma.plaidItem.findUnique({ where: { itemId } });
  if (!plaidItem) return ok({ received: true, ignored: true });

  const now = new Date();
  await prisma.plaidItem.update({
    where: { id: plaidItem.id },
    data: { lastWebhookAt: now },
  });

  if (
    (webhookType === "TRANSACTIONS" && webhookCode === "SYNC_UPDATES_AVAILABLE") ||
    (webhookType === "HOLDINGS" && webhookCode === "DEFAULT_UPDATE")
  ) {
    try {
      await syncPlaidItemRecord({ ...plaidItem, lastWebhookAt: now } as any);
    } catch (error) {
      captureServerException(error, {
        tags: { route: "/api/plaid/webhook" },
        extra: {
          itemId,
          webhookCode,
          webhookType,
        },
      });

      // Item status is updated inside the shared sync service.
    }
    return ok({ received: true });
  }

  // Item webhook codes are scoped to ITEM. Informational notifications such as
  // NEW_ACCOUNTS_AVAILABLE and WEBHOOK_UPDATE_ACKNOWLEDGED are not login errors.
  // https://plaid.com/docs/api/items/#webhooks
  if (webhookType !== "ITEM") return ok({ received: true });

  if (webhookCode === "LOGIN_REPAIRED") {
    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: {
        status: PlaidItemStatus.HEALTHY,
        needsRelink: false,
        errorCode: null,
        errorMessage: null,
      },
    });
    // Login repair does not mean account data has been synced again.
    return ok({ received: true });
  }

  if (webhookCode === "PENDING_EXPIRATION" || webhookCode === "PENDING_DISCONNECT") {
    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: {
        status: PlaidItemStatus.PENDING_EXPIRATION,
        needsRelink: true,
        errorCode: webhookCode,
        errorMessage: webhookCode === "PENDING_DISCONNECT"
          ? "Your bank connection will disconnect soon. Please re-link it."
          : "Your bank connection is expiring soon. Please re-link it.",
      },
    });
    return ok({ received: true });
  }

  if (
    webhookCode === "ERROR" ||
    webhookCode === "USER_PERMISSION_REVOKED" ||
    webhookCode === "USER_ACCOUNT_REVOKED"
  ) {
    const errorCode =
      typeof (body as any).error?.error_code === "string"
        ? (body as any).error.error_code
        : webhookCode;
    const errorMessage =
      typeof (body as any).error?.error_message === "string"
        ? (body as any).error.error_message
        : "Your bank connection needs attention.";

    const needsRelink = webhookCode !== "ERROR" || toPlaidIntegrationError({
      response: { data: { error_code: errorCode } },
    }).needsRelink;
    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: {
        status: needsRelink ? PlaidItemStatus.NEEDS_RELINK : PlaidItemStatus.ERROR,
        needsRelink,
        errorCode,
        errorMessage,
      },
    });
    return ok({ received: true });
  }

  return ok({ received: true });
}
