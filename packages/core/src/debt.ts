import { assertMinorUnits } from "./money";

export const DEBT_ESTIMATE_ASSUMPTIONS = [
  "Payments occur at month end; entered minimums stay fixed until a debt is paid off.",
  "Interest uses the beginning balance and APR divided by 12, rounded to cents. Actual lender calculations may differ.",
  "Promotional expiry prorates that month's APR by calendar days. Deferred-interest offers are not modeled.",
  "No new purchases, fees, missed payments or unentered rate changes are included.",
  "The monthly budget stays constant, with paid-off debt payments available for remaining debts.",
] as const;

export interface DebtInput {
  id: string;
  balanceMinor: number;
  minimumPaymentMinor: number;
  aprBasisPoints: number;
  /** Promotional APR applies before this calendar date; ordinary APR applies on it. */
  promotion?: { aprBasisPoints: number; expiresOn: string };
}
export interface DebtMonth {
  month: string;
  interestMinor: number;
  paymentMinor: number;
  remainingMinor: number;
  debts: Array<{ id: string; interestMinor: number; paymentMinor: number; remainingMinor: number }>;
}
export interface DebtEstimate {
  status: "PAID_OFF" | "INSUFFICIENT_PAYMENT" | "HORIZON_REACHED";
  payoffMonth: string | null;
  totalInterestMinor: number;
  totalPaidMinor: number;
  shortfallMinor: number;
  warnings: string[];
  schedule: DebtMonth[];
}

function calendarDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return date;
}
function nonnegative(value: number, label: string) {
  assertMinorUnits(value, label);
  if (value < 0) throw new Error(`${label} must not be negative`);
}
function apr(value: number) {
  nonnegative(value, "APR basis points");
  if (value > 100_000) throw new Error("APR is outside the supported range");
}
function sum(values: number[]): number {
  const result = values.reduce((total, value) => total + value, 0);
  assertMinorUnits(result);
  return result;
}

/**
 * Estimate only: beginning-of-month balances, APR/12 simple monthly interest,
 * half-up cent rounding, fixed entered minimums, payments at month end, no new
 * charges/fees. Promo expiry prorates that month's APR by calendar days.
 * Does not model deferred-interest promotions or lender-specific daily accrual.
 */
export function estimateDebtPayoff(input: {
  debts: DebtInput[];
  monthlyPaymentMinor: number;
  startMonth: string;
  strategy: "AVALANCHE" | "SNOWBALL";
  maxMonths?: number;
}): DebtEstimate {
  if (!/^\d{4}-\d{2}$/.test(input.startMonth)) throw new Error("Expected YYYY-MM start month");
  const start = calendarDate(`${input.startMonth}-01`);
  if (!["AVALANCHE", "SNOWBALL"].includes(input.strategy)) throw new Error("Invalid payoff strategy");
  nonnegative(input.monthlyPaymentMinor, "Monthly payment");
  const limit = input.maxMonths ?? 600;
  if (!Number.isInteger(limit) || limit < 1 || limit > 600) throw new Error("Horizon must be 1 to 600 months");
  if (input.debts.length > 100 || new Set(input.debts.map(debt => debt.id)).size !== input.debts.length) throw new Error("Use at most 100 uniquely identified debts");
  const debts = input.debts.map(debt => {
    if (!debt.id.trim()) throw new Error("Debt ID is required");
    nonnegative(debt.balanceMinor, "Balance");
    nonnegative(debt.minimumPaymentMinor, "Minimum payment");
    apr(debt.aprBasisPoints);
    if (debt.promotion) { apr(debt.promotion.aprBasisPoints); calendarDate(debt.promotion.expiresOn); }
    return { ...debt, remaining: debt.balanceMinor };
  });
  const result: DebtEstimate = { status: "PAID_OFF", payoffMonth: null, totalInterestMinor: 0, totalPaidMinor: 0, shortfallMinor: 0, warnings: [], schedule: [] };
  for (let index = 0; index < limit && debts.some(debt => debt.remaining > 0); index++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const days = (next.getTime() - date.getTime()) / 86_400_000;
    const rows = debts.map(debt => {
      const promoDays = debt.promotion ? Math.min(days, Math.max(0, (calendarDate(debt.promotion.expiresOn).getTime() - date.getTime()) / 86_400_000)) : 0;
      const weightedApr = (debt.promotion?.aprBasisPoints ?? 0) * promoDays + debt.aprBasisPoints * (days - promoDays);
      const numerator = BigInt(debt.remaining) * BigInt(weightedApr);
      const denominator = BigInt(days * 120_000);
      const interest = Number((numerator + denominator / BigInt(2)) / denominator);
      const owed = sum([debt.remaining, interest]);
      return { id: debt.id, openingMinor: debt.remaining, interestMinor: interest, paymentMinor: 0, remainingMinor: owed, minimum: Math.min(owed, debt.minimumPaymentMinor), weightedApr };
    });
    const required = sum(rows.map(row => row.minimum));
    if (required > input.monthlyPaymentMinor) {
      result.status = "INSUFFICIENT_PAYMENT";
      result.shortfallMinor = required - input.monthlyPaymentMinor;
      result.warnings.push("The monthly payment budget does not cover the entered minimums.");
      return result;
    }
    let available = input.monthlyPaymentMinor;
    for (const row of rows) { row.paymentMinor = row.minimum; row.remainingMinor -= row.minimum; available -= row.minimum; }
    const ordered = [...rows].sort((a, b) => {
      const priority = input.strategy === "AVALANCHE" ? b.weightedApr - a.weightedApr : a.openingMinor - b.openingMinor;
      return priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    for (const row of ordered) {
      const extra = Math.min(available, row.remainingMinor);
      row.paymentMinor += extra; row.remainingMinor -= extra; available -= extra;
    }
    const interestMinor = sum(rows.map(row => row.interestMinor));
    const paymentMinor = sum(rows.map(row => row.paymentMinor));
    if (paymentMinor <= interestMinor && !result.warnings.includes("Some months do not reduce total principal.")) result.warnings.push("Some months do not reduce total principal.");
    rows.forEach((row, i) => { debts[i]!.remaining = row.remainingMinor; });
    result.totalInterestMinor = sum([result.totalInterestMinor, interestMinor]);
    result.totalPaidMinor = sum([result.totalPaidMinor, paymentMinor]);
    result.schedule.push({ month: date.toISOString().slice(0, 7), interestMinor, paymentMinor, remainingMinor: sum(rows.map(row => row.remainingMinor)), debts: rows.map(({ id, interestMinor, paymentMinor, remainingMinor }) => ({ id, interestMinor, paymentMinor, remainingMinor })) });
  }
  if (debts.some(debt => debt.remaining > 0)) {
    result.status = "HORIZON_REACHED";
    result.warnings.push("The entered plan does not pay off all debts within the estimate horizon.");
  } else result.payoffMonth = result.schedule.at(-1)?.month ?? input.startMonth;
  return result;
}
