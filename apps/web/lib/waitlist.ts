import postgres from "postgres";
import { createHmac } from "node:crypto";

export const CONSENT_VERSION = "beta-invitations-2026-09-10";
let client: ReturnType<typeof postgres> | undefined;
function database() {
  if (!process.env.WAITLIST_DATABASE_URL) throw new Error("Waitlist unavailable");
  return client ??= postgres(process.env.WAITLIST_DATABASE_URL, {
    max: 2, idle_timeout: 20, connect_timeout: 5, prepare: false,
  });
}

export async function saveSignup(email: string, address: string) {
  const secret = process.env.WAITLIST_RATE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Waitlist unavailable");
  const hour = Math.floor(Date.now() / 3_600_000);
  const bucket = createHmac("sha256", secret).update(`${hour}:${address}`).digest("hex");
  return database().begin(async sql => {
    await sql`DELETE FROM beta_rate_limits WHERE expires_at < now()`;
    const [rate] = await sql`
      INSERT INTO beta_rate_limits (bucket, attempts, expires_at)
      VALUES (${bucket}, 1, now() + interval '2 hours')
      ON CONFLICT (bucket) DO UPDATE SET attempts = beta_rate_limits.attempts + 1
      RETURNING attempts`;
    if (rate.attempts > 5) return false;
    await sql`INSERT INTO beta_waitlist (email, consent_version)
      VALUES (${email}, ${CONSENT_VERSION}) ON CONFLICT (email) DO NOTHING`;
    return true;
  });
}
