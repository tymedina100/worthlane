import { defineConfig } from "vitest/config";
import path from "node:path";

// Fail before importing application code. Never run integration writes against
// the normal DATABASE_URL or a remotely hosted database.
const url = new URL(process.env.WORTHLANE_TEST_DATABASE_URL ?? "http://invalid");
if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
    url.pathname !== "/worthlane_beta_test" || !url.port) {
  throw new Error("Integration tests require an explicit local worthlane_beta_test database URL");
}
process.env.DATABASE_URL = url.toString();
process.env.JWT_SECRET = "integration-only-access-secret-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "integration-only-refresh-secret-at-least-32-characters";
process.env.POSTHOG_PROJECT_KEY = "";
process.env.SENTRY_DSN = "";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
