"use client";

import { createHouseholdSchema } from "@worthlane/contracts";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Icon, WorthlaneMark } from "../../../components/icons";

function payloadMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

export default function HouseholdSetupPage() {
  const router = useRouter();
  const [householdName, setHouseholdName] = useState("Our household");
  const [displayName, setDisplayName] = useState("");
  const [income, setIncome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedIncome = income.trim().replace(/[$,\s]/g, "");
    const incomeBasisMinor = normalizedIncome ? Math.round(Number(normalizedIncome) * 100) : undefined;
    const parsed = createHouseholdSchema.safeParse({
      name: householdName,
      displayName,
      timezone,
      currency: "USD",
      ...(incomeBasisMinor === undefined ? {} : { incomeBasisMinor }),
    });
    if (!parsed.success) {
      setError("Enter your name, a household name, and an optional positive monthly income.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/household/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payloadMessage(payload, "The household could not be created."));
      router.replace("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The household could not be created.");
      setIsSaving(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Worthlane household setup">
        <div className="login-brand"><span><WorthlaneMark /></span><strong>worthlane</strong></div>
        <div className="login-story__copy">
          <p className="section-kicker">Start personal, invite intentionally</p>
          <h1>Create your planning household.</h1>
          <p>You become the owner. Your partner joins later through their own Worthlane login and explicit acceptance.</p>
        </div>
        <p className="login-story__foot"><Icon name="lock" /> No account detail is shared by default.</p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading"><p className="section-kicker">Household setup</p><h2>Name the plan</h2><p>You can update responsibilities, privacy, and goals after setup.</p></div>
          <form className="login-form" onSubmit={submit}>
            <label><span>Your display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="Tyler" required autoFocus /></label>
            <label><span>Household name</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} maxLength={100} required /></label>
            <label><span>Monthly income <small>optional, for proportional goals</small></span><input value={income} onChange={(event) => setIncome(event.target.value)} inputMode="decimal" placeholder="6000.00" /></label>
            <div className="login-form__meta"><span>{timezone}</span><span>USD</span></div>
            <div className="login-error" role="alert">{error ? <><Icon name="lock" />{error}</> : null}</div>
            <button className="button button--primary button--wide" type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Create household"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
