import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), save: vi.fn(), update: vi.fn(), sync: vi.fn(), refresh: vi.fn(), apply: vi.fn() }));
vi.mock("@worthlane/db", () => ({ PlaidItemStatus: { ERROR: "ERROR" }, prisma: { plaidItem: { update: mocks.update } } }));
vi.mock("../plaid", () => ({
  decryptPlaidAccessToken: () => "synthetic", getAccountSnapshot: mocks.snapshot,
  syncTransactions: mocks.sync, refreshTransactions: mocks.refresh,
  PlaidIntegrationError: class extends Error { code: string; constructor(message: string, options: { code: string }) { super(message); this.code = options.code; } },
}));
vi.mock("../plaid-accounts", () => ({ savePlaidAccounts: mocks.save }));
vi.mock("../plaid-reconciliation", () => ({ applyPlaidSyncBatch: mocks.apply }));
vi.mock("../recurring", () => ({ detectRecurringForUser: vi.fn() }));
vi.mock("../sentry", () => ({ captureServerException: vi.fn() }));
import { syncPlaidItemRecord } from "../plaid-sync";
const item = { id: "item", userId: "owner", itemId: "provider-item", institution: "Synthetic brokerage", accessTokenEncrypted: "encrypted", syncCursor: null };
const accounts = [{ account_id: "investment", type: "investment", balances: { current: 1500 } }];
beforeEach(() => {
  vi.clearAllMocks(); mocks.save.mockResolvedValue(new Map([["investment", "local-account"]])); mocks.update.mockResolvedValue({});
  mocks.sync.mockResolvedValue({ added: [], modified: [], removed: [], next_cursor: "cursor", has_more: false });
});
describe("investment-only sync", () => {
  it("persists balances without initializing transaction products, even on forced refresh", async () => {
    mocks.snapshot.mockResolvedValue({ accounts, products: ["investments"] });
    expect(await syncPlaidItemRecord(item, { refresh: true })).toEqual({ plaidItemId: "item", added: 0, modified: 0, removed: 0 });
    expect(mocks.save).toHaveBeenCalledWith(item, accounts);
    expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled(); expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ transactionHistoryStatus: "INVESTMENT_BALANCES_ONLY", status: "HEALTHY" }) }));
  });
  it("preserves spending sync for a mixed-product connection", async () => {
    mocks.snapshot.mockResolvedValue({ accounts, products: ["investments", "transactions"] });
    await syncPlaidItemRecord(item);
    expect(mocks.sync).toHaveBeenCalled(); expect(mocks.apply).toHaveBeenCalled();
  });
  it("does not initialize an unconsented product when provider metadata has none", async () => {
    mocks.snapshot.mockResolvedValue({ accounts, products: [] });
    await expect(syncPlaidItemRecord(item)).rejects.toThrow("no supported data product");
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
