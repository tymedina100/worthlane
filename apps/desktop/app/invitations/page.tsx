"use client";

import type { HouseholdPartnerInvitationSummary } from "@worthlane/contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, WorthlaneMark } from "../../components/icons";

type Envelope<T> = { data?: T; error?: { message?: string } | string };

function messageFrom(payload: Envelope<unknown> | null, fallback: string) {
  if (typeof payload?.error === "string") return payload.error;
  return payload?.error?.message ?? fallback;
}

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<HouseholdPartnerInvitationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/household/manage/invitations", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as Envelope<
          HouseholdPartnerInvitationSummary[]
        > | null;
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok || !Array.isArray(payload?.data)) {
          throw new Error(messageFrom(payload, "Partner invitations could not be loaded."));
        }
        if (!payload.data.length) {
          const summary = await fetch("/api/household/summary", {
            cache: "no-store",
            credentials: "same-origin",
          });
          router.replace(summary.status === 404 ? "/household/setup" : "/dashboard");
          return;
        }
        if (active) setInvitations(payload.data);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Partner invitations could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function accept(invitation: HouseholdPartnerInvitationSummary) {
    setAcceptingId(invitation.id);
    setError(null);
    try {
      const response = await fetch("/api/household/manage/invitations/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const payload = (await response.json().catch(() => null)) as Envelope<unknown> | null;
      if (!response.ok) {
        throw new Error(messageFrom(payload, "The invitation could not be accepted."));
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invitation could not be accepted.");
      setAcceptingId(null);
    }
  }

  async function useAnotherLogin() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Worthlane partner invitation">
        <div className="login-brand"><span><WorthlaneMark /></span><strong>worthlane</strong></div>
        <div className="login-story__copy">
          <p className="section-kicker">Separate logins, shared plan</p>
          <h1>You decide when a household becomes shared.</h1>
          <p>Review the invitation addressed to your login. Nothing is shared until you accept.</p>
        </div>
        <p className="login-story__foot"><Icon name="shield" /> Consent first. Permissions remain account-specific.</p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading">
            <p className="section-kicker">Partner invitation</p>
            <h2>Join a Worthlane household</h2>
            <p>Only invitations addressed to this authenticated login appear here.</p>
          </div>
          <div className="invitation-list" aria-live="polite">
            {isLoading ? <p>Checking for invitations...</p> : null}
            {invitations.map((invitation) => (
              <article key={invitation.id}>
                <div>
                  <strong>{invitation.householdName}</strong>
                  <p>Invited by {invitation.invitedByName}</p>
                  <small>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</small>
                </div>
                <button className="button button--primary" type="button" disabled={acceptingId === invitation.id} onClick={() => void accept(invitation)}>
                  {acceptingId === invitation.id ? "Accepting..." : "Accept invitation"}
                </button>
              </article>
            ))}
            {error ? <p className="form-feedback--error" role="alert">{error}</p> : null}
          </div>
          <button className="button button--secondary button--wide" type="button" onClick={() => void useAnotherLogin()}>Use a different login</button>
        </div>
      </section>
    </main>
  );
}
