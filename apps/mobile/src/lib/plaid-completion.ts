/** Link updates retain the existing Item; only new connections exchange tokens. */
export async function completePlaidLink(options: {
  mode: "create" | "update";
  plaidItemId?: string;
  publicToken?: string | null;
  institutionName?: string;
  isCurrentUser: () => boolean;
  post: (path: string, body: Record<string, unknown>) => Promise<unknown>;
}) {
  if (!options.isCurrentUser()) throw new Error("Your session changed. Reopen bank linking after signing in.");
  if (options.mode === "update") {
    if (!options.plaidItemId) throw new Error("Choose the bank connection to reconnect.");
    await options.post("/plaid/sync", { plaidItemId: options.plaidItemId, refresh: true });
  } else {
    if (!options.publicToken) throw new Error("Bank linking did not return a token. Please try again.");
    await options.post("/plaid/exchange", { publicToken: options.publicToken, ...(options.institutionName ? { institutionName: options.institutionName } : {}) });
  }
  return options.isCurrentUser();
}
