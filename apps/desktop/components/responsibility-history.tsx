"use client";

import { useEffect, useState } from "react";
import { responsibilityHistoryPageSchema, type ResponsibilityHistoryPage } from "@worthlane/contracts";
import { formatCurrencyMinor } from "../src/lib/format";

export function ResponsibilityHistory() {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [page, setPage] = useState<ResponsibilityHistoryPage | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPage(null);
    setError(false);
    void (async () => {
      try {
        const response = await fetch(`/api/household/manage/responsibility-history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        const payload = await response.json();
        const result = responsibilityHistoryPageSchema.parse(payload.data);
        if (!controller.signal.aborted) setPage(result);
      } catch { if (!controller.signal.aborted) setError(true); }
    })();
    return () => controller.abort();
  }, [open, cursor, retry]);
  return <details className="panel management-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Budget agreement history</summary>
    <p>Previous agreements are recorded when changed or removed. Older versions from before history recording began are unavailable. These are plan definitions, not settled balances or historical spending reports.</p>
    {open && !page && !error ? <p role="status">Loading agreements…</p> : null}
    {error ? <p role="alert">History could not be loaded. <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></p> : null}
    {page?.entries.length === 0 ? <p>No previous agreements recorded yet.</p> : null}
    {page?.entries.map(({ id, recordedAt, definition: plan }) => <article key={id}>
      <h3>{plan.name} · {formatCurrencyMinor(plan.monthlyAmountMinor, plan.currency)} / month</h3>
      <p>{plan.categoryName} · {plan.reason === "REMOVED" ? "Removed" : "Replaced"} {new Date(recordedAt).toLocaleString()}</p>
      <p>Previous version saved {new Date(plan.definitionUpdatedAt).toLocaleString()}</p>
      <ul>{plan.allocations.map(share => <li key={share.memberId}>{share.displayName}: {share.shareBasisPoints / 100}% · {formatCurrencyMinor(share.assignedMinor, plan.currency)}</li>)}</ul>
    </article>)}
    {page?.nextCursor ? <button className="button" type="button" onClick={() => setCursor(page.nextCursor)}>Older agreements</button> : null}
    {cursor ? <button className="button" type="button" onClick={() => setCursor(null)}>Latest agreements</button> : null}
  </details>;
}
