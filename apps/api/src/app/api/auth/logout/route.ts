import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthUser, revokeRefreshSession } from "@/lib/auth";
import { err, ok, unauthorized } from "@/lib/response";

const schema = z.object({ refreshToken: z.string().min(1) });

// A refresh token is itself an authenticated credential. A valid access token,
// when supplied, must identify the same user; allowing refresh-only logout lets
// clients revoke a session even after their 15-minute access token expires.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  let accessUserId: string | undefined;
  if (req.headers.get("authorization")) {
    try {
      accessUserId = getAuthUser(req).sub;
    } catch {
      return unauthorized();
    }
  }

  const revoked = await revokeRefreshSession(parsed.data.refreshToken, accessUserId);
  if (!revoked) return unauthorized();
  return ok({ revoked: true });
}
