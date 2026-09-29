import type { PlaidPlatform } from "./plaid";

/** Validate before creating a live Link session; never include secret values in errors. */
export function validateLiveLinkConfiguration(
  platform: PlaidPlatform,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const environment = env.PLAID_ENV ?? "sandbox";
  if (environment === "sandbox") return;
  if (environment !== "production") throw new Error("PLAID_ENV must be sandbox or production.");

  for (const name of ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_TOKEN_ENCRYPTION_KEY"]) {
    if (!env[name]?.trim()) throw new Error(`${name} is required before live bank connections can start.`);
  }
  const urlNames = ["PLAID_WEBHOOK_URL"];
  if (platform === "web") urlNames.push("PLAID_WEB_REDIRECT_URI");
  if (platform === "ios") urlNames.push("PLAID_IOS_REDIRECT_URI");
  for (const name of urlNames) {
    let valid = false;
    try {
      const url = new URL(env[name] ?? "");
      valid = url.protocol === "https:" && !url.username && !url.password &&
        !url.search && !url.hash && url.hostname.includes(".") &&
        !url.hostname.endsWith(".localhost") && !url.hostname.endsWith(".local") &&
        !/^[\d.]+$/.test(url.hostname) && !url.hostname.includes(":");
    } catch { /* Report the variable name, never a URL containing credentials. */ }
    if (!valid) throw new Error(`${name} must be a public HTTPS URL without credentials, query, or fragment before live bank connections can start.`);
  }
  if (platform === "android" && !/^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$/.test(env.PLAID_ANDROID_PACKAGE_NAME ?? "")) {
    throw new Error("PLAID_ANDROID_PACKAGE_NAME must be configured before live bank connections can start.");
  }
}
