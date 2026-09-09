"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { UpcomingObligation } from "@worthlane/types";
import { upcomingInputSchema } from "@worthlane/contracts";
async function request<T>(path = "", body?: unknown, method = "GET"): Promise<T> {
  const response = await fetch(`/api/upcoming${path}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? "Could not load upcoming items.");
  return payload.data;
}
export function UpcomingManager({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<UpcomingObligation[]>([]);
  const [selected, setSelected] = useState<UpcomingObligation | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = async () => setItems((await request<{ items: UpcomingObligation[] }>()).items);
  useEffect(() => { refresh().catch(error => setMessage(error.message)); }, [refreshKey]);
  function edit(item: UpcomingObligation | null) { setSelected(item); setVersion(value => value + 1); }
  async function mark(item: UpcomingObligation) {
    setBusy(true);
    try { await request(`/${encodeURIComponent(item.id)}`, { action: item.isPaid ? "markUnpaid" : "markPaid" }, "POST"); await refresh(); if (selected?.id === item.id) edit(null); setMessage(item.frequency ? "Recorded payment and advanced to the next scheduled date." : "Payment status updated."); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true);
    try {
      const body = upcomingInputSchema.parse({ name: form.get("name"), amount: Number(form.get("amount")), dueDate: form.get("dueDate"), type: form.get("type"), frequency: form.get("frequency") || null, accountName: form.get("accountName") || null, reminderTiming: selected ? selected.reminderTiming : "NONE", isActive: form.get("active") === "on" });
      await request(selected ? `/${encodeURIComponent(selected.id)}` : "", body, selected ? "PATCH" : "POST"); await refresh(); edit(null); setMessage("Saved upcoming item.");
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "Check the name, amount and due date."); } finally { setBusy(false); }
  }
  return <section className="panel workspace-panel upcoming-panel" id="upcoming-items"><div className="panel__header"><p className="section-kicker">Personal scope · Only you</p><h2>Upcoming bills and payments</h2><p>Manual dates, including minimums added from saved debt plans. Marking paid records your action; it does not move money.</p></div>
    <div className="debt-plan-actions"><button className="button button--secondary" disabled={busy} onClick={() => edit(null)}>New upcoming item</button><button className="button button--secondary" disabled={busy} onClick={() => void refresh().catch(error => setMessage(error.message))}>Refresh upcoming items</button></div>
    {items.length === 0 && <p>No upcoming items yet.</p>}
    {items.map(item => <article key={item.id} className="debt-plan-result"><strong>{item.name}</strong><p>{item.amount.toFixed(2)} USD · {item.dueDate} · {item.status.replaceAll("_", " ").toLowerCase()}{!item.isActive ? " · inactive" : ""}</p><div className="debt-plan-actions"><button className="button button--secondary" disabled={busy} onClick={() => edit(item)}>Edit {item.name}</button><button className="button button--secondary" disabled={busy} onClick={() => void mark(item)}>{item.isPaid ? "Mark unpaid" : item.frequency ? "Record paid and advance date" : "Mark paid"}</button></div></article>)}
    <form key={version} onSubmit={save}><fieldset className="debt-plan-fields" disabled={busy}><legend>{selected ? "Edit upcoming item" : "New upcoming item"}</legend><label>Name<input name="name" required maxLength={120} defaultValue={selected?.name ?? ""} /></label><label>Amount (USD)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={selected?.amount ?? ""} /></label><label>Confirmed due date<input name="dueDate" type="date" required defaultValue={selected?.dueDate ?? ""} /></label><label>Type<select name="type" defaultValue={selected?.type ?? "BILL"}><option value="BILL">Bill</option><option value="CREDIT_CARD">Credit card</option><option value="SUBSCRIPTION">Subscription</option><option value="OTHER">Other</option></select></label><label>Repeat<select name="frequency" defaultValue={selected?.frequency ?? ""}><option value="">One date only</option><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label><label>Account reference (optional)<input name="accountName" defaultValue={selected?.accountName ?? ""} /></label><label className="upcoming-active"><input name="active" type="checkbox" defaultChecked={selected?.isActive ?? true} />Active</label></fieldset><p>New items have reminders off. Manage device reminders in mobile Upcoming. Existing reminder preferences are preserved.</p><button className="button button--primary" disabled={busy}>Save upcoming item</button></form><p role="status">{message}</p>
  </section>;
}
