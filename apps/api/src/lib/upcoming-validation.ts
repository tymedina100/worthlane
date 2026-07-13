import { RecurringFrequency, UpcomingObligationType } from "@worthlane/db";
import { z } from "zod";
import { positiveMoneyAmount } from "@/lib/validation";
import { parseDateOnly } from "@/lib/upcoming";

const dateOnly = z.string().refine((value) => {
  try {
    parseDateOnly(value);
    return true;
  } catch {
    return false;
  }
}, "Expected a valid YYYY-MM-DD date");

export const upcomingInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: positiveMoneyAmount,
  dueDate: dateOnly,
  type: z.nativeEnum(UpcomingObligationType).default(UpcomingObligationType.BILL),
  frequency: z.nativeEnum(RecurringFrequency).nullable().optional(),
  accountName: z.string().trim().max(120).nullable().optional(),
  reminderTiming: z.enum(["DUE_DATE", "ONE_DAY_BEFORE", "THREE_DAYS_BEFORE", "NONE"]).nullable().optional(),
  isActive: z.boolean().optional(),
});
