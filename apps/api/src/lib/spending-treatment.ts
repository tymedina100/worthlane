import { z } from "zod";

export const spendingTreatmentSchema = z.enum(["AUTO", "REFUND", "EXCLUDED"]);

export function validSpendingTreatment(amount: number, treatment: string): boolean {
  return treatment !== "REFUND" || amount < 0;
}
