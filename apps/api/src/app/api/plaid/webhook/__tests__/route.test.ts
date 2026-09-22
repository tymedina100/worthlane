import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isPlaidSandbox: vi.fn(),
  verifyPlaidWebhook: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  syncPlaidItemRecord: vi.fn(),
  captureServerException: vi.fn(),
}));

vi.mock("@worthlane/db", () => ({
  PlaidItemStatus: {
    HEALTHY: "HEALTHY",
    ERROR: "ERROR",
    NEEDS_RELINK: "NEEDS_RELINK",
    PENDING_EXPIRATION: "PENDING_EXPIRATION",
  },
  prisma: { plaidItem: { findUnique: mocks.findUnique, update: mocks.update } },
}));
vi.mock("@/lib/plaid", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/plaid")>(),
  isPlaidSandbox: mocks.isPlaidSandbox,
  verifyPlaidWebhook: mocks.verifyPlaidWebhook,
}));
vi.mock("@/lib/plaid-sync", () => ({ syncPlaidItemRecord: mocks.syncPlaidItemRecord }));
vi.mock("@/lib/sentry", () => ({ captureServerException: mocks.captureServerException }));

import { POST } from "../route";

const savedItem = {
  id: "connection-1",
  itemId: "provider-item-1",
  userId: "owner-1",
  institution: "Sandbox bank",
  accessTokenEncrypted: "encrypted-test-placeholder",
  syncCursor: "existing-cursor",
  status: "NEEDS_RELINK",
  needsRelink: true,
  errorCode: "ITEM_LOGIN_REQUIRED",
  errorMessage: "Please reconnect.",
  lastSyncAt: new Date("2026-01-01T00:00:00Z"),
};
let persistedItem: Record<string, unknown>;

function request(body: unknown, signature: string | null = "test-signature") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== null) headers["plaid-verification"] = signature;
  return new NextRequest("http://localhost/api/plaid/webhook", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function notification(webhookCode: string, webhookType = "ITEM", extra = {}) {
  return {
    webhook_type: webhookType,
    webhook_code: webhookCode,
    item_id: savedItem.itemId,
    ...extra,
  };
}

function expectOnlyReceiptRecorded(baseline = savedItem) {
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: savedItem.id },
    data: { lastWebhookAt: expect.any(Date) },
  });
  expect(persistedItem).toEqual({ ...baseline, lastWebhookAt: expect.any(Date) });
  expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
}

describe("POST /api/plaid/webhook", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    persistedItem = { ...savedItem };
    mocks.isPlaidSandbox.mockReturnValue(false);
    mocks.verifyPlaidWebhook.mockResolvedValue(true);
    mocks.findUnique.mockResolvedValue(savedItem);
    mocks.update.mockImplementation(async ({ where, data }) => {
      // A webhook must only affect the saved Item selected by provider item_id.
      expect(where).toEqual({ id: savedItem.id });
      Object.assign(persistedItem, data);
      return { ...persistedItem };
    });
    mocks.syncPlaidItemRecord.mockResolvedValue(undefined);
  });

  it.each([null, "invalid-signature"])("rejects production signature %s before accessing Items", async signature => {
    mocks.verifyPlaidWebhook.mockResolvedValue(false);
    const rawBody = JSON.stringify(notification("LOGIN_REPAIRED"));
    const response = await POST(request(rawBody, signature));
    expect(response.status).toBe(401);
    expect(mocks.verifyPlaidWebhook).toHaveBeenCalledWith(rawBody, signature);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
  });

  it("verifies the unchanged raw body and does not return stored Item data", async () => {
    const rawBody = ` {\n "webhook_type": "ITEM", "webhook_code": "LOGIN_REPAIRED", "item_id": "${savedItem.itemId}"\n} `;
    const response = await POST(request(rawBody));
    expect(mocks.verifyPlaidWebhook).toHaveBeenCalledWith(rawBody, "test-signature");
    expect(await response.json()).toEqual({ data: { received: true } });
  });

  it("allows unsigned local Sandbox notifications but still rejects an invalid supplied signature", async () => {
    mocks.isPlaidSandbox.mockReturnValue(true);
    expect((await POST(request(notification("LOGIN_REPAIRED"), null))).status).toBe(200);
    expect(mocks.verifyPlaidWebhook).not.toHaveBeenCalled();
    mocks.findUnique.mockClear();
    mocks.update.mockClear();
    mocks.verifyPlaidWebhook.mockResolvedValue(false);
    expect((await POST(request(notification("LOGIN_REPAIRED"), "invalid"))).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each(["not-json", "null", "{}"])("ignores a verified unusable payload: %s", async body => {
    expect(await (await POST(request(body))).json()).toEqual({ data: { received: true, ignored: true } });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("acknowledges a removed or unknown Item without creating or syncing it", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await POST(request(notification("LOGIN_REPAIRED")));
    expect(await response.json()).toEqual({ data: { received: true, ignored: true } });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
  });

  it("clears a repaired Item's login warning without claiming fresh synced data", async () => {
    await POST(request(notification("LOGIN_REPAIRED", "ITEM", { user_id: "unrelated-provider-user" })));
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { itemId: savedItem.itemId } });
    expect(persistedItem).toEqual({
      ...savedItem,
      status: "HEALTHY",
      needsRelink: false,
      errorCode: null,
      errorMessage: null,
      lastWebhookAt: expect.any(Date),
    });
    expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
  });

  it.each(["NEW_ACCOUNTS_AVAILABLE", "WEBHOOK_UPDATE_ACKNOWLEDGED", "FUTURE_ITEM_EVENT"])(
    "records informational %s without changing the current connection status",
    async code => {
      const healthyItem = { ...savedItem, status: "HEALTHY", needsRelink: false };
      persistedItem = { ...healthyItem };
      mocks.findUnique.mockResolvedValue(healthyItem);
      await POST(request(notification(code, "ITEM", { error: null })));
      expectOnlyReceiptRecorded(healthyItem);
    }
  );

  it.each(["LOGIN_REPAIRED", "PENDING_EXPIRATION", "PENDING_DISCONNECT", "ERROR", "USER_PERMISSION_REVOKED", "USER_ACCOUNT_REVOKED"])(
    "does not interpret %s as an Item event under a different webhook type",
    async code => {
      await POST(request(notification(code, "TRANSACTIONS")));
      expectOnlyReceiptRecorded();
    }
  );

  it.each(["PENDING_EXPIRATION", "PENDING_DISCONNECT"])("warns about documented ITEM/%s before access ends", async code => {
    await POST(request(notification(code)));
    expect(persistedItem).toMatchObject({
      status: "PENDING_EXPIRATION",
      needsRelink: true,
      errorCode: code,
      lastSyncAt: savedItem.lastSyncAt,
    });
    expect(persistedItem.errorMessage).toMatch(/soon/);
    expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
  });

  it("retains the provider error for an ITEM/ERROR login failure", async () => {
    await POST(request(notification("ERROR", "ITEM", {
      error: { error_code: "ITEM_LOGIN_REQUIRED", error_message: "Reconnect your bank." },
    })));
    expect(persistedItem).toMatchObject({
      status: "NEEDS_RELINK", needsRelink: true,
      errorCode: "ITEM_LOGIN_REQUIRED", errorMessage: "Reconnect your bank.",
    });
  });

  it.each(["INSTITUTION_DOWN", "INSTITUTION_NOT_RESPONDING", "INTERNAL_SERVER_ERROR"])(
    "does not ask the user to repair credentials for %s", async code => {
      await POST(request(notification("ERROR", "ITEM", { error: { error_code: code } })));
      expect(persistedItem).toMatchObject({ status: "ERROR", needsRelink: false, errorCode: code,
        lastSyncAt: savedItem.lastSyncAt, syncCursor: savedItem.syncCursor });
      expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
    }
  );

  it.each(["USER_PERMISSION_REVOKED", "USER_ACCOUNT_REVOKED"])("keeps ITEM/%s actionable", async code => {
    await POST(request(notification(code)));
    expect(persistedItem).toMatchObject({ status: "NEEDS_RELINK", needsRelink: true, errorCode: code });
    expect(mocks.syncPlaidItemRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["TRANSACTIONS", "SYNC_UPDATES_AVAILABLE"],
    ["HOLDINGS", "DEFAULT_UPDATE"],
  ])("syncs the stored owner Item for %s/%s", async (type, code) => {
    await POST(request(notification(code, type, { user_id: "different-user" })));
    expect(mocks.syncPlaidItemRecord).toHaveBeenCalledTimes(1);
    expect(mocks.syncPlaidItemRecord).toHaveBeenCalledWith({ ...savedItem, lastWebhookAt: expect.any(Date) });
  });

  it.each([
    ["ITEM", "SYNC_UPDATES_AVAILABLE"],
    ["TRANSACTIONS", "DEFAULT_UPDATE"],
  ])("does not sync an unrelated %s/%s notification", async (type, code) => {
    await POST(request(notification(code, type)));
    expectOnlyReceiptRecorded();
  });

  it("leaves sync failure status to the shared service without overwriting it as healthy", async () => {
    const failure = new Error("test sync failed");
    mocks.syncPlaidItemRecord.mockRejectedValue(failure);
    expect((await POST(request(notification("DEFAULT_UPDATE", "HOLDINGS")))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(persistedItem.status).toBe(savedItem.status);
    expect(mocks.captureServerException).toHaveBeenCalledWith(failure, expect.any(Object));
  });
});
