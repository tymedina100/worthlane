/** @type {import('next').NextConfig} */
const nextConfig = {
  // API-only — no pages needed beyond API routes
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
};

module.exports = nextConfig;
