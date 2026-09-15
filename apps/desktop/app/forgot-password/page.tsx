"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Icon, WorthlaneMark } from "../../components/icons";

export default function PasswordRecoveryPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);

  function changeStep(next: typeof step) {
    setError(null);
    setStep(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (step === "reset" && password !== confirmation) {
      setError("Your passwords don’t match. Enter the same new password in both fields.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${step === "email" ? "forgot-password" : "reset-password"}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(step === "email" ? { email: email.trim() } : { token: token.trim().toUpperCase(), newPassword: password }),
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
        throw new Error(response.status === 429 ? "Too many attempts. Please wait before trying again." : typeof message === "string" ? message : "We couldn’t complete that request. Please try again.");
      }
      if (step === "email") {
        setRequested(true);
        changeStep("reset");
      } else {
        setToken(""); setPassword(""); setConfirmation("");
        changeStep("done");
      }
    } catch (caught) {
      setError(caught instanceof Error && caught.name !== "TimeoutError" ? caught.message : "The request took too long. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="login-page recovery-page">
      <section className="login-story" aria-label="Account recovery">
        <Link className="login-brand" href="/login" aria-label="Worthlane sign in"><span><WorthlaneMark /></span><strong>worthlane</strong></Link>
        <div className="login-story__copy">
          <p className="section-kicker">Your own way back in</p>
          <h1>Get back to the life you’re planning.</h1>
          <p>Reset your own login securely. Your partner keeps their separate password and access.</p>
        </div>
        <p className="login-story__foot"><Icon name="lock" /> Your code expires in one hour and works once.</p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading">
            <p className="section-kicker">Account recovery</p>
            <h2 ref={heading} tabIndex={-1}>{step === "email" ? "Forgot your password?" : step === "reset" ? "Choose a new password" : "Your password is updated"}</h2>
            <p>{step === "email" ? "Enter the email you use for Worthlane. We’ll send a reset code if an account exists." : step === "reset" ? (requested ? "If an account exists for that email, a code has been sent. Check your inbox and spam folder." : "Enter the code from your Worthlane email and choose a new password.") : "Sign in with your new password to return to your household."}</p>
          </div>
          {step !== "done" ? <form className="login-form" onSubmit={submit}>
            {step === "email" ? <label><span>Email address</span><input type="email" name="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label> : <>
              <label><span>Reset code</span><input type="text" name="token" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} required disabled={busy} /></label>
              <label><span>New password</span><input type="password" name="newPassword" autoComplete="new-password" minLength={8} aria-describedby="password-help" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} /></label>
              <p id="password-help">Use at least 8 characters.</p>
              <label><span>Confirm new password</span><input type="password" name="confirmation" autoComplete="new-password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy} /></label>
            </>}
            <div className="login-error" role="alert">{error}</div>
            <button className="button button--primary button--wide" type="submit" disabled={busy}>{busy ? "Please wait…" : step === "email" ? "Send reset code" : "Update password"}</button>
            <button className="button button--secondary button--wide" type="button" disabled={busy} onClick={() => changeStep(step === "email" ? "reset" : "email")}>{step === "email" ? "I already have a code" : "Request another code"}</button>
          </form> : null}
          <p className="login-privacy"><Link href="/login">Back to sign in</Link></p>
          <p className="login-privacy">Need help? <a href="mailto:support@worthlane.app">Contact Worthlane Support</a></p>
        </div>
      </section>
    </main>
  );
}
