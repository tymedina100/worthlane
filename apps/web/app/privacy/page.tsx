import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Worthlane",
  description: "Worthlane privacy policy. Learn how we collect, use, and protect your data.",
};

const EFFECTIVE_DATE = "March 18, 2026";
const CONTACT_EMAIL = "support@getvantage.app";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">Worthlane</Link>
          <Link href="/support" className="text-sm text-muted hover:text-text transition-colors">Support</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-muted mb-12">Effective date: {EFFECTIVE_DATE}</p>

        <div className="space-y-10 text-muted leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">1. Overview</h2>
            <p>
              Worthlane (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a personal finance application that helps users
              track spending, manage budgets, and build better financial habits. This Privacy Policy
              describes how we collect, use, and protect your information when you use the Worthlane
              mobile application and related services.
            </p>
            <p className="mt-3">
              By using Worthlane, you agree to the collection and use of information in accordance
              with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold text-text mb-2">Account information</h3>
            <p>When you register, we collect your email address and a hashed version of your password. We never store your password in plain text.</p>

            <h3 className="font-semibold text-text mt-5 mb-2">Financial data via Plaid</h3>
            <p>
              Worthlane uses Plaid Technologies, Inc. to connect to your financial institutions.
              When you link a bank account, Plaid retrieves your account balances and transaction
              history on your behalf. We store this data to power your dashboard, budgets, and
              insights. Your bank credentials are never shared with or stored by Worthlane —
              they are handled entirely by Plaid.
            </p>
            <p className="mt-3">
              For more information on how Plaid handles your data, see{" "}
              <a href="https://plaid.com/legal/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Plaid&apos;s Privacy Policy
              </a>.
            </p>

            <h3 className="font-semibold text-text mt-5 mb-2">Device and usage data</h3>
            <p>
              We may collect basic device information (device type, OS version) and usage patterns
              (screens visited, features used) to improve the app. This data is aggregated and
              not linked to your personal identity.
            </p>

            <h3 className="font-semibold text-text mt-5 mb-2">Push notification token</h3>
            <p>
              If you enable push notifications, we store your device&apos;s push notification token
              to send you budget alerts, streak reminders, and nudges. You can disable
              notifications at any time from the app&apos;s Profile screen or your device settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To provide and operate the Worthlane app and its features</li>
              <li>To sync and display your bank account balances and transactions</li>
              <li>To calculate your budgets, goals, and financial insights</li>
              <li>To send push notifications you&apos;ve opted into</li>
              <li>To power the AI financial assistant with your anonymized financial context</li>
              <li>To improve the app through aggregated usage analytics</li>
              <li>To respond to support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">4. Data Sharing</h2>
            <p>
              We do not sell your personal data to third parties. We share your data only with:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li><span className="text-text font-medium">Plaid</span> — to connect and retrieve data from your financial institutions</li>
              <li><span className="text-text font-medium">Anthropic</span> — to power the AI chat feature; messages are processed but not stored by Anthropic for training without consent</li>
              <li><span className="text-text font-medium">Expo / FCM / APNs</span> — to deliver push notifications to your device</li>
            </ul>
            <p className="mt-3">
              All third-party services we use are contractually required to protect your data and
              may not use it for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">5. Data Security</h2>
            <p>
              We take security seriously. Financial access tokens from Plaid are encrypted at
              rest using AES-256-GCM before being stored in our database. All data is transmitted
              over HTTPS/TLS. Authentication uses short-lived JWT access tokens (15 minutes)
              with secure refresh tokens (30 days) stored in your device&apos;s secure enclave.
            </p>
            <p className="mt-3">
              No method of transmission over the internet or electronic storage is 100% secure.
              While we strive to use commercially acceptable means to protect your data, we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your
              account, we will delete your personal data and financial data within 30 days,
              except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Disconnect your bank accounts at any time from the app</li>
              <li>Opt out of push notifications at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">8. Children&apos;s Privacy</h2>
            <p>
              Worthlane is not intended for users under the age of 13. We do not knowingly collect
              personal information from children under 13. If you believe we have inadvertently
              collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by updating the effective date at the top of this page and,
              where appropriate, by sending a push notification or email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-3">
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-dim">
          <Link href="/" className="font-bold text-primary text-base">Worthlane</Link>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-muted transition-colors">Home</Link>
            <Link href="/support" className="hover:text-muted transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
