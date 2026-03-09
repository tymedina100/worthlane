import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@finance/db";
import { hashPassword } from "@/lib/auth";
import { ok, err } from "@/lib/response";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Invalid request body");

  const { token, newPassword } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return err("Invalid or expired reset code", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    }),
  ]);

  return ok({ message: "Password updated. Please sign in." });
}
