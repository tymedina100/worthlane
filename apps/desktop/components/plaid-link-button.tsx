"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagePlaid } from "../src/lib/workspace-data";

type LinkHandler = { open(): void; destroy(): void };
type LinkSdk = { create(options: {
  token: string;
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

export function PlaidLinkButton({ onManage, itemId, includeLiabilities = false }: { onManage: ManagePlaid; itemId?: string; includeLiabilities?: boolean }) {
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
    return () => { mounted.current = false; attempt.current++; active.current = false; clearLoadingTimer(); handler.current?.destroy(); handler.current = null; };
  }, []);

  async function connect() {
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
      const { linkToken } = await onManage<{ linkToken: string }>({ path: "/link-token", body: { platform: "web", mode: itemId ? "update" : "create", ...(itemId ? { plaidItemId: itemId } : {}), ...(includeLiabilities ? { includeLiabilities: true } : {}) } });
      if (!current()) return;
      const sdk = await loadSdk();
      if (!current()) return;
      handler.current?.destroy();
      handler.current = sdk.create({
        token: linkToken,
        // OPEN is a stable, real-time event. Once Link is visible, let the
        // person complete consent at their own pace instead of timing it out.
        onEvent: event => { if (current() && event === "OPEN") clearLoadingTimer(); },
        onSuccess: (publicToken, metadata) => {
          if (!current() || completed) return;
          completed = true;
          clearLoadingTimer(); setSaving(true);
          void (async () => {
            try {
              if (itemId) {
                await onManage({ path: "/sync", body: { plaidItemId: itemId, refresh: !includeLiabilities } });
              } else {
                if (!publicToken) throw new Error("Bank linking did not return a token. Please try again.");
                await onManage({ path: "/exchange", body: { publicToken, ...(metadata.institution?.name ? { institutionName: metadata.institution.name } : {}) } });
              }
              if (current()) finish(includeLiabilities ? "Link completed. Use Check debt details to retrieve available data. Your saved plans have not changed." : "Connection saved. Review account freshness and choose what to share.");
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
    <button className="button button--secondary" type="button" disabled={busy} onClick={() => void connect()}>{busy ? saving ? "Saving connection…" : "Connecting…" : includeLiabilities ? "Review debt-data consent" : itemId ? "Reconnect" : "Connect bank"}</button>
    {busy && !saving ? <button className="button button--secondary" type="button" onClick={() => finish("Bank linking cancelled. You can retry or add a manual account.")}>Cancel bank linking</button> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
