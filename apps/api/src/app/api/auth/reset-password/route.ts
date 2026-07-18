import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@worthlane/db";
import { hashPassword, revokeAllUserSessions } from "@/lib/auth";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";
import { ok, err } from "@/lib/response";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  // Codes are short enough to guess without a cap on attempts.
  const limited = checkRateLimit(ipKey(req, "reset-password"), 5, 15 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Invalid request body");

  const { newPassword } = parsed.data;
  const token = parsed.data.token.trim().toUpperCase();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return err("Invalid or expired reset code", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });
    await revokeAllUserSessions(resetToken.userId, tx);
  });

  return ok({ message: "Password updated. Please sign in." });
}
