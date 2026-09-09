"use client";
import { BankDebtCopy } from "./bank-debt-copy";
import type { DebtPlanInput } from "@worthlane/contracts";
import { PlaidLinkButton } from "./plaid-link-button";
import type { ManagePlaid } from "../src/lib/workspace-data";
import { useState } from "react";
import { liabilitySnapshotSchema, type LiabilitySnapshot } from "@worthlane/contracts";
export function BankDebtDetails({ connections, currency, onCopy, copyDisabled }: { connections: { id: string; institution: string | null }[]; currency: string; onCopy: (debt: DebtPlanInput["debts"][number]) => void; copyDisabled: boolean }) {
  const [snapshot, setSnapshot] = useState<{ id: string; data: LiabilitySnapshot } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const manage: ManagePlaid = async ({ path, body }) => {
    const response = await fetch(`/api/plaid${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Bank linking is unavailable.");
    return payload.data;
  };
  async function check(id: string) {
    setBusy(true); setMessage(""); setSnapshot(null);
    try {
      const response = await fetch(`/api/plaid/items/${encodeURIComponent(id)}/liabilities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Debt details are unavailable. Enter confirmed details manually below.");
      setSnapshot({ id, data: liabilitySnapshotSchema.parse(payload.data) });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not check debt details."); }
    finally { setBusy(false); }
  }
  const data = snapshot && connections.some(connection => connection.id === snapshot.id) ? snapshot.data : null;
  return <section className="panel workspace-panel upcoming-panel"><div className="panel__header"><p className="section-kicker">Personal scope · Only you</p><h2>Bank debt details</h2><p>Check supported linked debts, then confirm the figures on your statement before entering them in your plan. Checking does not change a saved plan.</p></div>
    {!connections.length && <p>No bank connections yet. You can enter debt details manually below.</p>}
    <div className="debt-plan-actions">{connections.map(connection => <div key={connection.id}><button disabled={busy} className="button button--secondary" onClick={() => void check(connection.id)}>Check {connection.institution ?? "bank connection"} debt details</button><p>Review permission to share debt details through Plaid. This does not share them with your partner.</p><PlaidLinkButton onManage={manage} itemId={connection.id} includeLiabilities /></div>)}</div>
    <p role="status">{busy ? "Checking debt details…" : message}</p>
    {data && <><p>Source: Plaid Liabilities · Retrieved {new Date(data.retrievedAt).toLocaleString()}</p><p>{data.notice}</p>{!data.debts.length && <p>No supported debt details were returned. Continue with manual entry.</p>}{data.debts.map(debt => {
      const money = (value: number | null) => value === null ? "Not provided" : `${(value / 100).toFixed(2)} ${debt.currency ?? "(currency not provided)"}`;
      return <article className="debt-plan-result" key={debt.accountId}><h3>{debt.name}</h3><p>{debt.kind.replaceAll("_", " ").toLowerCase()}</p><dl className="liability-details">
        <dt>Current balance</dt><dd>{money(debt.currentBalanceMinor)}</dd><dt>Statement balance</dt><dd>{money(debt.statementBalanceMinor)}</dd><dt>Minimum payment</dt><dd>{money(debt.minimumPaymentMinor)}</dd><dt>Next payment (mortgage)</dt><dd>{money(debt.nextPaymentMinor)}</dd><dt>Accrued interest</dt><dd>{money(debt.outstandingInterestMinor)}</dd><dt>Provider due date</dt><dd>{debt.dueDate ?? "Not provided"}</dd></dl>
        <p>Reported rates (review each separately)</p>{!debt.rates.length && <p>Not provided</p>}<ul>{debt.rates.map((rate, index) => <li key={index}>{rate.kind.replaceAll("_", " ")}: {rate.percentage}% · balance subject to rate: {money(rate.balanceSubjectToRateMinor)}</li>)}</ul>{debt.notes.map(note => <p key={note}>{note}</p>)}<BankDebtCopy key={`${debt.accountId}-${data.retrievedAt}`} debt={debt} retrievedAt={data.retrievedAt} currency={currency} onCopy={onCopy} disabled={copyDisabled} /></article>;
    })}</>}
  </section>;
}
