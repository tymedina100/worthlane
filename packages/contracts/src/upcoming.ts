import { z } from "zod";
const date = z.string().refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a valid YYYY-MM-DD date");
export const upcomingInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.number().finite().positive().max(9_999_999_999.99).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6),
  dueDate: date,
  type: z.enum(["BILL", "CREDIT_CARD", "SUBSCRIPTION", "OTHER"]).default("BILL"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).nullable().optional(),
  accountName: z.string().trim().max(120).nullable().optional(),
  reminderTiming: z.enum(["DUE_DATE", "ONE_DAY_BEFORE", "THREE_DAYS_BEFORE", "NONE"]).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

const expectedUpdatedAt = z.string().datetime();
export const upcomingEditSchema = upcomingInputSchema.partial().extend({ expectedUpdatedAt });
export const upcomingActionSchema = z.object({ action: z.enum(["markPaid", "markUnpaid"]), expectedUpdatedAt }).strict();
