"use client";

import { useEffect, useState } from "react";
import { transactionDuplicatesSchema, type TransactionDuplicates } from "@worthlane/contracts";
import type { ManagePersonal } from "../src/lib/workspace-data";

type Entry = TransactionDuplicates["entries"][number]["manual"];
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function EntryDetail({ label, entry }: { label: string; entry: Entry }) {
  return <div><h4>{label}</h4><p>{entry.merchantName || "No description"} · {dollars.format(entry.amount)}</p><p>{entry.date.slice(0, 10)} · {entry.accountName}</p></div>;
}

export function DuplicateReview({ onManagePersonal }: { onManagePersonal: ManagePersonal }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [page, setPage] = useState<TransactionDuplicates | null>(null);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selection, setSelection] = useState<{ manual: Entry; bank: Entry } | null>(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setPage(null);
    setSelection(null);
    setError("");
    void (async () => {
      try {
        const response = await fetch(`/api/personal/manage/transactions/duplicates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : "Review could not be loaded.");
        const result = transactionDuplicatesSchema.parse((await response.json()).data);
        if (!controller.signal.aborted) setPage(result);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Review could not be loaded."); }
    })();
    return () => controller.abort();
  }, [open, cursor, retry]);
  async function confirm() {
    if (!selection || pending) return;
    setPending(true);
    setMessage("");
    try {
      const { manual, bank } = selection;
      await onManagePersonal({ path: "/transactions/duplicates", method: "POST", body: { manualId: manual.id, bankId: bank.id, manualUpdatedAt: manual.updatedAt, bankUpdatedAt: bank.updatedAt } });
      setMessage("Manual copy excluded. Both entries remain. Use Budget treatment below to restore it if needed.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Not confirmed. Refresh and try again."); }
    finally { setPending(false); setSelection(null); setRetry(value => value + 1); }
  }
  return <details className="panel management-panel" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Review possible duplicates</summary>
    <p>Only your entries are compared. Equal signed amounts within three days are suggestions, not confirmed matches. Positive amounts are expenses; negative amounts are credits.</p>
    <p>Each page reviews 20 manual entries across your history, with up to five bank suggestions per entry.</p>
    <button className="button" type="button" disabled={pending} onClick={() => setRetry(value => value + 1)}>Refresh review</button>
    <p role="status" aria-live="polite">{message}</p>
    {error ? <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry review</button></p> : open && !page ? <p role="status">Loading review…</p> : null}
    {selection ? <section aria-label="Confirm duplicate">
      <h3>Confirm duplicate?</h3>
      <EntryDetail label="Manual entry" entry={selection.manual} /><EntryDetail label="Bank entry" entry={selection.bank} />
      <p>Confirm only if these are the same transaction. Both records remain, but the manual copy stops counting. The bank entry's sharing rules apply, so household totals may change. If the bank entry disappears, review and restore the manual entry using Budget treatment.</p>
      <button className="button" type="button" disabled={pending} onClick={() => void confirm()}>{pending ? "Saving…" : "Exclude manual copy"}</button>
      <button className="button" type="button" disabled={pending} onClick={() => setSelection(null)}>Keep both</button>
    </section> : <>
      {page?.entries.length === 0 ? <p>No possible matches among these {page.reviewedCount} manual entries.</p> : null}
      {page?.entries.map(row => <article key={row.manual.id}>
        <EntryDetail label="Manual entry" entry={row.manual} />
        {row.bankMatches.map(bank => <div key={bank.id}><EntryDetail label="Possible bank match" entry={bank} /><button className="button" type="button" onClick={() => { setMessage(""); setSelection({ manual: row.manual, bank }); }}>Review this match</button></div>)}
        {row.moreMatches ? <p>More bank candidates exist. Check Activity if none of these matches.</p> : null}
      </article>)}
      {page?.nextCursor ? <button className="button" type="button" onClick={() => setCursor(page.nextCursor)}>Review older entries</button> : null}
      {cursor ? <button className="button" type="button" onClick={() => setCursor(null)}>Review newest entries</button> : null}
    </>}
  </details>;
}
