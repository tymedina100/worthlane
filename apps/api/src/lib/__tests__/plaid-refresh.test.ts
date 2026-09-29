import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(), apply: vi.fn(), update: vi.fn(), recurring: vi.fn(),
}));
vi.mock("@worthlane/db", () => ({
  PlaidItemStatus: { ERROR: "ERROR", NEEDS_RELINK: "NEEDS_RELINK", PENDING_EXPIRATION: "PENDING_EXPIRATION" },
  prisma: { plaidItem: { updateMany: mocks.update } },
}));
vi.mock("../plaid-accounts", () => ({ reconcilePlaidAccountSnapshot: mocks.save }));
vi.mock("../plaid-reconciliation", () => ({ applyPlaidSyncBatch: mocks.apply }));
vi.mock("../recurring", () => ({ detectRecurringForUser: mocks.recurring }));
vi.mock("../sentry", () => ({ captureServerException: vi.fn() }));

import { encryptPlaidAccessToken, plaidClient, refreshTransactions } from "../plaid";
import { syncPlaidItemRecord } from "../plaid-sync";

const token = "synthetic-access-token";
const transaction = { transaction_id: "new-transaction", account_id: "checking", amount: 12.34 };
const item = () => ({
  id: "owned-item", userId: "owner", itemId: "provider-item", institution: "Synthetic bank",
  accessTokenEncrypted: encryptPlaidAccessToken(token), syncCursor: "saved-cursor",
});
const providerError = (code: string) => ({ response: { data: { error_code: code } } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PLAID_ENV", "sandbox");
  vi.stubEnv("PLAID_TRANSACTIONS_REFRESH_ENABLED", "false");
  vi.stubEnv("PLAID_TOKEN_ENCRYPTION_KEY", "synthetic-only-test-encryption-key");
  mocks.save.mockResolvedValue({ accountMap: new Map([["checking", "local-checking"]]), consentRevision: 1 });
  mocks.apply.mockResolvedValue(undefined);
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.recurring.mockResolvedValue(undefined);
  vi.spyOn(plaidClient, "accountsGet").mockResolvedValue({ data: {
    accounts: [{ account_id: "checking", type: "depository", balances: { current: 100 } }],
    item: { products: ["transactions"] },
  } } as any);
  vi.spyOn(plaidClient, "transactionsRefresh").mockResolvedValue({ data: {} } as any);
  vi.spyOn(plaidClient, "transactionsSync").mockResolvedValue({ data: {
    added: [transaction], modified: [], removed: [], next_cursor: "next-cursor", has_more: false,
    transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
  } } as any);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function expectAvailableUpdatesSaved(record: ReturnType<typeof item>) {
  expect(plaidClient.transactionsSync).toHaveBeenCalledWith({
    access_token: token, cursor: "saved-cursor", options: { include_personal_finance_category: true },
  });
  expect(mocks.apply).toHaveBeenCalledWith({ ...record, consentRevision: 1 }, new Map([["checking", "local-checking"]]), {
    added: [transaction], modified: [], removed: [],
  }, "next-cursor", expect.any(Date), "HISTORICAL_UPDATE_COMPLETE");
}

describe("optional Transactions Refresh", () => {
  it.each([undefined, "false", "TRUE", "1"])(
    "retrieves available production transactions without a paid call when opt-in is %s",
    async (enabled) => {
      vi.stubEnv("PLAID_ENV", "production");
      vi.stubEnv("PLAID_TRANSACTIONS_REFRESH_ENABLED", enabled);
      const record = item();
      await expect(syncPlaidItemRecord(record, { refresh: true })).resolves.toEqual({
        plaidItemId: record.id, added: 1, modified: 0, removed: 0,
      });
      expect(plaidClient.transactionsRefresh).not.toHaveBeenCalled();
      expectAvailableUpdatesSaved(record);
    },
  );

  it("calls the production add-on only after an exact opt-in and an explicit refresh request", async () => {
    vi.stubEnv("PLAID_ENV", "production");
    vi.stubEnv("PLAID_TRANSACTIONS_REFRESH_ENABLED", "true");
    const record = item();
    await syncPlaidItemRecord(record, { refresh: true });
    expect(plaidClient.transactionsRefresh).toHaveBeenCalledOnce();
    expect(plaidClient.transactionsRefresh).toHaveBeenCalledWith({ access_token: token });
    expectAvailableUpdatesSaved(record);
  });

  it("does not force refresh during ordinary sync even when the add-on is enabled", async () => {
    vi.stubEnv("PLAID_ENV", "production");
    vi.stubEnv("PLAID_TRANSACTIONS_REFRESH_ENABLED", "true");
    const record = item();
    await syncPlaidItemRecord(record);
    expect(plaidClient.transactionsRefresh).not.toHaveBeenCalled();
    expectAvailableUpdatesSaved(record);
  });

  it.each(["sandbox", undefined])("preserves free Sandbox recovery refresh for environment %s", async (environment) => {
    vi.stubEnv("PLAID_ENV", environment);
    const record = item();
    await syncPlaidItemRecord(record, { refresh: true });
    expect(plaidClient.transactionsRefresh).toHaveBeenCalledWith({ access_token: token });
    expectAvailableUpdatesSaved(record);
  });

  it("does not allow an unknown environment to opt into a paid refresh", async () => {
    vi.stubEnv("PLAID_ENV", "prod");
    vi.stubEnv("PLAID_TRANSACTIONS_REFRESH_ENABLED", "true");
    await refreshTransactions(token);
    expect(plaidClient.transactionsRefresh).not.toHaveBeenCalled();
  });

  it.each(["PRODUCTS_NOT_SUPPORTED", "PRODUCT_NOT_ENABLED"])(
    "still retrieves scheduled updates when optional refresh returns %s", async (code) => {
      vi.mocked(plaidClient.transactionsRefresh).mockRejectedValue(providerError(code));
      const record = item();
      await syncPlaidItemRecord(record, { refresh: true });
      expectAvailableUpdatesSaved(record);
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["ITEM_LOGIN_REQUIRED", "NEEDS_RELINK", true],
    ["USER_PERMISSION_REVOKED", "NEEDS_RELINK", true],
    ["INSTITUTION_DOWN", "ERROR", false],
    ["ADDITIONAL_CONSENT_REQUIRED", "ERROR", false],
    ["INVALID_ACCESS_TOKEN", "ERROR", false],
    ["INTERNAL_SERVER_ERROR", "ERROR", false],
  ])("keeps a refresh failure %s visible instead of marking cached data healthy", async (code, status, needsRelink) => {
    vi.mocked(plaidClient.transactionsRefresh).mockRejectedValue(providerError(code as string));
    const record = item();
    await expect(syncPlaidItemRecord(record, { refresh: true })).rejects.toMatchObject({ code, needsRelink });
    expect(plaidClient.transactionsSync).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: record.id, consentRevision: 1 }, data: {
      status, needsRelink, errorCode: code, errorMessage: expect.any(String),
    } });
  });

  it("still records a relink error from normal sync when paid refresh is disabled", async () => {
    vi.stubEnv("PLAID_ENV", "production");
    vi.mocked(plaidClient.transactionsSync).mockRejectedValue(providerError("ITEM_LOGIN_REQUIRED"));
    const record = item();
    await expect(syncPlaidItemRecord(record, { refresh: true })).rejects.toMatchObject({
      code: "ITEM_LOGIN_REQUIRED", needsRelink: true,
    });
    expect(plaidClient.transactionsRefresh).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: "NEEDS_RELINK", needsRelink: true, errorCode: "ITEM_LOGIN_REQUIRED",
    }) }));
  });
});
