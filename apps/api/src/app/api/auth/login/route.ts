import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return err("Invalid credentials", 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return err("Invalid credentials", 401);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken(user.id);

  return ok({
    user: { id: user.id, email: user.email },
    accessToken,
    refreshToken,
  });
}
