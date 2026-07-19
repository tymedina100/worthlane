"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const nativeRoot = path.join(__dirname, "..");

test("the packaged archive includes every native runtime asset", () => {
  const builderConfig = fs.readFileSync(
    path.join(nativeRoot, "electron-builder.yml"),
    "utf8"
  );
  const requiredAssets = [
    "package.json",
    "src/main.cjs",
    "src/navigation.cjs",
    "src/security.cjs",
    "src/offline.html",
    "src/offline.js",
    "generated/app-config.json",
  ];

  for (const asset of requiredAssets) {
    assert.match(builderConfig, new RegExp(`- ${asset.replaceAll(".", "\\.")}(?:\\r?\\n|$)`));
  }
});

test("native packaging stays opt-in to root Turbo dev and build", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(nativeRoot, "package.json"), "utf8")
  );

  assert.equal(packageJson.scripts.dev, undefined);
  assert.equal(packageJson.scripts.build, undefined);
  assert.equal(packageJson.scripts["native:dev"], "node scripts/dev.mjs");
});

test("root native commands work when pnpm is provided only by Corepack", () => {
  const rootPackageJson = JSON.parse(
    fs.readFileSync(path.join(nativeRoot, "..", "..", "package.json"), "utf8")
  );

  for (const command of ["dev", "pack:local", "dist", "verify"]) {
    assert.match(
      rootPackageJson.scripts[`desktop:native:${command}`],
      /^corepack pnpm --filter @worthlane\/desktop-native /
    );
  }
});
