"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const nativeRoot = path.join(__dirname, "..");
const positionalDirectory = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const appDirectory = positionalDirectory
  ? path.resolve(positionalDirectory)
  : path.join(nativeRoot, "release", "win-unpacked");
const productionRequired = process.argv.includes("--production");

function fail(message) {
  throw new Error(`Native package verification failed: ${message}`);
}

async function verifyPackage() {
  if (!process.versions.electron) {
    const electronExecutable = require("electron");
    const result = spawnSync(electronExecutable, [__filename, ...process.argv.slice(2)], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    return;
  }

  const executablePath = path.join(appDirectory, "Worthlane.exe");
  const asarPath = path.join(appDirectory, "resources", "app.asar");
  if (!fs.existsSync(executablePath)) fail(`missing executable at ${executablePath}`);
  if (!fs.existsSync(asarPath)) fail(`missing app.asar at ${asarPath}`);

  const requiredAssets = [
    "package.json",
    "generated/app-config.json",
    "src/main.cjs",
    "src/navigation.cjs",
    "src/offline.html",
    "src/offline.js",
    "src/security.cjs",
  ];
  for (const asset of requiredAssets) {
    if (!fs.existsSync(path.join(asarPath, asset))) fail(`app.asar is missing ${asset}`);
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(asarPath, "package.json"), "utf8")
  );
  if (packageJson.main !== "src/main.cjs") fail("package main is not src/main.cjs");

  const configuration = JSON.parse(
    fs.readFileSync(path.join(asarPath, "generated", "app-config.json"), "utf8")
  );
  if (typeof configuration.appUrl !== "string") fail("app URL is missing");
  if (productionRequired && configuration.developmentOnly !== false) {
    fail("production package is marked development-only");
  }

  const {
    FuseState,
    FuseV1Options,
    getCurrentFuseWire,
  } = require("@electron/fuses");
  const fuseWire = await getCurrentFuseWire(executablePath);
  const expectedFuses = new Map([
    [FuseV1Options.RunAsNode, FuseState.DISABLE],
    [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
    [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
    [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
    [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.DISABLE],
  ]);
  for (const [fuse, expectedState] of expectedFuses) {
    if (fuseWire[fuse] !== expectedState) {
      fail(`${FuseV1Options[fuse]} has an unexpected state`);
    }
  }

  console.log(
    `Verified Worthlane.exe, ${requiredAssets.length} archived assets, and ${expectedFuses.size} hardened fuses.`
  );
}

verifyPackage().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
