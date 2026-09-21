type Fetcher = typeof fetch;
type Locks = Pick<LockManager, "request">;
type Epoch = { read(): string; change(): void };
const LOCK = "worthlane-session";

/** HttpOnly cookies stay in the browser. Web Locks coordinate tabs AND windows. */
export function createSessionFetch(fetcher: Fetcher, locks: Locks, epoch: Epoch): Fetcher {
  return async (input, init) => {
    if (typeof input !== "string" || !input.startsWith("/api/")) {
      throw new Error("Session requests require a relative Worthlane API path");
    }
    if (input.startsWith("/api/auth/")) {
      return locks.request(LOCK, { mode: "exclusive" }, async () => {
        // Do not replay an old user's queued mutation after a new login/logout.
        if (["/api/auth/login", "/api/auth/register", "/api/auth/logout"].includes(input)) epoch.change();
        return fetcher(input, init);
      });
    }
    const started = epoch.read();
    const expired = () => new Response(JSON.stringify({ error: { message: "Session changed; please try again" } }), { status: 401 });
    const response = await locks.request(LOCK, { mode: "shared" }, () => {
      if (epoch.read() !== started) return expired();
      return fetcher(input, init);
    });
    if (response.status !== 401) return response;
    return locks.request(LOCK, { mode: "exclusive" }, async () => {
      if (epoch.read() !== started) return expired();
      if (init?.signal?.aborted) throw init.signal.reason;
      const session = await fetcher("/api/auth/session", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!session.ok) return session;
      // The original request was rejected before its mutation handler ran.
      return fetcher(input, init);
    });
  };
}

let client: Fetcher | undefined;
export const sessionFetch: Fetcher = (input, init) => {
  if (!client) {
    if (!navigator.locks) throw new Error("This browser does not support secure session coordination. Please use a current browser.");
    const key = "worthlane.session.epoch"; // Nonsecret coordination value only.
    client = createSessionFetch(fetch.bind(globalThis), navigator.locks, {
      read: () => localStorage.getItem(key) ?? "",
      change: () => localStorage.setItem(key, crypto.randomUUID()),
    });
  }
  return client(input, init);
};
