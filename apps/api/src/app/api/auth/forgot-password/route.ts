import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@worthlane/db";
import { ok, err } from "@/lib/response";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { email } = parsed.data;

  // Always return success to avoid revealing whether an email is registered.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return ok({ message: "If that email exists, a reset code has been sent." });
  }

  // Invalidate any existing unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // 8-char uppercase hex code — typeable, ~4B possibilities, safe with rate limiting
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  try {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail(email, token);
  } catch (emailErr) {
    const { captureServerException } = await import("@/lib/sentry");
    captureServerException(emailErr, { tags: { route: "/api/auth/forgot-password" } });
  }

  return ok({ message: "If that email exists, a reset code has been sent." });
}
