const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: /^\.next-http-\d+$/.test(process.env.WORTHLANE_HTTP_DIST_DIR ?? "") ? process.env.WORTHLANE_HTTP_DIST_DIR : ".next",
  // API-only; no pages needed beyond API routes.
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
};

module.exports = withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
});
