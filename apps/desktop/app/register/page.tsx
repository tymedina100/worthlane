"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Icon, WorthlaneMark } from "../../components/icons";

function registerError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmation) {
      setError("Those passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          registerError(payload, "We could not create your account right now.")
        );
      }

      router.replace("/invitations");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We could not create your account right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Worthlane overview">
        <Link className="login-brand" href="/login" aria-label="Worthlane sign in">
          <span><WorthlaneMark /></span>
          <strong>worthlane</strong>
        </Link>

        <div className="login-story__copy">
          <p className="section-kicker">Start with your own login</p>
          <h1>Build a shared plan without giving up your privacy.</h1>
          <p>
            Create your personal Worthlane account first. You can start a household or join your partner after you sign in.
          </p>
        </div>

        <div className="login-preview" aria-hidden="true">
          <div className="login-preview__header">
            <span>Household view</span>
            <i><Icon name="shield" /> Privacy on</i>
          </div>
          <div className="login-preview__metric">
            <span>Your account</span>
            <strong>Private by default</strong>
            <small>You choose what becomes visible to your household</small>
          </div>
          <div className="login-preview__goal">
            <span><Icon name="spark" /></span>
            <div>
              <strong>Shared goals, separate access</strong>
              <small>Invite a partner when you are ready</small>
              <i><b /></i>
            </div>
            <em>Yours</em>
          </div>
          <div className="login-preview__people">
            <span>ME</span><small>One secure login to begin</small>
          </div>
        </div>

        <p className="login-story__foot"><Icon name="lock" /> Secure sessions. No passwords shared between partners.</p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading">
            <p className="section-kicker">New account</p>
            <h2>Create your Worthlane account</h2>
            <p>Use your own email and password. Your partner creates a separate login.</p>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                name="password-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Enter it again"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <div className="login-form__meta">
              <span>Private, encrypted session</span>
              <span>Minimum 8 characters</span>
            </div>
            <div className="login-error" role="alert" aria-live="polite">
              {error ? <><Icon name="lock" />{error}</> : null}
            </div>
            <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
              {!isSubmitting ? <Icon name="arrow" /> : null}
            </button>
            <Link className="button button--secondary button--wide" href="/login">
              Already have an account? Sign in
            </Link>
          </form>

          <p className="login-privacy"><Icon name="shield" /> Your account starts private. Household sharing is always explicit.</p>
        </div>
      </section>
    </main>
  );
}
