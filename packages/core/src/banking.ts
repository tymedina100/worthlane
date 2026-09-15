export function bankHistoryStatus(value: string | undefined): string {
  return ["NOT_READY", "INITIAL_UPDATE_COMPLETE", "HISTORICAL_UPDATE_COMPLETE"].includes(value ?? "") ? value! : "UNKNOWN";
}

/** Call only with accounts whose balances the viewer is allowed to see. */
export function countedBankAccountIds(
  accounts: readonly { id: string; userId: string; bankIdentity?: string | null }[],
  viewerUserId: string,
  confirmedPairs: readonly { firstAccountId: string; secondAccountId: string }[] = [],
): Set<string> {
  const counted = new Set<string>();
  const parents = new Map(accounts.map(account => [account.id, account.id]));
  function root(id: string): string {
    const parent = parents.get(id)!;
    if (parent === id) return id;
    const result = root(parent); parents.set(id, result); return result;
  }
  function join(a: string, b: string) {
    // Hidden accounts must never connect two otherwise unrelated visible feeds.
    if (parents.has(a) && parents.has(b)) parents.set(root(a), root(b));
  }
  const identities = new Map<string, string>();
  for (const account of accounts) {
    if (!account.bankIdentity) continue;
    const previous = identities.get(account.bankIdentity);
    if (previous) join(account.id, previous);
    else identities.set(account.bankIdentity, account.id);
  }
  for (const pair of confirmedPairs) join(pair.firstAccountId, pair.secondAccountId);
  // Prefer the viewer's own ledger, without substituting their partner's feed.
  const ordered = [...accounts].sort((a, b) =>
    Number(b.userId === viewerUserId) - Number(a.userId === viewerUserId) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  for (const account of ordered) {
    const identity = root(account.id);
    if (seen.has(identity)) continue;
    counted.add(account.id);
    seen.add(identity);
  }
  return counted;
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
