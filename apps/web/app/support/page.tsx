import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Worthlane",
  description: "Get help with Worthlane. Find answers to common questions or contact our support team.",
};

const CONTACT_EMAIL = "support@getvantage.app";
const TESTFLIGHT_URL = "https://testflight.apple.com/join/placeholder";

const faqs = [
  {
    q: "How do I connect my bank account?",
    a: "Go to the Profile tab and tap '+ Connect Bank Account'. You'll be guided through Plaid's secure bank connection flow. Most major US banks are supported including Chase, Bank of America, Wells Fargo, Schwab, and hundreds more.",
  },
  {
    q: "Is my banking information secure?",
    a: "Yes. Worthlane uses Plaid to connect to your bank — your bank credentials are never shared with or stored by us. Bank access tokens are encrypted at rest using AES-256-GCM. All data is transmitted over HTTPS.",
  },
  {
    q: "Why is Schwab (or another bank) showing an error?",
    a: "Some banks like Charles Schwab use an OAuth flow that requires redirecting to your bank's website. Make sure you're using the latest version of the app. If the issue persists, try disconnecting and reconnecting the account.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login screen, tap 'Forgot password?' and enter your email address. You'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.",
  },
  {
    q: "How do I delete my account?",
    a: "To delete your account and all associated data, email us at support@getvantage.app with the subject line 'Delete my account' from your registered email address. We'll process your request within 30 days.",
  },
  {
    q: "Why aren't my transactions updating?",
    a: "Go to Profile and tap 'Sync Accounts' to manually trigger a sync. If transactions are still missing, try disconnecting and reconnecting your bank account. Some institutions have a 1-2 day delay before transactions appear.",
  },
  {
    q: "How does the AI assistant work?",
    a: "The AI assistant uses your real financial data (balances, spending, budgets, goals) as context to answer questions about your money. It's powered by Claude and responds with plain, personalized advice. It cannot make transactions on your behalf.",
  },
  {
    q: "What is a streak?",
    a: "Streaks track consistent financial behavior. There are three types: Daily check-in (opening the app each day), On-budget (staying within your budgets), and No-impulse (avoiding flagged impulse purchases). Missing a day resets your streak to zero.",
  },
  {
    q: "How do I flag a transaction as an impulse purchase?",
    a: "On the Transactions tab, tap any transaction and toggle the 'Impulse' flag. This helps Worthlane track your impulse spending patterns and includes it in your no-impulse streak calculations.",
  },
  {
    q: "The app isn't working — how do I get help?",
    a: "Email us at support@getvantage.app with a description of the issue, your device model, and iOS version. Screenshots are always helpful. We typically respond within 24 hours.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">Worthlane</Link>
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-primary text-bg px-4 py-1.5 rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Join Beta
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3">Support</h1>
        <p className="text-muted text-lg mb-12">
          Find answers below or reach us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>

        {/* Contact card */}
        <div className="bg-surface border border-border rounded-2xl p-7 mb-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h2 className="font-semibold text-lg mb-1">Contact support</h2>
            <p className="text-muted text-sm">We typically respond within 24 hours.</p>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="bg-primary text-bg px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity whitespace-nowrap text-sm"
          >
            Email us
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="bg-surface border border-border rounded-2xl overflow-hidden group"
            >
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer select-none list-none font-semibold hover:text-primary transition-colors">
                {faq.q}
                <span className="text-muted group-open:rotate-180 transition-transform ml-4 flex-shrink-0">▾</span>
              </summary>
              <p className="px-6 pb-5 text-muted leading-relaxed border-t border-border pt-4">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

        {/* Still stuck */}
        <div className="mt-14 text-center bg-surface border border-border rounded-2xl p-10">
          <h2 className="text-xl font-bold mb-2">Still stuck?</h2>
          <p className="text-muted mb-6">
            Can&apos;t find what you&apos;re looking for? Drop us an email and we&apos;ll get back to you.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-block bg-primary text-bg px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Contact support
          </a>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-dim">
          <Link href="/" className="font-bold text-primary text-base">Worthlane</Link>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-muted transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-muted transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
