import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockCreateLinkToken,
  mockCaptureServerEvent,
  mockGetAuthUser,
  mockPlaidItemFindFirst,
} = vi.hoisted(() => ({
  mockCreateLinkToken: vi.fn(),
  mockCaptureServerEvent: vi.fn(),
  mockGetAuthUser: vi.fn(),
  mockPlaidItemFindFirst: vi.fn(),
}));

vi.mock("@worthlane/db", () => ({
  prisma: { plaidItem: { findFirst: mockPlaidItemFindFirst } },
}));
vi.mock("@/lib/auth", () => ({ getAuthUser: mockGetAuthUser }));
vi.mock("@/lib/posthog", () => ({ captureServerEvent: mockCaptureServerEvent }));
vi.mock("@/lib/sentry", () => ({ captureServerException: vi.fn() }));
vi.mock("@/lib/plaid", () => ({
  createLinkToken: mockCreateLinkToken,
  decryptPlaidAccessToken: vi.fn(),
  PlaidIntegrationError: class PlaidIntegrationError extends Error {},
}));

import { POST } from "../route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/plaid/link-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/plaid/link-token", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockReturnValue({ sub: "user-1", email: "user@example.com" });
    mockCreateLinkToken.mockResolvedValue("link-sandbox-123");
    mockCaptureServerEvent.mockResolvedValue(undefined);
  });

  it("creates a web Link token without exposing Plaid credentials", async () => {
    const response = await POST(request({ platform: "web", mode: "create" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateLinkToken).toHaveBeenCalledWith("user-1", {
      platform: "web",
      mode: "create",
      accessToken: undefined,
    });
    expect(payload).toEqual({ data: { linkToken: "link-sandbox-123" } });
    expect(JSON.stringify(payload)).not.toContain("PLAID_SECRET");
  });

  it("passes an explicit investment purpose and rejects unknown purposes", async () => {
    expect((await POST(request({ platform: "web", mode: "create", purpose: "investments" }))).status).toBe(200);
    expect(mockCreateLinkToken).toHaveBeenCalledWith("user-1", expect.objectContaining({ purpose: "investments" }));
    mockCreateLinkToken.mockClear();
    expect((await POST(request({ platform: "web", mode: "create", purpose: "trading" }))).status).toBe(400);
    expect(mockCreateLinkToken).not.toHaveBeenCalled();
  });
  it.each([undefined, "banking", "investments"])("preserves owned investment repair scope despite client purpose %s", async purpose => {
    mockPlaidItemFindFirst.mockResolvedValue({ accessTokenEncrypted: "encrypted", transactionHistoryStatus: "INVESTMENT_BALANCES_ONLY" });
    const response = await POST(request({ platform: "ios", mode: "update", plaidItemId: "owned", purpose }));
    expect(response.status).toBe(200);
    expect(mockPlaidItemFindFirst).toHaveBeenCalledWith({ where: { id: "owned", userId: "user-1" } });
    expect(mockCreateLinkToken).toHaveBeenCalledWith("user-1", expect.objectContaining({ mode: "update", purpose: "investments" }));
  });
  it("cannot change a banking connection to investment scope during repair", async () => {
    mockPlaidItemFindFirst.mockResolvedValue({ accessTokenEncrypted: "encrypted", transactionHistoryStatus: "HISTORICAL_UPDATE_COMPLETE" });
    await POST(request({ platform: "web", mode: "update", plaidItemId: "owned", purpose: "investments" }));
    expect(mockCreateLinkToken).toHaveBeenCalledWith("user-1", expect.objectContaining({ purpose: "banking" }));
  });
  it("does not issue a repair token for another owner's connection", async () => {
    mockPlaidItemFindFirst.mockResolvedValue(null);
    expect((await POST(request({ platform: "web", mode: "update", plaidItemId: "other" }))).status).toBe(404);
    expect(mockCreateLinkToken).not.toHaveBeenCalled();
  });
  it("does not expose server configuration details to the client", async () => {
    mockCreateLinkToken.mockRejectedValueOnce(new Error("PLAID_SECRET internal detail"));
    const response = await POST(request({ platform: "web", mode: "create" }));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("PLAID_SECRET");
  });
  it("rejects an unknown client platform", async () => {
    const response = await POST(request({ platform: "desktop", mode: "create" }));

    expect(response.status).toBe(400);
    expect(mockCreateLinkToken).not.toHaveBeenCalled();
  });
  it("gates non-Sandbox debt consent without changing ordinary Link", async () => {
    vi.stubEnv("PLAID_ENV", "production"); vi.stubEnv("PLAID_LIABILITIES_ENABLED", "false");
    expect((await POST(request({ platform: "web", mode: "create", includeLiabilities: true }))).status).toBe(503);
    expect(mockCreateLinkToken).not.toHaveBeenCalled();
    expect((await POST(request({ platform: "web", mode: "create" }))).status).toBe(200);
  });

});
