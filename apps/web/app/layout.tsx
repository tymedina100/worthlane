import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://worthlane.app"),
  title: { default: "Worthlane — Make room for life together", template: "%s | Worthlane" },
  description: "Couples-first money planning with separate logins, clear budget responsibilities, and privacy by choice. Worthlane beta is in development.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Worthlane", url: "/", title: "Worthlane — Make room for life together", description: "A shared plan for your next chapter. Couples-first, solo-friendly money planning.", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Worthlane — Make room for life together" }] },
  twitter: { card: "summary_large_image", title: "Worthlane — Make room for life together", description: "A shared plan for your next chapter. Couples-first, solo-friendly money planning.", images: ["/opengraph-image"] },
  category: "finance",
};

const structuredData = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Worthlane", applicationCategory: "FinanceApplication", operatingSystem: "iOS", description: "A forthcoming iPhone personal-finance app for manual account tracking, budgets, goals, streaks, and clearer daily money decisions." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><Analytics /><SpeedInsights /></body></html>;
}
