"use client";

import { useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { SESSION_EPOCH_KEY } from "@/src/lib/session-fetch";

export function SessionBoundary({ children }: { children: ReactNode }) {
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_EPOCH_KEY && event.key !== null) return;
      // Hide the previous identity's snapshot before navigation can be delayed.
      flushSync(() => setChanged(true));
      window.location.replace("/login");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  if (changed) return <main className="p-8" role="status">Your session changed in another window. Returning to sign in…</main>;
  return children;
}
