import { z } from "zod";
const cents = z.number().int().min(0).max(999_999_999_999);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");
const rate = z.number().int().min(0).max(100_000);
export const debtPlanInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  strategy: z.enum(["AVALANCHE", "SNOWBALL"]),
  monthlyPaymentMinor: cents,
  debts: z.array(z.object({
    id: z.string().min(1).max(100), name: z.string().trim().min(1).max(100),
    balanceMinor: cents, minimumPaymentMinor: cents, aprBasisPoints: rate,
    statementBalanceMinor: cents.nullable().default(null),
    dueDate: date.nullable().default(null),
    promotion: z.object({ aprBasisPoints: rate, expiresOn: date }).strict().optional(),
  }).strict()).min(1).max(100),
}).strict().refine(input => new Set(input.debts.map(debt => debt.id)).size === input.debts.length, "Debt IDs must be unique");
export type DebtPlanInput = z.infer<typeof debtPlanInputSchema>;
