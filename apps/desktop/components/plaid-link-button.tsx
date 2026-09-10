"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagePlaid } from "../src/lib/workspace-data";

type LinkHandler = { open(): void; destroy(): void };
type LinkSdk = { create(options: {
  token: string;
  onSuccess(token: string | null, metadata: { institution?: { name?: string } | null }): void;
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
  const [message, setMessage] = useState("");
  const handler = useRef<LinkHandler | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; handler.current?.destroy(); }; }, []);

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const { linkToken } = await onManage<{ linkToken: string }>({ path: "/link-token", body: { platform: "web", mode: itemId ? "update" : "create", ...(itemId ? { plaidItemId: itemId } : {}), ...(includeLiabilities ? { includeLiabilities: true } : {}) } });
      const sdk = await loadSdk();
      if (!mounted.current) return;
      handler.current?.destroy();
      handler.current = sdk.create({
        token: linkToken,
        onSuccess: (publicToken, metadata) => {
          void (async () => {
            try {
              if (itemId) {
                await onManage({ path: "/sync", body: { plaidItemId: itemId, refresh: !includeLiabilities } });
              } else {
                if (!publicToken) throw new Error("Bank linking did not return a token. Please try again.");
                await onManage({ path: "/exchange", body: { publicToken, ...(metadata.institution?.name ? { institutionName: metadata.institution.name } : {}) } });
              }
              if (mounted.current) setMessage(includeLiabilities ? "Link completed. Use Check debt details to retrieve available data. Your saved plans have not changed." : "Connection saved. Review account freshness and choose what to share.");
            } catch (error) {
              if (mounted.current) setMessage(error instanceof Error ? error.message : "Connection could not be saved. Please try again.");
            } finally { if (mounted.current) setBusy(false); }
          })();
        },
        onExit: (error) => {
          if (mounted.current) { setBusy(false); setMessage(error?.display_message ?? "Bank linking closed. You can retry or use a manual account."); }
        },
      });
      handler.current.open();
    } catch (error) {
      if (mounted.current) { setBusy(false); setMessage(error instanceof Error ? error.message : "Bank linking is unavailable. Use a manual account or try again."); }
    }
  }
  return <div>
    <button className="button button--secondary" type="button" disabled={busy} onClick={() => void connect()}>{busy ? "Connecting…" : includeLiabilities ? "Review debt-data consent" : itemId ? "Reconnect" : "Connect bank"}</button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
