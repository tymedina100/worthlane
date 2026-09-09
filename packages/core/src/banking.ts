export function bankHistoryStatus(value: string | undefined): string {
  return ["NOT_READY", "INITIAL_UPDATE_COMPLETE", "HISTORICAL_UPDATE_COMPLETE"].includes(value ?? "") ? value! : "UNKNOWN";
}

/** App retrieval time is not the bank's last successful update time. */
export function bankDataNotice(item: { transactionHistoryStatus: string; lastSyncAt: string | null; status: string }, now: Date): string {
  if (item.status !== "HEALTHY") return "Bank updates need attention. Spending may be missing recent activity.";
  if (!item.lastSyncAt || item.transactionHistoryStatus === "NOT_READY") return "Bank activity is still loading. Spending totals are incomplete.";
  if (item.transactionHistoryStatus === "INITIAL_UPDATE_COMPLETE") return "Recent activity loaded; older history is still loading. Spending totals may be incomplete.";
  if (item.transactionHistoryStatus !== "HISTORICAL_UPDATE_COMPLETE") return "Bank history coverage is unconfirmed. Spending totals may be incomplete.";
  const elapsed = now.getTime() - new Date(item.lastSyncAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed > 24 * 60 * 60 * 1000) return "Worthlane has not retrieved bank activity in the past day. Sync to check for available updates.";
  return "Available bank history loaded. New bank activity can arrive later; older history may be limited by your bank.";
}
