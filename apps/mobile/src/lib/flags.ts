// Build-time feature flags (EXPO_PUBLIC_* vars are inlined at build time).

/**
 * Bank linking via Plaid. Enabled by default for development (sandbox);
 * set EXPO_PUBLIC_PLAID_ENABLED=false in EAS env for store builds until
 * Plaid production access is approved.
 */
export const PLAID_ENABLED = process.env.EXPO_PUBLIC_PLAID_ENABLED === "true";

/** Kept dormant for V1: the primary experience never requires AI or a paywall. */
export const AI_ENABLED = process.env.EXPO_PUBLIC_ENABLE_AI === "true";
export const PAYWALL_ENABLED = process.env.EXPO_PUBLIC_ENABLE_PAYWALL === "true";
