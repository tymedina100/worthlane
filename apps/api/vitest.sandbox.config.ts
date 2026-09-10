import { defineConfig } from "vitest/config";
import integration from "./vitest.integration.config";

if (process.env.PLAID_ENV !== "sandbox") throw new Error("Sandbox configuration required");
export default defineConfig({ ...integration, test: { ...integration.test, include: ["integration/*.sandbox.ts"], testTimeout: 60_000, hookTimeout: 30_000 } });
