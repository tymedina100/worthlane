import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("rejects an unknown client platform", async () => {
    const response = await POST(request({ platform: "desktop", mode: "create" }));

    expect(response.status).toBe(400);
    expect(mockCreateLinkToken).not.toHaveBeenCalled();
  });
});
