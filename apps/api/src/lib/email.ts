import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  await resend.emails.send({
    from: "Worthlane <onboarding@resend.dev>",
    to,
    subject: "Your Worthlane password reset code",
    text: [
      "You requested a password reset for your Worthlane account.",
      "",
      `Your reset code is: ${token}`,
      "",
      "Enter this code in the app to set a new password. It expires in 1 hour.",
      "",
      "If you didn't request this, you can ignore this email — your account is safe.",
    ].join("\n"),
  });
}
