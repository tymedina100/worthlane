import { assertMinorUnits } from "./money";

export interface BudgetProgress {
  amountMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentUsed: number;
}

export function calculateBudgetProgress(
  amountMinor: number,
  spentMinor: number
): BudgetProgress {
  assertMinorUnits(amountMinor, "budget amount");
  assertMinorUnits(spentMinor, "spent amount");
  if (amountMinor < 0) throw new Error("budget amount cannot be negative");
  if (spentMinor < 0) throw new Error("spent amount cannot be negative");

  return {
    amountMinor,
    spentMinor,
    remainingMinor: amountMinor - spentMinor,
    percentUsed: amountMinor > 0 ? (spentMinor / amountMinor) * 100 : 0,
  };
}
