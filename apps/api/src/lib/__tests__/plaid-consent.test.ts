import { afterEach, describe, expect, it, vi } from "vitest";
import { Products } from "plaid";
import { createLinkToken, plaidClient } from "../plaid";
afterEach(() => vi.restoreAllMocks());
describe("Link product consent", () => {
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
