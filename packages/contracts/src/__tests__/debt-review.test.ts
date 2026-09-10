import { describe, expect, it } from "vitest";
import { reviewedBankDebt } from "../debt-review";
const input = { id: "reviewed", name: "Card", balance: "123.45", minimum: "12.34", apr: "19.99", statement: "100.01", due: "2026-09-30", confirmed: true, currency: "USD", bankCurrency: "USD", retrievedAt: "2026-09-08T12:00:00.000Z", reviewedAt: "2026-09-08T12:05:00.000Z" };
describe("reviewed bank debt", () => {
  it("copies exact cents and review metadata without losing distinct balances", () => {
    expect(reviewedBankDebt(input)).toMatchObject({ balanceMinor: 12345, minimumPaymentMinor: 1234, aprBasisPoints: 1999, statementBalanceMinor: 10001, dueDate: "2026-09-30", bankReference: { source: "USER_REVIEWED_PLAID_LIABILITIES", retrievedAt: input.retrievedAt, reviewedAt: input.reviewedAt } });
  });
  it("requires confirmation, matching currency and explicit required financial inputs", () => {
    for (const change of [{ confirmed: false }, { bankCurrency: null }, { bankCurrency: "CAD" }, { balance: "" }, { minimum: "" }, { apr: "" }, { balance: "-1" }, { minimum: "1.001" }, { due: "2026-02-30" }]) expect(() => reviewedBankDebt({ ...input, ...change })).toThrow();
  });
  it("preserves missing optional fields and permits a confirmed zero APR", () => {
    expect(reviewedBankDebt({ ...input, statement: "", due: "", apr: "0" })).toMatchObject({ statementBalanceMinor: null, dueDate: null, aprBasisPoints: 0 });
  });
});
