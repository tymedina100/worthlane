import { describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { privateDiagnosticEvent } from "../diagnostic-privacy";

describe("server diagnostic privacy", () => {
  it("drops request/SDK/financial context and retains only application source positions", () => {
    const secret = "PRIVATE-CREDENTIAL-AND-FINANCIAL-DETAIL";
    const event = {
      event_id: "synthetic-event", timestamp: 100, release: "release-1", environment: "test",
      message: secret, user: { email: secret }, request: { url: secret, data: secret, cookies: secret },
      breadcrumbs: [{ message: secret }], extra: { axios: { headers: { Authorization: secret } } },
      contexts: { financial: { balance: secret } }, tags: { userId: secret }, transaction: secret,
      exception: { values: [{ type: secret, value: secret, stacktrace: { frames: [
        { filename: "/Users/private/src/lib/plaid.ts", lineno: 123, colno: 5, vars: { accessToken: secret }, context_line: secret },
        { filename: `https://bank.example/account?token=${secret}` },
        { filename: `/Users/${secret}/file.js` },
      ] } }] },
    } as ErrorEvent;
    const result = privateDiagnosticEvent(event);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(result.exception?.values?.[0]?.stacktrace?.frames).toEqual([
      { filename: "src/lib/plaid.ts", lineno: 123, colno: 5, in_app: true },
    ]);
    expect(result.event_id).toBe("synthetic-event");
    expect(event.message).toBe(secret);
  });

  it.each(["server", "edge"])("enforces scrubbing and disables traces in the %s SDK configuration", async runtime => {
    const init = vi.fn();
    vi.resetModules();
    vi.doMock("@sentry/nextjs", () => ({ init }));
    if (runtime === "server") await import("../../sentry.server.config");
    else await import("../../sentry.edge.config");
    const config = init.mock.calls[0][0];
    expect(config.sendDefaultPii).toBe(false);
    expect(config.tracesSampleRate).toBe(0);
    expect(config.beforeSendTransaction({ request: { data: "private" } })).toBeNull();
    expect(JSON.stringify(config.beforeSend({ message: "private", request: { data: "private" } }))).not.toContain("private");
    vi.doUnmock("@sentry/nextjs");
  });
});
