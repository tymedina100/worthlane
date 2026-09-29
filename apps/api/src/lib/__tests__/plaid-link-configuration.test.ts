import { describe, expect, it } from "vitest";
import { validateLiveLinkConfiguration } from "../plaid-link-configuration";

const live = {
  PLAID_ENV: "production", PLAID_CLIENT_ID: "synthetic-client",
  PLAID_SECRET: "synthetic-secret", PLAID_TOKEN_ENCRYPTION_KEY: "synthetic-key",
  PLAID_WEBHOOK_URL: "https://api.example.com/api/plaid/webhook",
  PLAID_WEB_REDIRECT_URI: "https://app.example.com/dashboard/plaid-return",
  PLAID_IOS_REDIRECT_URI: "https://example.com/plaid-oauth",
  PLAID_ANDROID_PACKAGE_NAME: "com.worthlane.mobile",
};

describe("live Link configuration", () => {
  it("preserves local Sandbox without production configuration", () => {
    expect(() => validateLiveLinkConfiguration("web", {})).not.toThrow();
  });
  it("accepts complete platform configuration", () => {
    for (const platform of ["web", "ios", "android"] as const) {
      expect(() => validateLiveLinkConfiguration(platform, live)).not.toThrow();
    }
  });
  it("rejects unknown environments rather than starting a session", () => {
    expect(() => validateLiveLinkConfiguration("web", { ...live, PLAID_ENV: "prod" })).toThrow("PLAID_ENV");
  });
  it.each(["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_TOKEN_ENCRYPTION_KEY", "PLAID_WEBHOOK_URL", "PLAID_WEB_REDIRECT_URI"])("requires %s for web", key => {
    expect(() => validateLiveLinkConfiguration("web", { ...live, [key]: "" })).toThrow(key);
  });
  it("requires the relevant native platform setting", () => {
    expect(() => validateLiveLinkConfiguration("ios", { ...live, PLAID_IOS_REDIRECT_URI: "" })).toThrow("PLAID_IOS_REDIRECT_URI");
    expect(() => validateLiveLinkConfiguration("android", { ...live, PLAID_ANDROID_PACKAGE_NAME: "" })).toThrow("PLAID_ANDROID_PACKAGE_NAME");
    expect(() => validateLiveLinkConfiguration("android", { ...live, PLAID_WEB_REDIRECT_URI: "" })).not.toThrow();
  });
  it.each(["http://api.example.com/webhook", "https://localhost/path", "https://api.local/path", "https://127.0.0.1/path", "https://[::1]/path", "https://user:private-value@api.example.com/path", "https://api.example.com/path?token=private-value", "https://api.example.com/path#private-value"])("rejects unsuitable callback without echoing it: %s", value => {
    let message = "";
    try { validateLiveLinkConfiguration("web", { ...live, PLAID_WEBHOOK_URL: value }); }
    catch (error) { message = (error as Error).message; }
    expect(message).toContain("PLAID_WEBHOOK_URL");
    expect(message).not.toContain(value);
    expect(message).not.toContain("private-value");
  });
});
