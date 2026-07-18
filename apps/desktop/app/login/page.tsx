"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Icon, WorthlaneMark } from "../../components/icons";

function loginError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(loginError(payload, "That email and password didn’t match."));
      }
      router.replace("/invitations");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t sign you in right now.");
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
          <p className="section-kicker">Money, made mutual</p>
          <h1>Plan a life together without giving up what’s yours.</h1>
          <p>
            Share the plan, keep personal detail personal, and see the goals you’re moving toward side by side.
          </p>
        </div>

        <div className="login-preview" aria-hidden="true">
          <div className="login-preview__header">
            <span>Household view</span>
            <i><Icon name="shield" /> Privacy on</i>
          </div>
          <div className="login-preview__metric">
            <span>Visible net worth</span>
            <strong>$84,998.38</strong>
            <small>Tyler + shared household view</small>
          </div>
          <div className="login-preview__goal">
            <span><Icon name="spark" /></span>
            <div>
              <strong>Universal Orlando</strong>
              <small>$3,215 of $7,000</small>
              <i><b /></i>
            </div>
            <em>46%</em>
          </div>
          <div className="login-preview__people">
            <span>TY</span><span>RA</span><small>Planning together</small>
          </div>
        </div>

        <p className="login-story__foot"><Icon name="lock" /> Separate logins. One synchronized household.</p>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading">
            <p className="section-kicker">Welcome back</p>
            <h2>Sign in to your household</h2>
            <p>Use your own Worthlane login. Your partner signs in separately.</p>
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
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>
            <div className="login-form__meta">
              <span>Private, encrypted session</span>
              <span>Secure household access</span>
            </div>
            <div className="login-error" role="alert" aria-live="polite">
              {error ? <><Icon name="lock" />{error}</> : null}
            </div>
            <button className="button button--primary button--wide" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting ? <Icon name="arrow" /> : null}
            </button>
          </form>

          <div className="demo-callout">
            <span><Icon name="spark" /></span>
            <div>
              <strong>Want to look around first?</strong>
              <p>Open a realistic Tyler and Rachel household—no login needed.</p>
            </div>
            <Link href="/demo">View demo <Icon name="arrow" /></Link>
          </div>

          <p className="login-privacy"><Icon name="shield" /> Worthlane never exposes account credentials or private account detail to your partner.</p>
        </div>
      </section>
    </main>
  );
}
