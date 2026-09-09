"use client";
import { BankDebtDetails } from "./bank-debt-details";
import { useEffect, useState, type FormEvent } from "react";
import { debtPlanInputSchema, type DebtPlanInput } from "@worthlane/contracts";
import { estimateDebtPayoff, DEBT_ESTIMATE_ASSUMPTIONS, type DebtEstimate } from "@worthlane/core";

type Plan = { id: string; revision: number; input: DebtPlanInput; estimate?: DebtEstimate };
const newDebt = (): DebtPlanInput["debts"][number] => ({ id: crypto.randomUUID(), name: "", balanceMinor: 0, minimumPaymentMinor: 0, aprBasisPoints: 0, statementBalanceMinor: null, dueDate: null });
async function request<T>(path = "", body?: unknown, method = "GET"): Promise<T> {
  const response = await fetch(`/api/debt-plans${path}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Could not load the plan.");
  return payload.data;
}
export function DebtPlanner({ currency, connections, onUpcomingAdded }: { currency: string; connections: { id: string; institution: string | null }[]; onUpcomingAdded?: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [debts, setDebts] = useState<DebtPlanInput["debts"]>([]);
  const [version, setVersion] = useState(0);
  const [estimate, setEstimate] = useState<DebtEstimate | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  useEffect(() => { setDebts([newDebt()]); request<Plan[]>().then(setPlans).catch(error => setMessage(error.message)); }, []);
  function reset(plan: Plan | null) {
    setSelected(plan); setDebts(plan?.input.debts ?? [newDebt()]); setEstimate(plan?.estimate ?? null); setVersion(value => value + 1); setMessage(plan ? "Saved plan loaded." : "New plan. Changes are not saved yet.");
  }
  async function open(id: string) {
    setBusy(true);
    try { reset(await request<Plan>(`/${encodeURIComponent(id)}`)); } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function addDueDate(entryId: string) {
    if (!selected) return;
    setBusy(true);
    try { const result = await request<{ message: string }>(`/${encodeURIComponent(selected.id)}/upcoming`, { entryId, revision: selected.revision }, "POST"); setMessage(result.message); onUpcomingAdded?.(); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (name: string) => {
      const raw = String(form.get(name) ?? "");
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error("Enter nonnegative amounts and APRs with at most two decimal places.");
      return Math.round(Number(raw) * 100);
    };
    setBusy(true);
    try {
      const input = debtPlanInputSchema.parse({ name: form.get("name"), startMonth: form.get("startMonth"), strategy: form.get("strategy"), monthlyPaymentMinor: number("payment"), debts: debts.map((debt, index) => ({ bankReference: debt.bankReference, id: debt.id, name: form.get(`name${index}`), balanceMinor: number(`balance${index}`), minimumPaymentMinor: number(`minimum${index}`), aprBasisPoints: number(`apr${index}`), statementBalanceMinor: form.get(`statement${index}`) ? number(`statement${index}`) : null, dueDate: form.get(`due${index}`) || null, ...(form.get(`expiry${index}`) ? { promotion: { expiresOn: form.get(`expiry${index}`), aprBasisPoints: number(`promo${index}`) } } : {}) })) });
      const result = estimateDebtPayoff(input);
      setDebts(input.debts);
      setEstimate(result);
      const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
      if (action === "preview") { setMessage("Preview only — these changes are not saved."); return; }
      const saved = await request<Plan>(selected ? `/${encodeURIComponent(selected.id)}` : "", selected ? { revision: selected.revision, input } : input, selected ? "PATCH" : "POST");
      reset(saved); setMessage("Saved. You can reopen this plan after signing in again.");
      setPlans(await request<Plan[]>());
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "Check names, amounts, dates and promotional details."); }
    finally { setBusy(false); }
  }
  return <><BankDebtDetails copyDisabled={busy || debts.length >= 100} connections={connections} currency={currency} onCopy={debt => { setDebts(rows => [...rows, debt]); setEstimate(null); setMessage("Reviewed debt added to this draft. Save the plan to keep it."); }} /><section className="panel workspace-panel">
    <div className="panel__header"><p className="section-kicker">Personal scope · Only you</p><h2>Debt payoff plan</h2><p>Enter an affordable monthly payment budget. These are manual estimates; no payments are made.</p></div>
    <div className="debt-plan-actions"><button type="button" className="button button--secondary" disabled={busy} onClick={() => reset(null)}>New plan</button>{plans.map(plan => <button key={plan.id} type="button" className="button button--secondary" disabled={busy} onClick={() => void open(plan.id)}>Open {plan.input.name}</button>)}</div>
    <form key={version} onSubmit={submit} onChange={() => { setEstimate(null); setMessage("Unsaved changes."); }}>
      <fieldset disabled={busy} className="debt-plan-fields"><legend>Plan details</legend>
        <label>Plan name<input name="name" required maxLength={100} defaultValue={selected?.input.name ?? "My payoff plan"} /></label>
        <label>First payment month<input name="startMonth" type="month" required defaultValue={selected?.input.startMonth ?? new Date().toISOString().slice(0, 7)} /></label>
        <label>Monthly payment budget ({currency})<input name="payment" type="number" min="0" step="0.01" required defaultValue={(selected?.input.monthlyPaymentMinor ?? 0) / 100} /></label>
        <label>Method<select name="strategy" defaultValue={selected?.input.strategy ?? "AVALANCHE"}><option value="AVALANCHE">Avalanche — highest APR first</option><option value="SNOWBALL">Snowball — smallest balance first</option></select></label>
      </fieldset>
      {debts.map((debt, index) => <fieldset disabled={busy} className="debt-plan-fields" key={debt.id}><legend>Debt {index + 1}</legend>
        {debt.bankReference && <p>Bank details reviewed {new Date(debt.bankReference.reviewedAt).toLocaleString()}; retrieved {new Date(debt.bankReference.retrievedAt).toLocaleString()}. Values may have been edited and do not refresh automatically.</p>}<label>Name<input name={`name${index}`} required maxLength={100} defaultValue={debt.name} /></label>
        <label>Current balance ({currency})<input name={`balance${index}`} type="number" min="0" step="0.01" required defaultValue={debt.balanceMinor / 100} /></label>
        <label>Minimum monthly payment<input name={`minimum${index}`} type="number" min="0" step="0.01" required defaultValue={debt.minimumPaymentMinor / 100} /></label>
        <label>Ordinary APR (%)<input name={`apr${index}`} type="number" min="0" max="1000" step="0.01" required defaultValue={debt.aprBasisPoints / 100} /></label>
        <label>Statement balance (optional)<input name={`statement${index}`} type="number" min="0" step="0.01" defaultValue={debt.statementBalanceMinor === null ? "" : debt.statementBalanceMinor / 100} /></label>
        <label>Confirmed due date (optional)<input name={`due${index}`} type="date" defaultValue={debt.dueDate ?? ""} /></label>
        <label>Promo APR (%)<input name={`promo${index}`} type="number" min="0" max="1000" step="0.01" defaultValue={(debt.promotion?.aprBasisPoints ?? 0) / 100} /></label>
        <label>Promo expiry (optional)<input name={`expiry${index}`} type="date" defaultValue={debt.promotion?.expiresOn ?? ""} /></label>
        <button type="button" className="button button--secondary" disabled={debts.length === 1} onClick={() => { setDebts(value => value.filter(row => row.id !== debt.id)); setEstimate(null); setMessage("Unsaved changes."); }}>Remove debt {index + 1}</button>
      </fieldset>)}
      <p>Statement balances and due dates are reference details. This estimate uses current balances and month-end payments; reminders are not scheduled here.</p>
      <div className="debt-plan-actions"><button type="button" className="button button--secondary" disabled={busy || debts.length >= 100} onClick={() => { setDebts(value => [...value, newDebt()]); setEstimate(null); }}>Add debt</button><button className="button button--secondary" value="preview" disabled={busy}>Preview estimate</button><button className="button button--primary" value="save" disabled={busy}>Save plan</button></div>
    </form>
    {message && <p role="status">{message}</p>}
    {estimate && <div className="debt-plan-result"><h3>{estimate.status === "PAID_OFF" ? `Estimated payoff: ${estimate.payoffMonth}` : "This plan needs adjustment"}</h3><p>Estimated interest: {money(estimate.totalInterestMinor)} · Payments in this estimate: {money(estimate.totalPaidMinor)}</p>{estimate.shortfallMinor > 0 && <p>Additional monthly amount needed for minimums: {money(estimate.shortfallMinor)}</p>}{estimate.warnings.map(warning => <p key={warning}>{warning}</p>)}<details><summary>Monthly schedule</summary><div className="debt-plan-table"><table><thead><tr><th>Month</th><th>Payment</th><th>Interest</th><th>Remaining</th></tr></thead><tbody>{estimate.schedule.map(row => <tr key={row.month}><td>{row.month}</td><td>{money(row.paymentMinor)}</td><td>{money(row.interestMinor)}</td><td>{money(row.remainingMinor)}</td></tr>)}</tbody></table></div></details></div>}
    {estimate?.schedule[0] && <div><h3>First month's payments</h3><ul>{estimate.schedule[0].debts.map(row => <li key={row.id}>{debts.find(debt => debt.id === row.id)?.name}: {money(row.paymentMinor)}</li>)}</ul></div>}
    {selected && <div><h3>Due dates from the saved plan</h3><p>Add each confirmed minimum payment once. Reminders start off; edit the item in Upcoming. Unsaved changes are not used.</p>{selected.input.debts.filter(debt => debt.dueDate && debt.minimumPaymentMinor > 0).map(debt => <button key={debt.id} type="button" className="button button--secondary" disabled={busy} onClick={() => void addDueDate(debt.id)}>Add {debt.name}: {money(debt.minimumPaymentMinor)} due {debt.dueDate} to Upcoming</button>)}</div>}
    <details><summary>How this estimate works</summary><ul>{DEBT_ESTIMATE_ASSUMPTIONS.map(text => <li key={text}>{text}</li>)}</ul></details>
  </section></>;
}
