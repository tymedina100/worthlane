import Link from "next/link";
import { LegalHeader, SiteFooter } from "@/components/site-chrome";
export default function NotFound() {
  return <><LegalHeader /><main id="main" className="legal-page"><div className="site-container legal-copy"><p className="eyebrow">404 · A small detour</p><h1>Let’s find your way back.</h1><p>This page may have moved, or the address may be incomplete.</p><div className="hero-actions" style={{ marginTop: 28 }}><Link href="/" className="button">Back to Worthlane ↗</Link><Link href="/support" className="text-link">Get help</Link></div></div></main><SiteFooter /></>;
}
