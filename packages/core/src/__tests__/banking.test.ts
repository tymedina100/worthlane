import { expect, it } from "vitest";
import { bankDataNotice, bankHistoryStatus } from "../banking";

const now = new Date("2026-09-08T12:00:00Z");
const ready = { transactionHistoryStatus: "HISTORICAL_UPDATE_COMPLETE", lastSyncAt: now.toISOString(), status: "HEALTHY" };
it("does not infer complete history from an empty or successful sync", () => {
  expect(bankHistoryStatus(undefined)).toBe("UNKNOWN");
  expect(bankHistoryStatus("FUTURE_STATUS")).toBe("UNKNOWN");
  expect(bankDataNotice({ ...ready, transactionHistoryStatus: "UNKNOWN" }, now)).toContain("unconfirmed");
  expect(bankDataNotice({ ...ready, transactionHistoryStatus: "NOT_READY" }, now)).toContain("incomplete");
  expect(bankDataNotice({ ...ready, transactionHistoryStatus: "INITIAL_UPDATE_COMPLETE" }, now)).toContain("older history is still loading");
});
it("distinguishes retrieval age, connection failure and limited bank coverage", () => {
  expect(bankDataNotice(ready, now)).toContain("limited by your bank");
  expect(bankDataNotice({ ...ready, lastSyncAt: "2026-09-07T11:59:59Z" }, now)).toContain("past day");
  expect(bankDataNotice({ ...ready, lastSyncAt: null }, now)).toContain("incomplete");
  expect(bankDataNotice({ ...ready, status: "NEEDS_RELINK" }, now)).toContain("need attention");
});
