/** The native Plaid SDK owns OAuth; its return URL is not an app page. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, "https://worthlane.app");
    const isWebReturn = url.protocol === "https:" && url.hostname === "worthlane.app" && url.pathname === "/plaid-oauth";
    const isSchemeReturn = url.protocol === "worthlane:" &&
      ((url.hostname === "plaid-oauth" && !url.pathname) || (!url.hostname && url.pathname === "/plaid-oauth"));
    if (isWebReturn || isSchemeReturn) return "/(tabs)/profile";
  } catch {
    // Leave unrelated or malformed links to the router's normal handling.
  }
  return path;
}
