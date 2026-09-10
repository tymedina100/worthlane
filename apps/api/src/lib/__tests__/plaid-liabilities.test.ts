import { describe, expect, it } from "vitest";
import type { LiabilitiesGetResponse } from "plaid";
import { liabilitySnapshot } from "../plaid-liabilities";
const owned = [{ id: "local", plaidAccountId: "provider", name: "My card" }];
function payload(liabilities: unknown, current: number | null = 100) {
  return { accounts: [{ account_id: "provider", balances: { current, iso_currency_code: "USD" }, account_number: "DO_NOT_EXPORT" }], liabilities, item: { access_token: "DO_NOT_EXPORT" } } as unknown as LiabilitiesGetResponse;
}
const at = new Date("2026-09-08T12:00:00Z");
describe("liability snapshot allowlist", () => {
  it("keeps card amounts and multiple rates separate without exposing identifiers or extra fields", () => {
    const result = liabilitySnapshot(payload({ credit: [{ account_id: "provider", last_statement_balance: 80, minimum_payment_amount: 12.34, next_payment_due_date: "2026-09-30", aprs: [{ apr_type: "purchase_apr", apr_percentage: 19.99, balance_subject_to_apr: 75 }, { apr_type: "special", apr_percentage: 0, balance_subject_to_apr: 25 }] }] }), owned, at);
    expect(result.debts[0]).toMatchObject({ accountId: "local", currentBalanceMinor: 10000, statementBalanceMinor: 8000, minimumPaymentMinor: 1234, dueDate: "2026-09-30", nextPaymentMinor: null });
    expect(result.debts[0].rates).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain("DO_NOT_EXPORT");
    expect(JSON.stringify(result)).not.toContain('"provider"');
  });
  it("preserves missing fields, rejects invalid calendar dates, and filters unknown account ownership", () => {
    const data = payload({ credit: [{ account_id: "provider", last_statement_balance: null, minimum_payment_amount: null, next_payment_due_date: "2026-02-30", aprs: [] }, { account_id: "stranger", aprs: [] }] }, null);
    const result = liabilitySnapshot(data, owned, at);
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0]).toMatchObject({ currentBalanceMinor: null, minimumPaymentMinor: null, statementBalanceMinor: null, dueDate: null });
    expect(liabilitySnapshot(data, [], at).debts).toEqual([]);
  });
  it("distinguishes mortgage next payments and student accrued interest/grouped-payment caveats", () => {
    const mortgage = liabilitySnapshot(payload({ mortgage: [{ account_id: "provider", next_monthly_payment: 500, interest_rate: { percentage: 5, type: "fixed" }, next_payment_due_date: "2026-10-01" }] }), owned, at).debts[0];
    expect(mortgage).toMatchObject({ nextPaymentMinor: 50000, minimumPaymentMinor: null, statementBalanceMinor: null });
    const student = liabilitySnapshot(payload({ student: [{ account_id: "provider", minimum_payment_amount: 0, outstanding_interest_amount: 23.45, interest_rate_percentage: 4, next_payment_due_date: null }] }), owned, at).debts[0];
    expect(student).toMatchObject({ minimumPaymentMinor: 0, outstandingInterestMinor: 2345, statementBalanceMinor: null, dueDate: null });
    expect(student.notes[0]).toContain("combined minimum");
  });
});
