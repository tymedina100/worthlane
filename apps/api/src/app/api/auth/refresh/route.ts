import { NextRequest } from "next/server";
import { z } from "zod";
import { rotateRefreshSession, signAccessToken } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  try {
    const { user, refreshToken } = await rotateRefreshSession(parsed.data.refreshToken);
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return ok({ accessToken, refreshToken });
  } catch {
    return err("Invalid or expired refresh token", 401);
  }
}
