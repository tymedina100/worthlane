import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), item: vi.fn(), accounts: vi.fn(), get: vi.fn(), decrypt: vi.fn() }));
vi.mock("@worthlane/db", () => ({ prisma: { plaidItem: { findFirst: mocks.item }, account: { findMany: mocks.accounts } } }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mocks.auth }));
vi.mock("@/lib/plaid", () => ({ plaidClient: { liabilitiesGet: mocks.get }, decryptPlaidAccessToken: mocks.decrypt, toPlaidIntegrationError: () => ({ message: "Unavailable", status: 502, code: "PLAID_ERROR" }) }));
import { POST } from "../route";
const call = () => POST(new NextRequest("http://localhost/api/plaid/items/item/liabilities", { method: "POST" }), { params: { id: "item" } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("PLAID_ENV", "sandbox"); vi.stubEnv("PLAID_LIABILITIES_ENABLED", "false");
  mocks.auth.mockReturnValue({ sub: "owner" }); mocks.item.mockResolvedValue({ id: "item", itemId: "provider-item", accessTokenEncrypted: "cipher" });
  mocks.accounts.mockResolvedValue([{ id: "local", name: "Owned", plaidAccountId: "provider" }]); mocks.decrypt.mockReturnValue("test-token");
  mocks.get.mockResolvedValue({ data: { accounts: [], liabilities: {} } });
});
afterEach(() => vi.unstubAllEnvs());
describe("owner-only liabilities endpoint", () => {
  it("denies missing auth or another user's item before contacting Plaid", async () => {
    mocks.auth.mockImplementationOnce(() => { throw new Error("unauthorized"); }); expect((await call()).status).toBe(401);
    mocks.item.mockResolvedValueOnce(null); expect((await call()).status).toBe(404);
    expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.decrypt).not.toHaveBeenCalled();
    expect(mocks.item).toHaveBeenCalledWith({ where: { id: "item", userId: "owner" } });
  });
  it("requires explicit production enablement", async () => {
    vi.stubEnv("PLAID_ENV", "production"); expect((await call()).status).toBe(503); expect(mocks.get).not.toHaveBeenCalled();
  });
  it("limits requested accounts to the owner's persisted connection", async () => {
    expect((await call()).status).toBe(200);
    expect(mocks.accounts).toHaveBeenCalledWith({ where: { plaidItemId: "provider-item", userId: "owner" }, select: { id: true, name: true, plaidAccountId: true } });
    expect(mocks.get).toHaveBeenCalledWith({ access_token: "test-token", options: { account_ids: ["provider"] } });
  });
});
