import type { LinkEvent } from "react-native-plaid-link-sdk";

// Fixed vocabularies keep tokens, URLs, names and provider free text out of logs.
// Unknown values are useful as a signal, but are never copied into diagnostics.
const events = ["OPEN", "OPEN_OAUTH", "CLOSE_OAUTH", "FAIL_OAUTH", "ERROR", "EXIT", "HANDOFF", "SELECT_ACCOUNT", "SELECT_INSTITUTION", "SUBMIT_CREDENTIALS", "SUBMIT_MFA", "TRANSITION_VIEW"];
const views = ["CONNECTED", "CONSENT", "CREDENTIAL", "ERROR", "EXIT", "LOADING", "MFA", "OAUTH", "SELECT_ACCOUNT", "SELECT_INSTITUTION", "DATA_TRANSPARENCY", "DATA_TRANSPARENCY_CONSENT", "SUBMIT_PHONE"];
const errors = ["INVALID_CREDENTIALS", "ITEM_LOGIN_REQUIRED", "INVALID_LINK_TOKEN", "INSTITUTION_DOWN", "INSTITUTION_NOT_RESPONDING", "INSTITUTION_NOT_AVAILABLE", "OAUTH_STATE_ID_ALREADY_PROCESSED", "INCORRECT_OAUTH_NONCE", "INVALID_RESULT"];
const allowed = (values: string[], value: unknown) => typeof value === "string" && values.includes(value) ? value : value ? "OTHER" : null;

/** Local Metro diagnostics only; never transmit or retain raw provider metadata. */
export function tracePlaidDevelopmentEvent(event: LinkEvent): void {
  if (!__DEV__) return;
  const metadata = event.metadata ?? {};
  console.info("[Plaid development]", {
    eventName: allowed(events, event.eventName),
    viewName: allowed(views, metadata.viewName),
    errorCode: allowed(errors, metadata.errorCode),
    hasError: Boolean(metadata.errorCode || metadata.errorType),
  });
}
