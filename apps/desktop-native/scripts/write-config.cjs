"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseConfiguredUrl } = require("../src/security.cjs");

const allowLocal = process.argv.includes("--allow-local");
const rawUrl = process.env.WORTHLANE_DESKTOP_URL || (allowLocal ? "http://127.0.0.1:3003" : "");
const configured = parseConfiguredUrl(rawUrl, { allowLocal });
const outputDirectory = path.join(__dirname, "..", "generated");

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, "app-config.json"),
  `${JSON.stringify({ appUrl: configured.href, developmentOnly: allowLocal }, null, 2)}\n`,
  "utf8"
);
console.log(`Prepared native desktop configuration for ${configured.origin}.`);
