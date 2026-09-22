import { afterEach, describe, expect, it, vi } from "vitest";
import { Products } from "plaid";
import { createLinkToken, plaidClient } from "../plaid";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("Link product consent", () => {
  it("does not contact Plaid when a live callback is missing", async () => {
    vi.stubEnv("PLAID_ENV", "production");
    vi.stubEnv("PLAID_CLIENT_ID", "synthetic-client");
    vi.stubEnv("PLAID_SECRET", "synthetic-secret");
    vi.stubEnv("PLAID_TOKEN_ENCRYPTION_KEY", "synthetic-key");
    vi.stubEnv("PLAID_WEBHOOK_URL", "");
    const create = vi.spyOn(plaidClient, "linkTokenCreate");
    await expect(createLinkToken("user", { platform: "web", mode: "create" })).rejects.toThrow("PLAID_WEBHOOK_URL");
    expect(create).not.toHaveBeenCalled();
  });
  it("initializes investment connections without requiring spending transactions", async () => {
    vi.stubEnv("PLAID_ENV", "sandbox");
    const create = vi.spyOn(plaidClient, "linkTokenCreate").mockResolvedValue({ data: { link_token: "test" } } as any);
    await createLinkToken("user", { platform: "web", mode: "create", purpose: "investments" });
    expect(create.mock.calls[0][0].products).toEqual([Products.Investments]);
    expect(create.mock.calls[0][0].transactions).toBeUndefined();
  });
  it("blocks live Investments unless explicitly enabled", async () => {
    for (const [key, value] of Object.entries({ PLAID_ENV: "production", PLAID_CLIENT_ID: "synthetic", PLAID_SECRET: "synthetic", PLAID_TOKEN_ENCRYPTION_KEY: "synthetic", PLAID_WEBHOOK_URL: "https://api.example.com/webhook", PLAID_WEB_REDIRECT_URI: "https://app.example.com/return", PLAID_INVESTMENTS_ENABLED: "false" })) vi.stubEnv(key, value);
    const create = vi.spyOn(plaidClient, "linkTokenCreate");
    await expect(createLinkToken("user", { platform: "web", mode: "create", purpose: "investments" })).rejects.toThrow("not enabled");
    expect(create).not.toHaveBeenCalled();
  });
  it("keeps ordinary creation transaction-only", async () => {
    const create = vi.spyOn(plaidClient, "linkTokenCreate").mockResolvedValue({ data: { link_token: "test" } } as any);
    await createLinkToken("user", { platform: "web", mode: "create" });
    expect(create.mock.calls[0][0]).toMatchObject({ products: [Products.Transactions], transactions: { days_requested: 730 } });
    expect(create.mock.calls[0][0].additional_consented_products).toBeUndefined();
  });
  it("adds explicit liabilities consent without initializing products in update mode", async () => {
    const create = vi.spyOn(plaidClient, "linkTokenCreate").mockResolvedValue({ data: { link_token: "test" } } as any);
    await createLinkToken("user", { platform: "web", mode: "update", accessToken: "synthetic", includeLiabilities: true });
    const request = create.mock.calls[0][0];
    expect(request.additional_consented_products).toEqual([Products.Liabilities]);
    expect(request.products).toBeUndefined(); expect(request.transactions).toBeUndefined();
    expect(request.update?.account_selection_enabled).toBe(true);
  });
  it("requires the existing access token for update mode", async () => {
    const create = vi.spyOn(plaidClient, "linkTokenCreate");
    await expect(createLinkToken("user", { platform: "web", mode: "update", includeLiabilities: true })).rejects.toThrow("access token");
    expect(create).not.toHaveBeenCalled();
  });
});
