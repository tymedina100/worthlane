"use client";

import { useState } from "react";
import Link from "next/link";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/placeholder";

const features = [
  {
    icon: "🏦",
    title: "Real bank sync",
    description:
      "Connect all your accounts in seconds via Plaid. Your balances and transactions update automatically — no manual entry.",
  },
  {
    icon: "🧠",
    title: "Loss-aversion budgets",
    description:
      "We don't show you what you've spent. We show you what you're about to lose. Behavioral science proves this works better.",
  },
  {
    icon: "✨",
    title: "AI financial assistant",
    description:
      "Ask Worthlane anything about your money. Get personalized, plain-English answers grounded in your actual spending data.",
  },
  {
    icon: "🔥",
    title: "Streak system",
    description:
      "Build daily check-in streaks, on-budget streaks, and no-impulse streaks. Momentum is the most underrated financial tool.",
  },
];

const steps = [
  {
    number: "01",
    title: "Connect your bank",
    description: "Securely link your accounts in under a minute. We use bank-level encryption and never store your credentials.",
  },
  {
    number: "02",
    title: "Set your budgets",
    description: "Create budgets by category. Worthlane tracks them in real time and nudges you before you overspend — not after.",
  },
  {
    number: "03",
    title: "Build better habits",
    description: "Daily check-ins, streak rewards, and nudges keep you engaged. Small habits compound into big financial wins.",
  },
];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Worthlane</span>
          <div className="flex items-center gap-6 text-sm text-muted">
            <Link href="#features" className="hover:text-text transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-text transition-colors">How it works</Link>
            <Link href="/support" className="hover:text-text transition-colors">Support</Link>
            <a
              href={TESTFLIGHT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-bg px-4 py-1.5 rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              Join Beta
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-dim text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Now in beta — limited spots available
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          Finance that{" "}
          <span className="text-primary">fights for you</span>
        </h1>

        <p className="text-xl text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
          Worthlane connects to your bank, tracks your spending in real time, and uses
          behavioral science to help you actually save — not just feel good about trying.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-primary text-bg px-8 py-3.5 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Download on TestFlight
          </a>
          <Link
            href="#waitlist"
            className="w-full sm:w-auto border border-border text-text px-8 py-3.5 rounded-xl font-semibold text-lg hover:border-primary/50 transition-colors text-center"
          >
            Join the waitlist
          </Link>
        </div>

        <p className="text-sm text-dim">iOS only · Free during beta</p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">Built different</h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Most finance apps show you what happened. Worthlane changes what&apos;s about to happen.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-surface border border-border rounded-2xl p-7 hover:border-primary/30 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-surface border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Up and running in 3 minutes</h2>
            <p className="text-muted text-lg">No spreadsheets. No manual entry. Just connect and go.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.number} className="text-center">
                <div className="text-4xl font-bold text-primary/30 mb-4">{s.number}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-muted leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Get early access</h2>
        <p className="text-muted text-lg mb-10 max-w-lg mx-auto">
          Beta spots are limited. Drop your email and we&apos;ll send you an invite when a spot opens up.
        </p>

        {status === "success" ? (
          <div className="bg-primary-dim border border-primary/30 text-primary rounded-xl px-8 py-5 inline-block font-medium">
            You&apos;re on the list! We&apos;ll be in touch soon. 🎉
          </div>
        ) : (
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 bg-surface border border-border rounded-xl px-5 py-3.5 text-text placeholder-dim focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-primary text-bg px-7 py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-60 whitespace-nowrap"
            >
              {status === "loading" ? "Joining…" : "Join waitlist"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-danger text-sm mt-3">Something went wrong. Try again.</p>
        )}

        <p className="text-dim text-sm mt-5">No spam. Unsubscribe anytime.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-dim">
          <span className="font-bold text-primary text-base">Worthlane</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-muted transition-colors">Privacy Policy</Link>
            <Link href="/support" className="hover:text-muted transition-colors">Support</Link>
            <a href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer" className="hover:text-muted transition-colors">TestFlight</a>
          </div>
          <span>© {new Date().getFullYear()} Worthlane. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
