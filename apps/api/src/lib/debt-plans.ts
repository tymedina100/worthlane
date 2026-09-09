import { Prisma, type DebtPlan, type DebtPlanEntry } from "@worthlane/db";
import { type DebtPlanInput, debtPlanInputSchema } from "@worthlane/contracts";
import { toMinorUnits, estimateDebtPayoff, DEBT_ESTIMATE_ASSUMPTIONS } from "@worthlane/core";

const decimal = (cents: number) => new Prisma.Decimal(cents).div(100);
export function debtPlanData(input: DebtPlanInput) {
  return { name: input.name, startMonth: input.startMonth, strategy: input.strategy, monthlyPayment: decimal(input.monthlyPaymentMinor), debts: { create: input.debts.map((debt, position) => ({ entryId: debt.id, name: debt.name, balance: decimal(debt.balanceMinor), minimumPayment: decimal(debt.minimumPaymentMinor), statementBalance: debt.statementBalanceMinor === null ? null : decimal(debt.statementBalanceMinor), dueDate: debt.dueDate, aprBasisPoints: debt.aprBasisPoints, promoAprBasisPoints: debt.promotion?.aprBasisPoints ?? null, promoExpiresOn: debt.promotion?.expiresOn ?? null, position })) } };
}
export function debtPlanResult(plan: DebtPlan & { debts: DebtPlanEntry[] }, includeEstimate = true) {
  const input = debtPlanInputSchema.parse({ name: plan.name, startMonth: plan.startMonth, strategy: plan.strategy, monthlyPaymentMinor: toMinorUnits(plan.monthlyPayment.toNumber()), debts: [...plan.debts].sort((a, b) => a.position - b.position).map(debt => ({ id: debt.entryId, name: debt.name, balanceMinor: toMinorUnits(debt.balance.toNumber()), minimumPaymentMinor: toMinorUnits(debt.minimumPayment.toNumber()), statementBalanceMinor: debt.statementBalance === null ? null : toMinorUnits(debt.statementBalance.toNumber()), dueDate: debt.dueDate, aprBasisPoints: debt.aprBasisPoints, ...(debt.promoAprBasisPoints !== null && debt.promoExpiresOn ? { promotion: { aprBasisPoints: debt.promoAprBasisPoints, expiresOn: debt.promoExpiresOn } } : {}) })) });
  return { id: plan.id, revision: plan.revision, updatedAt: plan.updatedAt.toISOString(), source: "MANUAL" as const, input, ...(includeEstimate ? { calculationVersion: 1, assumptions: DEBT_ESTIMATE_ASSUMPTIONS, estimate: estimateDebtPayoff(input) } : {}) };
}
