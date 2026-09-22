import { NextRequest } from "next/server";
import { PlaidItemStatus, prisma } from "@worthlane/db";
import { isPlaidSandbox, verifyPlaidWebhook } from "@/lib/plaid";
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

  if (webhookCode === "SYNC_UPDATES_AVAILABLE" || (webhookType === "HOLDINGS" && webhookCode === "DEFAULT_UPDATE")) {
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

  if (webhookCode === "PENDING_EXPIRATION") {
    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: {
        status: PlaidItemStatus.PENDING_EXPIRATION,
        needsRelink: true,
        errorCode: webhookCode,
        errorMessage: "Your bank connection is expiring soon. Please re-link it.",
      },
    });
    return ok({ received: true });
  }

  if (
    webhookType === "ITEM" ||
    webhookCode === "ERROR" ||
    webhookCode === "USER_PERMISSION_REVOKED" ||
    webhookCode === "ITEM_LOGIN_REQUIRED"
  ) {
    const errorCode =
      typeof (body as any).error?.error_code === "string"
        ? (body as any).error.error_code
        : webhookCode;
    const errorMessage =
      typeof (body as any).error?.error_message === "string"
        ? (body as any).error.error_message
        : "Your bank connection needs attention.";

    await prisma.plaidItem.update({
      where: { id: plaidItem.id },
      data: {
        status: PlaidItemStatus.NEEDS_RELINK,
        needsRelink: true,
        errorCode,
        errorMessage,
      },
    });
    return ok({ received: true });
  }

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
  }

  return ok({ received: true });
}
