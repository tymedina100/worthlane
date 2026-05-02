import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { createLocalJWKSet, jwtVerify } from "jose";
import { PlaidItemStatus, prisma } from "@worthlane/db";
import { plaidClient } from "@/lib/plaid";
import { syncPlaidItemRecord } from "@/lib/plaid-sync";
import { ok, err } from "@/lib/response";
import { captureServerException } from "@/lib/sentry";

// Cache verified JWKs for 5 minutes to avoid hitting Plaid on every webhook
const jwkCache = new Map<string, { key: object; expiresAt: number }>();

async function verifyPlaidWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
  const verificationId = req.headers.get("plaid-verification-id");
  const signatureJwt = req.headers.get("plaid-signature");
  if (!verificationId || !signatureJwt) return false;

  try {
    const now = Date.now();
    let jwk = jwkCache.get(verificationId);
    if (!jwk || jwk.expiresAt < now) {
      const { data } = await plaidClient.webhookVerificationKeyGet({ key_id: verificationId });
      jwk = { key: data.key, expiresAt: now + 5 * 60 * 1000 };
      jwkCache.set(verificationId, jwk);
    }

    const JWKS = createLocalJWKSet({ keys: [jwk.key] });
    const { payload } = await jwtVerify(signatureJwt, JWKS, { algorithms: ["ES256"] });

    // Verify the body hash matches
    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    if ((payload as { request_body_sha256?: string }).request_body_sha256 !== bodyHash) return false;

    // Reject stale webhooks (older than 5 minutes)
    const iat = typeof payload.iat === "number" ? payload.iat : 0;
    if (now / 1000 - iat > 300) return false;

    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifyPlaidWebhook(req, rawBody);
  if (!valid) return err("Invalid webhook signature", 401);

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  if (!body || typeof body !== "object") {
    return ok({ received: true, ignored: true });
  }

  const webhookType = String(body.webhook_type ?? "");
  const webhookCode = String(body.webhook_code ?? "");
  const itemId = typeof body.item_id === "string" ? body.item_id : null;

  if (!itemId) return ok({ received: true, ignored: true });

  const plaidItem = await prisma.plaidItem.findUnique({ where: { itemId } });
  if (!plaidItem) return ok({ received: true, ignored: true });

  const now = new Date();
  await prisma.plaidItem.update({
    where: { id: plaidItem.id },
    data: { lastWebhookAt: now },
  });

  if (webhookCode === "SYNC_UPDATES_AVAILABLE") {
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
    const bodyError = body.error as Record<string, unknown> | undefined;
    const errorCode =
      typeof bodyError?.error_code === "string" ? bodyError.error_code : webhookCode;
    const errorMessage =
      typeof bodyError?.error_message === "string"
        ? bodyError.error_message
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
