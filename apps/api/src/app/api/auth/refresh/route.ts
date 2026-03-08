import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const schema = z.object({ refreshToken: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  try {
    const { sub: userId } = verifyRefreshToken(parsed.data.refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) return err("User not found", 404);

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = signRefreshToken(user.id);

    return ok({ accessToken, refreshToken });
  } catch {
    return err("Invalid or expired refresh token", 401);
  }
}
