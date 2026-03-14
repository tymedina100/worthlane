import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@finance/db";
import { ok, err } from "@/lib/response";
import { checkRateLimit, ipKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

const SUCCESS_MSG = "If that email exists, a reset code has been sent.";

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(ipKey(req, "forgot-password"), 3, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { email } = parsed.data;

  // Always return success to avoid email enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return ok({ message: SUCCESS_MSG });

  // Invalidate existing unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // In development: return the token directly so you can test without email
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
    return ok({ message: SUCCESS_MSG, __dev_token: token });
  }

  // Production: send via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY not set — cannot send password reset email");
    return ok({ message: SUCCESS_MSG });
  }

  const resend = new Resend(resendKey);
  const fromDomain = process.env.EMAIL_FROM ?? "noreply@vantage.app";

  try {
    await resend.emails.send({
      from: `Vantage <${fromDomain}>`,
      to: email,
      subject: "Reset your Vantage password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#34D399;margin-bottom:8px">Reset your password</h2>
          <p style="color:#94A3B8;margin-bottom:24px">
            Someone requested a password reset for your Vantage account.
            If that wasn't you, you can safely ignore this email.
          </p>
          <p style="color:#F1F5F9;margin-bottom:8px">Your reset code:</p>
          <div style="background:#141927;border:1px solid #252D3D;border-radius:8px;padding:16px;font-family:monospace;font-size:14px;color:#34D399;word-break:break-all;margin-bottom:24px">
            ${token}
          </div>
          <p style="color:#475569;font-size:12px">
            This code expires in 1 hour. Enter it in the Vantage app on the Reset Password screen.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Resend error:", e);
    // Don't leak the error to the client
  }

  return ok({ message: SUCCESS_MSG });
}
