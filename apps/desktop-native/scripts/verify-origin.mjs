import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseConfiguredUrl } = require("../src/security.cjs");
const configured = parseConfiguredUrl(process.env.WORTHLANE_DESKTOP_URL || "");
const loginUrl = new URL("/login", configured.origin);

let response;
try {
  response = await fetch(loginUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
} catch (error) {
  throw new Error(
    `Could not reach the Worthlane desktop origin at ${configured.origin}.`,
    { cause: error }
  );
}

if (response.status < 200 || response.status >= 500) {
  throw new Error(`Worthlane desktop origin returned HTTP ${response.status}.`);
}
if (response.headers.get("x-worthlane-desktop") !== "1") {
  throw new Error(
    "WORTHLANE_DESKTOP_URL does not identify the Worthlane desktop UI/BFF."
  );
}

console.log(`Verified hosted Worthlane desktop origin at ${configured.origin}.`);
