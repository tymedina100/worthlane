import { z } from "zod";
import type { Prisma } from "@worthlane/db";

export const spendingWhere: Prisma.TransactionWhereInput = {
  OR: [
    { spendingTreatment: "AUTO", amount: { gt: 0 } },
    { spendingTreatment: "REFUND", amount: { lt: 0 } },
  ],
};
export const incomeWhere: Prisma.TransactionWhereInput = {
  spendingTreatment: "AUTO", amount: { lt: 0 },
};

export const spendingTreatmentSchema = z.enum(["AUTO", "REFUND", "EXCLUDED"]);

export function validSpendingTreatment(amount: number, treatment: string): boolean {
  return treatment !== "REFUND" || amount < 0;
}
