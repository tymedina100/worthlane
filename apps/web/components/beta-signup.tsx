"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";

export function BetaSignup() {
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("saving"); setMessage("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const result = await fetch("/api/beta", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ email: data.get("email"), consent: data.get("consent") === "yes", website: data.get("website") }),
      });
      const response = await result.json();
      if (!result.ok) throw new Error(response.message);
      setMessage(response.message); setStatus("success"); form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.name !== "AbortError" && error.message !== "Failed to fetch"
        ? error.message : "We couldn’t confirm your signup. Please try again; duplicate signups are safe.");
    } finally { clearTimeout(timer); busy.current = false; }
  }
  return <div className="beta-signup">
    <div role="status" aria-live="polite" aria-atomic="true" className={status === "success" ? "signup-success" : ""}>
      {status === "success" && <><span aria-hidden="true">✓</span><h3>A little closer to your next chapter.</h3><p>{message}</p><p className="fine-print">No account created. No bank details needed.</p></>}
    </div>
    {status !== "success" && <form onSubmit={submit} aria-label="Join the beta email list" aria-busy={status === "saving"}>
      <label className="email-label" htmlFor="beta-email">Your email address</label>
      <div className="signup-row"><input id="beta-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} aria-describedby="signup-privacy signup-error" readOnly={status === "saving"}/><button className="button" type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Join the beta list"}<span aria-hidden="true">↗</span></button></div>
      <div className="signup-trap" aria-hidden="true"><label htmlFor="beta-website">Leave this empty</label><input id="beta-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="signup-consent"><input type="checkbox" name="consent" value="yes" required disabled={status === "saving"}/><span>Email me about Worthlane beta invitations and availability. I can leave the list anytime.</span></label>
      <p id="signup-privacy" className="fine-print">Just beta updates. No bank details. See our <Link href="/privacy#beta-list">privacy policy</Link>. Joining the list doesn’t guarantee access.</p>
      <p id="signup-error" role="alert" className="signup-error">{status === "error" ? message : ""}</p>
    </form>}
  </div>;
}
