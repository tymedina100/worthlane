import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return err("Email already registered", 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });

  // Seed system categories for the new user's first session
  // (Categories are system-wide, no seeding needed per user)

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken(user.id);

  return ok({ user, accessToken, refreshToken }, 201);
}
