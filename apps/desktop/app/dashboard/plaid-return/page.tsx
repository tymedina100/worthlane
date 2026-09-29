"use client";
import { sessionFetch } from "@/src/lib/session-fetch";

import { PlaidLinkButton } from "../../../components/plaid-link-button";
import { WorthlaneMark } from "../../../components/icons";
import type { ManagePlaid } from "../../../src/lib/workspace-data";

const manage: ManagePlaid = async ({ path, body }) => {
  const response = await sessionFetch(`/api/plaid${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}), cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : payload.error?.message ?? "Bank connection could not continue. Return to Accounts and start again.");
  return payload.data;
};

export default function PlaidReturnPage() {
  return <main className="oauth-return"><section className="oauth-return__card" aria-labelledby="oauth-title">
    <div className="oauth-return__mark" aria-hidden="true"><WorthlaneMark /></div>
    <h1 id="oauth-title">Finish connecting your bank</h1>
    <p>Complete your bank’s permission flow, then review which accounts you want to share.</p>
    <PlaidLinkButton onManage={manage} resume />
    <p><a href="/dashboard/accounts">Return to Accounts</a></p>
  </section></main>;
}
