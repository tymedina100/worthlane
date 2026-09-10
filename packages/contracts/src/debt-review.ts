import { debtPlanEntrySchema } from "./debt";

/** User-confirmed estimate inputs, never a claim that the lender verified them. */
export function reviewedBankDebt(input: {
  id: string; name: string; balance: string; minimum: string; apr: string;
  statement: string; due: string; confirmed: boolean;
  currency: string; bankCurrency: string | null; retrievedAt: string; reviewedAt: string;
}) {
  if (input.bankCurrency !== input.currency) throw new Error("Currency does not match this plan. Enter confirmed amounts manually.");
  if (!input.confirmed) throw new Error("Confirm the figures before copying.");
  const minor = (value: string) => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error("Enter nonnegative amounts and APR with at most two decimal places.");
    return Math.round(Number(value) * 100);
  };
  return debtPlanEntrySchema.parse({
    id: input.id, name: input.name, balanceMinor: minor(input.balance),
    minimumPaymentMinor: minor(input.minimum), aprBasisPoints: minor(input.apr),
    statementBalanceMinor: input.statement ? minor(input.statement) : null,
    dueDate: input.due || null,
    bankReference: { source: "USER_REVIEWED_PLAID_LIABILITIES", retrievedAt: input.retrievedAt, reviewedAt: input.reviewedAt },
  });
}
