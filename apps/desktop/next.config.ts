import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

// This app relies on Next's inline bootstrap code. Development additionally
// needs eval and local WebSockets for React refresh. Plaid's sources match the
// allowlist in its Link Web CSP guidance; no other third-party origin is
// permitted to execute code, open a frame, or receive browser requests.
const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDevelopment ? "'unsafe-eval'" : "",
    "https://cdn.plaid.com/link/v2/stable/link-initialize.js",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://production.plaid.com",
    "https://sandbox.plaid.com",
    ...(isDevelopment
      ? ["ws://127.0.0.1:*", "ws://localhost:*"]
      : []),
  ].join(" "),
  "frame-src https://cdn.plaid.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Worthlane-Desktop", value: "1" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@worthlane/contracts"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
