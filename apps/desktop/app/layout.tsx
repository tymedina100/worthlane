import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Worthlane — Household money, clearly shared",
    template: "%s · Worthlane",
  },
  description:
    "A private household workspace for shared plans, responsibilities, accounts, and goals.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f6f1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
