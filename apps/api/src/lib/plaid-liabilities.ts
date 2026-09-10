import type { LiabilitiesGetResponse } from "plaid";
import { liabilitySnapshotSchema, type LiabilitySnapshot } from "@worthlane/contracts";
type OwnedAccount = { id: string; plaidAccountId: string | null; name: string };
const cents = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100);
  return Number.isSafeInteger(rounded) && Math.abs(value * 100 - rounded) < 1e-6 ? rounded : null;
};
const dateOnly = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
export function liabilitySnapshot(payload: LiabilitiesGetResponse, owned: OwnedAccount[], retrievedAt: Date): LiabilitySnapshot {
  const debts: LiabilitySnapshot["debts"] = [];
  function base(providerId: string | null, kind: LiabilitySnapshot["debts"][number]["kind"]) {
    const local = owned.find(account => account.plaidAccountId && account.plaidAccountId === providerId);
    const account = payload.accounts.find(account => account.account_id === providerId);
    if (!local || !account) return null;
    return { accountId: local.id, name: local.name, kind, currency: account.balances.iso_currency_code ?? null,
      currentBalanceMinor: cents(account.balances.current), statementBalanceMinor: null, minimumPaymentMinor: null,
      nextPaymentMinor: null, outstandingInterestMinor: null, notes: [], dueDate: null, rates: [] } as LiabilitySnapshot["debts"][number];
  }
  const rate = (kind: string, percentage: number | null | undefined, balance?: number | null) =>
    percentage != null && Number.isFinite(percentage) && percentage >= 0 ? [{ kind, percentage, balanceSubjectToRateMinor: cents(balance) }] : [];
  for (const card of payload.liabilities.credit ?? []) {
    const debt = base(card.account_id, "CREDIT_CARD"); if (!debt) continue;
    debts.push({ ...debt, statementBalanceMinor: cents(card.last_statement_balance), minimumPaymentMinor: cents(card.minimum_payment_amount), dueDate: dateOnly(card.next_payment_due_date),
      rates: card.aprs.flatMap(apr => rate(apr.apr_type, apr.apr_percentage, apr.balance_subject_to_apr)) });
  }
  for (const mortgage of payload.liabilities.mortgage ?? []) {
    const debt = base(mortgage.account_id, "MORTGAGE"); if (!debt) continue;
    debts.push({ ...debt, nextPaymentMinor: cents(mortgage.next_monthly_payment), dueDate: dateOnly(mortgage.next_payment_due_date), rates: rate(`interest_${mortgage.interest_rate.type ?? "unknown"}`, mortgage.interest_rate.percentage) });
  }
  for (const student of payload.liabilities.student ?? []) {
    const debt = base(student.account_id, "STUDENT_LOAN"); if (!debt) continue;
    debts.push({ ...debt, statementBalanceMinor: cents("last_statement_balance" in student && typeof student.last_statement_balance === "number" ? student.last_statement_balance : null), outstandingInterestMinor: cents(student.outstanding_interest_amount), notes: ["Some servicers repeat one combined minimum across several loans. Confirm the payment grouping before adding minimums together. Current balance may exclude accrued interest; confirm the payoff balance."], minimumPaymentMinor: cents(student.minimum_payment_amount), dueDate: dateOnly(student.next_payment_due_date), rates: rate("interest", student.interest_rate_percentage) });
  }
  return liabilitySnapshotSchema.parse({ source: "PLAID_LIABILITIES", retrievedAt: retrievedAt.toISOString(),
    notice: "Retrieved from Plaid; institution data may be cached or incomplete. Missing fields remain unknown. Confirm dates and amounts against your statement before saving a plan or reminder. Multiple rates are not combined into one APR.", debts });
}
