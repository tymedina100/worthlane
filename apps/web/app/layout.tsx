import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Worthlane — Finance that fights for you",
  description:
    "Worthlane is a psychology-driven personal finance app that connects to your bank, tracks your spending, and uses loss-aversion science to help you actually save.",
  keywords: ["personal finance", "budgeting", "bank sync", "savings", "spending tracker"],
  openGraph: {
    title: "Worthlane — Finance that fights for you",
    description:
      "Connect your bank, set budgets, and build streaks. Worthlane uses behavioral science to help you spend less and save more.",
    type: "website",
    siteName: "Worthlane",
  },
  twitter: {
    card: "summary_large_image",
    title: "Worthlane — Finance that fights for you",
    description: "Psychology-driven personal finance. Connect your bank and start winning.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
