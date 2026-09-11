import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), find: vi.fn(), decrypt: vi.fn(), remove: vi.fn(),
  deleteData: vi.fn(), capture: vi.fn(),
}));
vi.mock("@worthlane/db", () => ({ prisma: { plaidItem: { findMany: mocks.find } } }));
vi.mock("@/lib/auth", () => ({ getAuthUser: mocks.auth }));
vi.mock("@/lib/account-deletion", () => ({ deleteUserAccountData: mocks.deleteData }));
vi.mock("@/lib/sentry", () => ({ captureServerException: mocks.capture }));
vi.mock("@/lib/plaid", () => ({
  decryptPlaidAccessToken: mocks.decrypt,
  removeItem: mocks.remove,
  PlaidIntegrationError: class extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) { super(message); this.code = code; }
  },
}));
import { DELETE } from "../route";
import { PlaidIntegrationError } from "@/lib/plaid";
const request = () => new NextRequest("http://localhost/api/auth/account", { method: "DELETE" });

describe("account deletion provider revocation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockReturnValue({ sub: "owner" });
    mocks.find.mockResolvedValue([{ id: "one", accessTokenEncrypted: "encrypted-one" },
      { id: "two", accessTokenEncrypted: "encrypted-two" }]);
    mocks.decrypt.mockImplementation((value) => value.replace("encrypted", "synthetic-token"));
    mocks.remove.mockResolvedValue(undefined);
    mocks.deleteData.mockResolvedValue(undefined);
  });

  it("does not access any records without authentication", async () => {
    mocks.auth.mockImplementation(() => { throw new Error("unauthorized"); });
    expect((await DELETE(request())).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("only deletes local data after all owned Items are revoked", async () => {
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.find).toHaveBeenCalledWith({ where: { userId: "owner" } });
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.deleteData).toHaveBeenCalledWith("owner");
    expect(mocks.deleteData.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.remove.mock.invocationCallOrder[1]);
  });

  it("retains local data after a partial failure and allows an already-revoked Item on retry", async () => {
    mocks.remove.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("request contained synthetic-token-secret"));
    const failed = await DELETE(request());
    expect(failed.status).toBe(503);
    expect(await failed.json()).toMatchObject({ error: { code: "ACCOUNT_DELETION_RETRY_REQUIRED" } });
    expect(mocks.deleteData).not.toHaveBeenCalled();
    expect(mocks.capture.mock.calls[0][0].message).not.toContain("synthetic-token");
    mocks.remove.mockRejectedValueOnce(new PlaidIntegrationError("gone", { code: "ITEM_NOT_FOUND" }))
      .mockResolvedValueOnce(undefined);
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.deleteData).toHaveBeenCalledTimes(1);
  });

  it("retains the account when its stored token cannot be decrypted", async () => {
    mocks.decrypt.mockImplementation(() => { throw new Error("key unavailable"); });
    expect((await DELETE(request())).status).toBe(503);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteData).not.toHaveBeenCalled();
  });

  it("allows manual-only users to delete without provider calls", async () => {
    mocks.find.mockResolvedValue([]);
    expect((await DELETE(request())).status).toBe(200);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleteData).toHaveBeenCalledWith("owner");
  });
});
