import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLinkToken, plaidClient } from "../plaid";

beforeEach(() => {
  vi.stubEnv("PLAID_ENV", "sandbox");
  vi.stubEnv("PLAID_IOS_REDIRECT_URI", "https://worthlane.app/plaid-oauth");
  vi.spyOn(plaidClient, "linkTokenCreate").mockResolvedValue({ data: { link_token: "synthetic-link" } } as any);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("investment consent account selection", () => {
  it.each(["create", "update"] as const)("limits %s to investment accounts", async mode => {
    await createLinkToken("owner", { platform: "ios", mode, purpose: "investments", accessToken: mode === "update" ? "synthetic-access" : undefined });
    const request = vi.mocked(plaidClient.linkTokenCreate).mock.calls[0][0];
    expect(request.account_filters).toEqual({ investment: { account_subtypes: ["all"] } });
    expect(request.redirect_uri).toBe("https://worthlane.app/plaid-oauth");
    if (mode === "update") {
      expect(request.products).toBeUndefined();
      expect(request.access_token).toBe("synthetic-access");
      expect(request.update?.account_selection_enabled).toBe(true);
    } else expect(request.products).toEqual(["investments"]);
  });
  it("retains ordinary banking product selection", async () => {
    await createLinkToken("owner", { platform: "web", mode: "create" });
    const request = vi.mocked(plaidClient.linkTokenCreate).mock.calls[0][0];
    expect(request.products).toEqual(["transactions"]);
    expect(request.account_filters).toBeUndefined();
  });
});
