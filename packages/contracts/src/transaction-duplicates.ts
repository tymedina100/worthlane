import { z } from "zod";

const reviewEntrySchema = z.object({
  id: z.string(), updatedAt: z.string().datetime(), amount: z.number().finite(),
  date: z.string().datetime(), merchantName: z.string().nullable(), accountName: z.string(),
}).strict();
export const transactionDuplicatesSchema = z.object({
  entries: z.array(z.object({ manual: reviewEntrySchema, bankMatches: z.array(reviewEntrySchema), moreMatches: z.boolean() }).strict()),
  nextCursor: z.string().nullable(), reviewedCount: z.number().int().nonnegative(),
}).strict();
export type TransactionDuplicates = z.infer<typeof transactionDuplicatesSchema>;
export const confirmTransactionDuplicateSchema = z.object({
  manualId: z.string().min(1).max(191), bankId: z.string().min(1).max(191),
  manualUpdatedAt: z.string().datetime(), bankUpdatedAt: z.string().datetime(),
}).strict();
