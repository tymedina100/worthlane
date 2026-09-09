"use client";
import { useState, type FormEvent } from "react";
import { debtPlanEntrySchema, type DebtPlanInput, type LiabilitySnapshot } from "@worthlane/contracts";

type Debt = DebtPlanInput["debts"][number];
export function BankDebtCopy({ debt, retrievedAt, currency, onCopy, disabled }: { debt: LiabilitySnapshot["debts"][number]; retrievedAt: string; currency: string; onCopy: (debt: Debt) => void; disabled: boolean }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  if (debt.currency !== currency) return <p>Currency does not match this plan. Enter confirmed amounts manually; no currency conversion is provided.</p>;
  const amount = (value: number | null) => value === null || value < 0 ? "" : (value / 100).toFixed(2);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minor = (key: string) => {
      const raw = String(form.get(key) ?? "");
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error("Enter nonnegative amounts and APR with at most two decimal places.");
      return Math.round(Number(raw) * 100);
    };
    try {
      if (form.get("confirmed") !== "on") throw new Error("Confirm the figures before copying.");
      const input = debtPlanEntrySchema.parse({ id: crypto.randomUUID(), name: form.get("name"), balanceMinor: minor("balance"), minimumPaymentMinor: minor("minimum"), aprBasisPoints: minor("apr"), statementBalanceMinor: form.get("statement") ? minor("statement") : null, dueDate: form.get("due") || null, bankReference: { source: "USER_REVIEWED_PLAID_LIABILITIES", retrievedAt, reviewedAt: new Date().toISOString() } });
      onCopy(input); setCopied(true); setMessage("Copied to the current plan draft below. Review the full plan and choose Save plan to keep it.");
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "Check the amounts, name and date."); }
  }
  return <details><summary>Review and copy into the current plan</summary><p>Confirm these figures against your statement. Enter the APR to use in the estimate; reported rates are not combined automatically. Check grouped student-loan payments and accrued interest before copying. Copying adds a debt and does not replace an existing one.</p>
    <form onSubmit={submit}><fieldset className="debt-plan-fields" disabled={copied || disabled}><legend>Confirm {debt.name}</legend>
      <label>Name<input name="name" required maxLength={100} defaultValue={debt.name} /></label>
      <label>Current balance ({currency})<input name="balance" type="number" min="0" step="0.01" required defaultValue={amount(debt.currentBalanceMinor)} /></label>
      <label>Minimum monthly payment<input name="minimum" type="number" min="0" step="0.01" required defaultValue={amount(debt.minimumPaymentMinor)} /></label>
      <label>APR to use (%)<input name="apr" type="number" min="0" max="1000" step="0.01" required /></label>
      <label>Statement balance (optional)<input name="statement" type="number" min="0" step="0.01" defaultValue={amount(debt.statementBalanceMinor)} /></label>
      <label>Confirmed due date (optional)<input name="due" type="date" defaultValue={debt.dueDate ?? ""} /></label>
      <label className="upcoming-active"><input name="confirmed" type="checkbox" required /> I reviewed these figures and checked this debt is not already in my draft.</label>
      <button className="button button--secondary">Copy reviewed debt to draft</button>
    </fieldset></form><p role="status">{message}</p></details>;
}
