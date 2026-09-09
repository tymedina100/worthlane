import { describe, expect, it } from "vitest";
import { debtPlanEntrySchema } from "../debt";
const debt = { id: "test", name: "Card", balanceMinor: 10000, minimumPaymentMinor: 1000, aprBasisPoints: 1200 };
const reference = { source: "USER_REVIEWED_PLAID_LIABILITIES", retrievedAt: "2026-09-08T12:00:00.000Z", reviewedAt: "2026-09-08T12:05:00.000Z" };
describe("debt review references", () => {
  it("keeps legacy manual debts valid and accepts a bounded user review reference", () => {
    expect(debtPlanEntrySchema.parse(debt).bankReference).toBeUndefined();
    expect(debtPlanEntrySchema.parse({ ...debt, bankReference: reference }).bankReference).toEqual(reference);
  });
  it("rejects provider-verification claims, raw extra fields and malformed timestamps", () => {
    for (const bankReference of [{ ...reference, source: "VERIFIED_BY_BANK" }, { ...reference, accessToken: "synthetic" }, { ...reference, reviewedAt: "yesterday" }]) {
      expect(debtPlanEntrySchema.safeParse({ ...debt, bankReference }).success).toBe(false);
    }
  });
});
