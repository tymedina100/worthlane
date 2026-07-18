import { z } from "zod";

// Validate only the configuration every API route requires. Optional
// integrations validate their own credentials when invoked so a disabled
// Plaid, AI, email, or cron feature cannot take down auth and core finance
// routes in production.

const schema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
    PLAID_TOKEN_ENCRYPTION_KEY: z.string().optional(),
    PLAID_WEB_REDIRECT_URI: z.string().url().optional(),
    CRON_SECRET: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  });

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.errors
      .map((e) => `  - ${e.path.join(".") || "env"}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();
