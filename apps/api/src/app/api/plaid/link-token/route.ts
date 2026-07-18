import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { getAuthUser } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog";
import { createLinkToken, decryptPlaidAccessToken, PlaidIntegrationError } from "@/lib/plaid";
import { err, ok, unauthorized } from "@/lib/response";
import { captureServerException } from "@/lib/sentry";

const schema = z.object({
  platform: z.enum(["ios", "android", "web"]),
  mode: z.enum(["create", "update"]),
  plaidItemId: z.string().optional(),
});

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

  try {
    let accessToken: string | undefined;

    if (parsed.data.mode === "update") {
      if (!parsed.data.plaidItemId) {
        return err("plaidItemId is required for update mode", 400, "PLAID_ITEM_REQUIRED");
      }

      const plaidItem = await prisma.plaidItem.findFirst({
        where: { id: parsed.data.plaidItemId, userId },
      });
      if (!plaidItem) return err("Bank connection not found", 404, "PLAID_ITEM_NOT_FOUND");
      accessToken = decryptPlaidAccessToken(plaidItem.accessTokenEncrypted);
    }

    const linkToken = await createLinkToken(userId, {
      platform: parsed.data.platform,
      mode: parsed.data.mode,
      accessToken,
    });

    await captureServerEvent({
      distinctId: userId,
      event: "bank link token requested",
      properties: {
        platform: parsed.data.platform,
        mode: parsed.data.mode,
        plaidItemId: parsed.data.plaidItemId ?? null,
      },
    });

    return ok({ linkToken });
  } catch (error) {
    if (error instanceof PlaidIntegrationError) {
      return err(error.message, error.status, error.code);
    }

    captureServerException(error, {
      tags: { route: "/api/plaid/link-token" },
      extra: {
        mode: parsed.data.mode,
        platform: parsed.data.platform,
        plaidItemId: parsed.data.plaidItemId ?? null,
        userId,
      },
    });

    return err(error instanceof Error ? error.message : "Could not create a Plaid link token.", 500);
  }
}
