/** iOS Link v13 sends an empty error object for an ordinary cancellation. */
export function plaidExitError(error: {
  errorCode?: string | null;
  errorType?: string | null;
  errorMessage?: string | null;
  displayMessage?: string | null;
} | null | undefined): { message: string; code?: string } | null {
  if (!error) return null;
  const code = error.errorCode?.trim();
  const message = error.displayMessage?.trim() || error.errorMessage?.trim();
  if (!code && !message && !error.errorType?.trim()) return null;
  return { message: message || "Bank linking could not finish. Please try again.", ...(code ? { code } : {}) };
}
