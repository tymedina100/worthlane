import { z } from "zod";
const money = z.number().int().safe().nullable();
export const liabilitySnapshotSchema = z.object({
  source: z.literal("PLAID_LIABILITIES"),
  retrievedAt: z.string().datetime(),
  notice: z.string(),
  debts: z.array(z.object({
    accountId: z.string(), name: z.string(), kind: z.enum(["CREDIT_CARD", "MORTGAGE", "STUDENT_LOAN"]),
    currency: z.string().nullable(), currentBalanceMinor: money, statementBalanceMinor: money,
    outstandingInterestMinor: money, notes: z.array(z.string()), minimumPaymentMinor: money, nextPaymentMinor: money, dueDate: z.string().nullable(),
    rates: z.array(z.object({ kind: z.string(), percentage: z.number().finite(), balanceSubjectToRateMinor: money })),
  })),
});
export type LiabilitySnapshot = z.infer<typeof liabilitySnapshotSchema>;
