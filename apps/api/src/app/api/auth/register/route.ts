import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { createRefreshSession, hashPassword, signAccessToken } from "@/lib/auth";
import { captureServerEvent } from "@/lib/posthog";
import { ok, err } from "@/lib/response";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(ipKey(req, "register"), 5, 60 * 60 * 1000);
  if (limited) return limited;

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
  const refreshToken = await createRefreshSession(user.id);

  await captureServerEvent({
    distinctId: user.id,
    event: "user registered",
    properties: {
      method: "password",
      $set: {
        email: user.email,
      },
      $set_once: {
        first_registered_at: new Date().toISOString(),
      },
    },
  });

  return ok({ user, accessToken, refreshToken }, 201);
}
