import type { Metadata } from "next";
import Link from "next/link";
import { LegalHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Support", alternates: { canonical: "/support" }, description: "Get help with Worthlane beta, household privacy, bank connections, and planning." };
const CONTACT_EMAIL = "support@worthlane.app";
const faqs = [
  ["How do I get Worthlane?", "The couples beta is in development. Email us with beta questions; availability and access will be explained before you join."],
  ["How do I start tracking my money?", "The beta supports manual accounts and transactions. Start with the balances you want to understand, then build a solo plan or invite a partner."],
  ["Can I connect my bank?", "Plaid is being tested in Sandbox for the beta. Live bank access is not offered through this website. Manual tracking is available in the beta."],
  ["Can I delete my account?", "Yes. Open Profile in the app and choose Delete account. This permanently removes your account and associated data."],
  ["What does the assistant do?", "The in-app assistant uses your Worthlane financial context to answer questions about spending, budgets, and goals. It cannot make transactions on your behalf."],
];

export default function SupportPage() {
  return <><LegalHeader /><main id="main" className="legal-page"><article className="site-container legal-copy"><p className="eyebrow">Worthlane support</p><h1>How can we help?</h1><p>For account or launch questions, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include your device model and app version, but never send passwords, bank credentials, account numbers, or invitation codes.</p><section><h2>Frequently asked questions</h2>{faqs.map(([question, answer]) => <details className="support-details" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section><section className="support-contact"><h2>Need a hand?</h2><p><a href={`mailto:${CONTACT_EMAIL}`}>Email Worthlane support</a> and we will help you find the right next step.</p></section></article></main><SiteFooter /></>;
}
