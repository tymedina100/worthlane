import { env } from "./env";

// Sends transactional email via the Resend HTTP API. Never log message bodies,
// recipient addresses, reset codes, or raw provider errors.

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured; cannot send email.");
    }
    console.info("[DEV email] Delivery skipped: email provider is not configured.");
    return;
  }

  if (env.NODE_ENV === "production" && !env.EMAIL_FROM?.trim()) {
    throw new Error("EMAIL_FROM is not configured; cannot send email.");
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? "Worthlane <onboarding@resend.dev>",
        ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
        to: [to],
        subject,
        text,
        html,
      }),
    });
  } catch {
    // Transport exceptions can carry request details. Keep diagnostics generic.
    throw new Error("Email delivery failed or timed out.");
  }

  if (!res.ok) {
    throw new Error(`Email provider rejected delivery (${res.status}).`);
  }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const subject = "Your Worthlane password reset code";
  const text = [
    "Hi,",
    "",
    "Use this code to reset your Worthlane password:",
    "",
    `    ${code}`,
    "",
    "The code expires in 1 hour and can be used once. If you didn't request this, you can safely ignore this email.",
    "",
    "— Worthlane",
  ].join("\n");

  const html = `
  <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 14px; font-weight: 700; letter-spacing: 3px; color: #10B981; margin: 0 0 24px;">WORTHLANE</p>
    <p style="font-size: 16px; color: #0F172A;">Use this code to reset your password:</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0F172A; background: #F1F5F9; border-radius: 12px; padding: 16px 24px; text-align: center;">${code}</p>
    <p style="font-size: 14px; color: #64748B;">The code expires in 1 hour and can be used once. If you didn't request this, you can safely ignore this email.</p>
  </div>`;

  await sendEmail({ to, subject, text, html });
}
