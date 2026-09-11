"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const nativeRoot = path.join(__dirname, "..");

test("the Windows icon is a square PNG large enough for executable resources", () => {
  const config = fs.readFileSync(path.join(nativeRoot, "electron-builder.yml"), "utf8");
  const icon = config.match(/^  icon: (.+)$/m)?.[1];
  assert.ok(icon, "Windows icon must be configured");
  const png = fs.readFileSync(path.resolve(nativeRoot, icon.trim()));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.equal(width, height);
  assert.ok(width >= 256, `Windows requires at least256px; got${width}`);
});

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
