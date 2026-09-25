"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagePlaid } from "../src/lib/workspace-data";

type LinkHandler = { open(): void; destroy(): void };
type LinkSdk = { create(options: {
  token: string;
  receivedRedirectUri?: string;
  onSuccess(token: string | null, metadata: { institution?: { name?: string } | null }): void;
  onEvent(eventName: string): void;
  onExit(error: { display_message?: string | null } | null): void;
}): LinkHandler };

let sdkPromise: Promise<LinkSdk> | undefined;
function loadSdk() {
  return sdkPromise ??= new Promise<LinkSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    const fail = () => { script.remove(); sdkPromise = undefined; reject(new Error("Bank linking could not load. Try again or add a manual account.")); };
    const timeout = window.setTimeout(fail, 20_000);
    script.onerror = () => { clearTimeout(timeout); fail(); };
    script.onload = () => {
      clearTimeout(timeout);
      const sdk = (window as unknown as { Plaid?: LinkSdk }).Plaid;
      if (sdk) resolve(sdk); else fail();
    };
    document.head.appendChild(script);
  });
}

const OAUTH_STORAGE_KEY = "worthlane.plaid.oauth.v1";
type PendingLink = { linkToken: string; oauthSession: string; itemId?: string; includeLiabilities: boolean; expiresAt: number };

export function PlaidLinkButton({ onManage, itemId, includeLiabilities = false, resume = false, purpose = "banking" }: { onManage: ManagePlaid; itemId?: string; includeLiabilities?: boolean; resume?: boolean; purpose?: "banking" | "investments" }) {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const handler = useRef<LinkHandler | null>(null);
  const mounted = useRef(true);
  const attempt = useRef(0);
  const active = useRef(false);
  const loadingTimer = useRef<number | null>(null);
  function clearLoadingTimer() {
    if (loadingTimer.current !== null) window.clearTimeout(loadingTimer.current);
    loadingTimer.current = null;
  }
  function finish(text: string) {
    try { window.sessionStorage.removeItem(OAUTH_STORAGE_KEY); } catch {}
    attempt.current++;
    active.current = false;
    clearLoadingTimer();
    const previous = handler.current;
    handler.current = null;
    previous?.destroy();
    if (mounted.current) { setBusy(false); setSaving(false); setMessage(text); }
  }
  useEffect(() => {
    mounted.current = true;
    if (resume) void connect(true);
    return () => { mounted.current = false; attempt.current++; active.current = false; clearLoadingTimer(); handler.current?.destroy(); handler.current = null; };
  }, []);

  async function connect(resuming = false) {
    if (active.current) return;
    active.current = true;
    const started = ++attempt.current;
    const current = () => mounted.current && started === attempt.current;
    let completed = false;
    setBusy(true); setSaving(false); setMessage("");
    loadingTimer.current = window.setTimeout(() => {
      if (current()) finish("Bank linking did not open. Try again, use another browser, or add a manual account.");
    }, 30_000);
    try {
      let pending: PendingLink;
      let receivedRedirectUri: string | undefined;
      if (resuming) {
        const saved = JSON.parse(window.sessionStorage.getItem(OAUTH_STORAGE_KEY) ?? "null");
        const url = new URL(window.location.href);
        if (!saved || typeof saved.linkToken !== "string" || typeof saved.oauthSession !== "string" ||
            typeof saved.expiresAt !== "number" || saved.expiresAt <= Date.now() ||
            typeof saved.includeLiabilities !== "boolean" || (saved.itemId !== undefined && typeof saved.itemId !== "string") ||
            !url.searchParams.get("oauth_state_id")) {
          throw new Error("This bank-link session expired or is missing. Start again from Accounts.");
        }
        pending = saved;
        await onManage({ path: "/oauth-session", body: { oauthSession: pending.oauthSession } });
        receivedRedirectUri = window.location.href;
      } else {
      const { linkToken, oauthSession } = await onManage<{ linkToken: string; oauthSession: string }>({ path: "/link-token", body: { platform: "web", purpose, mode: itemId ? "update" : "create", ...(itemId ? { plaidItemId: itemId } : {}), ...(includeLiabilities ? { includeLiabilities: true } : {}) } });
      if (!linkToken || !oauthSession) throw new Error("Bank linking could not start. Please try again.");
      pending = { linkToken, oauthSession, itemId, includeLiabilities, expiresAt: Date.now() + 30 * 60 * 1000 };
      if (!current()) return;
      window.sessionStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(pending));
      }
      if (!current()) return;
      const sdk = await loadSdk();
      if (!current()) return;
      handler.current?.destroy();
      handler.current = sdk.create({
        token: pending.linkToken,
        ...(receivedRedirectUri ? { receivedRedirectUri } : {}),
        // OPEN is a stable, real-time event. Once Link is visible, let the
        // person complete consent at their own pace instead of timing it out.
        onEvent: event => { if (current() && event === "OPEN") clearLoadingTimer(); },
        onSuccess: (publicToken, metadata) => {
          if (!current() || completed) return;
          completed = true;
          clearLoadingTimer(); setSaving(true);
          void (async () => {
            try {
              // Recheck the originating login before attaching any returned bank data.
              await onManage({ path: "/oauth-session", body: { oauthSession: pending.oauthSession } });
              if (pending.itemId) {
                await onManage({ path: "/sync", body: { plaidItemId: pending.itemId, oauthSession: pending.oauthSession, refresh: !pending.includeLiabilities } });
              } else {
                if (!publicToken) throw new Error("Bank linking did not return a token. Please try again.");
                await onManage({ path: "/exchange", body: { publicToken, oauthSession: pending.oauthSession, ...(metadata.institution?.name ? { institutionName: metadata.institution.name } : {}) } });
              }
              if (current()) finish(pending.includeLiabilities ? "Link completed. Use Check debt details to retrieve available data. Your saved plans have not changed." : "Connection saved. Review account freshness and choose what to share.");
            } catch (error) {
              if (current()) finish(error instanceof Error ? error.message : "Connection could not be saved. Please try again.");
            }
          })();
        },
        onExit: error => {
          if (current() && !completed) finish(error?.display_message ?? "Bank linking closed. You can retry or use a manual account.");
        },
      });
      handler.current.open();
    } catch (error) {
      if (current()) finish(error instanceof Error ? error.message : "Bank linking is unavailable. Use a manual account or try again.");
    }
  }
  return <div>
    <button className="button button--secondary" type="button" disabled={busy} onClick={() => void connect(resume)}>{busy ? saving ? "Saving connection…" : "Connecting…" : resume ? "Resume bank connection" : includeLiabilities ? "Review debt-data consent" : itemId ? "Reconnect" : purpose === "investments" ? "Connect investments" : "Connect bank"}</button>
    {busy && !saving ? <button className="button button--secondary" type="button" onClick={() => finish("Bank linking cancelled. You can retry or add a manual account.")}>Cancel bank linking</button> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
