"use strict";

const { spawnSync } = require("node:child_process");
const { macBuilderEnvironment } = require("./check-mac-signing.cjs");

const result = spawnSync(process.execPath, [
  require.resolve("electron-builder/cli.js"),
  "--mac", "dmg", "--arm64", "--x64", "--publish", "never",
  "-c.forceCodeSigning=true",
], { env: macBuilderEnvironment(process.env), stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
